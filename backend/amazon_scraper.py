"""
Amazon Product Scraper - Extract product data from Amazon.
Supports: products, prices, reviews, ratings, sellers, shipping info.
"""

import asyncio
import re
import logging
from typing import List, Dict, Any, Optional, Callable
from base_scraper import BaseScraper
from scraper_engine import ScraperEngine
from playwright.async_api import Page, TimeoutError as PlaywrightTimeoutError
from bs4 import BeautifulSoup
import json

logger = logging.getLogger(__name__)


class AmazonProductScraper(BaseScraper):
    """
    Comprehensive Amazon product scraper.
    
    Features:
    - Product search with multiple keywords
    - Price tracking (current, original, discount)
    - Reviews and ratings
    - Product specifications
    - Multiple images
    - Seller information
    - Availability and shipping
    - BSR (Best Sellers Rank)
    """
    
    def __init__(self, scraper_engine: ScraperEngine):
        super().__init__(scraper_engine)
        self.base_url = "https://www.amazon.com"
        
    @classmethod
    def get_name(cls) -> str:
        return "Amazon Product Scraper"
    
    @classmethod
    def get_description(cls) -> str:
        return "Extract products, prices, reviews, ratings, and seller info from Amazon search results and product pages"
    
    @classmethod
    def get_category(cls) -> str:
        return "E-commerce"
    
    @classmethod
    def get_icon(cls) -> str:
        return "📦"
    
    @classmethod
    def get_tags(cls) -> List[str]:
        return ["amazon", "ecommerce", "products", "prices", "reviews", "shopping"]
    
    def get_input_schema(self) -> Dict[str, Any]:
        return {
            "search_keywords": {
                "type": "array",
                "description": "List of product keywords to search (e.g., ['wireless headphones', 'laptop stand'])",
                "required": True
            },
            "max_results": {
                "type": "integer",
                "description": "Maximum number of products to scrape per keyword",
                "default": 50,
                "min": 1,
                "max": 200
            },
            "extract_reviews": {
                "type": "boolean",
                "description": "Extract review text from product pages",
                "default": False
            },
            "min_rating": {
                "type": "number",
                "description": "Minimum product rating (0-5)",
                "default": 0,
                "min": 0,
                "max": 5
            },
            "max_price": {
                "type": "number",
                "description": "Maximum price filter in USD (optional)",
                "default": None
            }
        }
    
    def get_output_schema(self) -> Dict[str, Any]:
        return {
            "asin": "string - Amazon Standard Identification Number",
            "title": "string - Product title",
            "url": "string - Product URL",
            "price": "number - Current price in USD",
            "originalPrice": "number - Original price before discount",
            "discount": "number - Discount percentage",
            "currency": "string - Currency code",
            "rating": "number - Average rating (0-5)",
            "reviewCount": "number - Total number of reviews",
            "availability": "string - Stock availability status",
            "prime": "boolean - Amazon Prime eligible",
            "images": "array - List of product image URLs",
            "description": "string - Product description",
            "features": "array - Key product features",
            "specifications": "object - Technical specifications",
            "seller": "string - Seller name",
            "shipsFrom": "string - Ships from location",
            "soldBy": "string - Sold by (Amazon or 3rd party)",
            "category": "string - Product category",
            "bestSellerRank": "string - Best Sellers Rank",
            "reviews": "array - Review texts (if extract_reviews=true)"
        }
    
    async def scrape(
        self, 
        config: Dict[str, Any], 
        progress_callback: Optional[Callable] = None
    ) -> List[Dict[str, Any]]:
        """Main scraping method for Amazon products."""
        
        search_keywords = config.get('search_keywords', [])
        max_results = int(config.get('max_results', 50))  # Convert to int
        extract_reviews = config.get('extract_reviews', False)
        min_rating = float(config.get('min_rating', 0))  # Convert to float
        max_price = config.get('max_price', None)
        if max_price is not None and max_price != 0:
            max_price = float(max_price)  # Convert to float
        else:
            max_price = None  # Treat 0 as no max price
        
        if not search_keywords:
            raise ValueError("search_keywords is required")
        
        all_products = []
        
        # Create browser context with anti-detection
        context = await self.engine.create_context(use_proxy=False)
        
        try:
            for keyword in search_keywords:
                await self._log_progress(
                    f"🔍 Searching Amazon for: {keyword}", 
                    progress_callback
                )
                
                # Search and get product links
                product_asins = await self._search_products(
                    context, 
                    keyword, 
                    max_results,
                    progress_callback
                )
                
                await self._log_progress(
                    f"✅ Found {len(product_asins)} products for '{keyword}'",
                    progress_callback
                )
                
                # Extract details in batches
                batch_size = 3  # Process 3 products at a time
                
                for i in range(0, len(product_asins), batch_size):
                    batch = product_asins[i:i+batch_size]
                    
                    progress = min(i + batch_size, len(product_asins))
                    await self._log_progress(
                        f"📊 Extracting details: {progress}/{len(product_asins)}",
                        progress_callback
                    )
                    
                    # Parallel extraction within batch
                    tasks = [
                        self._extract_product_details(
                            context,
                            asin,
                            extract_reviews
                        )
                        for asin in batch
                    ]
                    
                    batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    for result in batch_results:
                        if isinstance(result, dict):
                            # Apply filters
                            if min_rating > 0 and result.get('rating', 0) < min_rating:
                                continue
                            if max_price and result.get('price', float('inf')) > max_price:
                                continue
                            
                            result['searchKeyword'] = keyword
                            all_products.append(result)
                
                await self._log_progress(
                    f"✅ Completed scraping for '{keyword}': {len([p for p in all_products if p.get('searchKeyword') == keyword])} products",
                    progress_callback
                )
            
            await self._log_progress(
                f"🎉 Scraping complete! Total products: {len(all_products)}",
                progress_callback
            )
            
        finally:
            await context.close()
        
        return all_products
    
    async def _search_products(
        self,
        context,
        keyword: str,
        max_results: int,
        progress_callback: Optional[Callable] = None
    ) -> List[str]:
        """Search Amazon and extract product ASINs."""
        
        page = await context.new_page()
        asins = []
        
        try:
            # Build search URL
            search_url = f"{self.base_url}/s?k={keyword.replace(' ', '+')}"
            
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(2)
            
            # Scroll to load products
            for _ in range(3):
                await page.evaluate("window.scrollBy(0, window.innerHeight)")
                await asyncio.sleep(0.5)
            
            # Extract product ASINs from search results
            content = await page.content()
            soup = BeautifulSoup(content, 'html.parser')
            
            # Find product containers
            product_divs = soup.find_all('div', {'data-asin': True})
            
            for div in product_divs:
                asin = div.get('data-asin')
                if asin and asin.strip() and len(asin) == 10:  # Valid ASIN
                    if asin not in asins:
                        asins.append(asin)
                        if len(asins) >= max_results:
                            break
            
            # Try alternate selector if needed
            if len(asins) < 5:
                links = soup.find_all('a', href=re.compile(r'/dp/[A-Z0-9]{10}'))
                for link in links:
                    match = re.search(r'/dp/([A-Z0-9]{10})', link['href'])
                    if match:
                        asin = match.group(1)
                        if asin not in asins:
                            asins.append(asin)
                            if len(asins) >= max_results:
                                break
            
        except Exception as e:
            logger.error(f"Search error for '{keyword}': {e}")
        finally:
            await page.close()
        
        return asins[:max_results]
    
    async def _extract_product_details(
        self,
        context,
        asin: str,
        extract_reviews: bool = False
    ) -> Dict[str, Any]:
        """Extract detailed information from a product page."""
        
        page = await context.new_page()
        product_data = {
            'asin': asin,
            'url': f"{self.base_url}/dp/{asin}"
        }
        
        try:
            await page.goto(product_data['url'], wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(2)
            
            content = await page.content()
            soup = BeautifulSoup(content, 'html.parser')
            
            # Title
            title_elem = soup.find('span', {'id': 'productTitle'})
            if title_elem:
                product_data['title'] = title_elem.text.strip()
            
            # Price
            price_whole = soup.find('span', {'class': 'a-price-whole'})
            price_fraction = soup.find('span', {'class': 'a-price-fraction'})
            if price_whole:
                try:
                    price_str = price_whole.text.replace(',', '').strip('.')
                    if price_fraction:
                        price_str += '.' + price_fraction.text.strip()
                    product_data['price'] = float(price_str)
                    product_data['currency'] = 'USD'
                except:
                    pass
            
            # Original price / discount
            original_price = soup.find('span', {'class': 'a-price a-text-price'})
            if original_price:
                try:
                    orig_text = original_price.find('span', {'class': 'a-offscreen'})
                    if orig_text:
                        orig_price = float(orig_text.text.replace('$', '').replace(',', '').strip())
                        product_data['originalPrice'] = orig_price
                        if 'price' in product_data:
                            discount = ((orig_price - product_data['price']) / orig_price) * 100
                            product_data['discount'] = round(discount, 2)
                except:
                    pass
            
            # Rating
            rating_elem = soup.find('span', {'class': 'a-icon-alt'})
            if rating_elem:
                rating_text = rating_elem.text
                match = re.search(r'(\d+\.?\d*)\s*out of', rating_text)
                if match:
                    product_data['rating'] = float(match.group(1))
            
            # Review count
            review_elem = soup.find('span', {'id': 'acrCustomerReviewText'})
            if review_elem:
                review_text = review_elem.text
                match = re.search(r'([\d,]+)', review_text)
                if match:
                    product_data['reviewCount'] = int(match.group(1).replace(',', ''))
            
            # Availability
            avail_elem = soup.find('div', {'id': 'availability'})
            if avail_elem:
                product_data['availability'] = avail_elem.text.strip()
            
            # Prime eligible
            prime_elem = soup.find('i', {'class': 'a-icon-prime'})
            product_data['prime'] = prime_elem is not None
            
            # Images - Extract both product images and videos
            images = []
            videos = []
            
            # Try main product image first (high quality)
            main_image = soup.find('img', {'id': 'landingImage'})
            if main_image and main_image.get('src'):
                main_src = main_image.get('src', '')
                if 'amazon.com' in main_src:
                    # Get highest resolution
                    high_res = main_src.replace('._AC_SX355_', '._AC_SL1500_').replace('._AC_SY355_', '._AC_SL1500_')
                    images.append(high_res)
            
            # Get additional images from image block
            image_block = soup.find('div', {'id': 'altImages'})
            if image_block:
                img_tags = image_block.find_all('img')
                for img in img_tags:
                    src = img.get('src', '')
                    if src and 'amazon.com' in src and src not in images:
                        # Get high-res version
                        high_res = src.replace('_SS40_', '_SL1500_').replace('_US40_', '_SL1500_')
                        if high_res not in images:
                            images.append(high_res)
            
            # Extract video if present
            video_block = soup.find('div', {'id': 'ivVideoBlock'})
            if video_block:
                video_tags = video_block.find_all('video')
                for video in video_tags:
                    video_src = video.get('src', '')
                    if video_src:
                        videos.append(video_src)
            
            # Also check for video in image carousel
            video_scripts = soup.find_all('script', {'type': 'text/javascript'})
            for script in video_scripts:
                if script.string and '"videos"' in script.string:
                    # Try to extract video URL from JSON
                    try:
                        import json
                        match = re.search(r'"videos"\s*:\s*(\[.*?\])', script.string)
                        if match:
                            video_data = json.loads(match.group(1))
                            for vid in video_data:
                                if isinstance(vid, dict) and 'url' in vid:
                                    videos.append(vid['url'])
                    except:
                        pass
            
            product_data['images'] = images[:10]  # Limit to 10 images
            product_data['videos'] = videos[:3]  # Limit to 3 videos
            
            # Features
            features = []
            feature_div = soup.find('div', {'id': 'feature-bullets'})
            if feature_div:
                feature_items = feature_div.find_all('span', {'class': 'a-list-item'})
                for item in feature_items:
                    text = item.text.strip()
                    if text and len(text) > 10:
                        features.append(text)
            product_data['features'] = features
            
            # Description
            desc_elem = soup.find('div', {'id': 'productDescription'})
            if desc_elem:
                product_data['description'] = desc_elem.text.strip()[:500]  # Limit length
            
            # Seller info
            seller_elem = soup.find('a', {'id': 'sellerProfileTriggerId'})
            if seller_elem:
                product_data['seller'] = seller_elem.text.strip()
            
            # Sold by
            soldby_elem = soup.find('div', {'id': 'merchant-info'})
            if soldby_elem:
                product_data['soldBy'] = soldby_elem.text.strip()
            
            # Category
            breadcrumb = soup.find('div', {'id': 'wayfinding-breadcrumbs_feature_div'})
            if breadcrumb:
                categories = breadcrumb.find_all('a')
                if categories:
                    product_data['category'] = categories[-1].text.strip()
            
            # Best Sellers Rank
            rank_table = soup.find('table', {'id': 'productDetails_detailBullets_sections1'})
            if rank_table:
                rows = rank_table.find_all('tr')
                for row in rows:
                    th = row.find('th')
                    if th and 'Best Sellers Rank' in th.text:
                        td = row.find('td')
                        if td:
                            product_data['bestSellerRank'] = td.text.strip()[:200]
            
            # Extract reviews if requested
            if extract_reviews:
                reviews = await self._extract_reviews(page, asin)
                product_data['reviews'] = reviews
            
        except Exception as e:
            logger.error(f"Error extracting product {asin}: {e}")
            product_data['error'] = str(e)
        finally:
            await page.close()
        
        return product_data
    
    async def _extract_reviews(self, page: Page, asin: str) -> List[str]:
        """Extract review texts from product reviews page."""
        reviews = []
        
        try:
            # Navigate to reviews page
            reviews_url = f"{self.base_url}/product-reviews/{asin}"
            await page.goto(reviews_url, wait_until="domcontentloaded", timeout=20000)
            await asyncio.sleep(2)
            
            content = await page.content()
            soup = BeautifulSoup(content, 'html.parser')
            
            review_divs = soup.find_all('div', {'data-hook': 'review'})
            for div in review_divs[:10]:  # Limit to 10 reviews
                review_text = div.find('span', {'data-hook': 'review-body'})
                if review_text:
                    reviews.append(review_text.text.strip())
        
        except Exception as e:
            logger.error(f"Error extracting reviews for {asin}: {e}")
        
        return reviews
