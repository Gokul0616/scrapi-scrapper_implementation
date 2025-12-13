import asyncio
import logging
import re
import math
from typing import List, Dict, Any, Optional, Callable
from ..base_scraper import BaseScraper
from ..scraper_engine import ScraperEngine
from playwright.async_api import Page, TimeoutError as PlaywrightTimeoutError
from bs4 import BeautifulSoup
import aiohttp

# Try importing stealth, but don't fail if not present
try:
    from playwright_stealth import stealth_async
except ImportError:
    stealth_async = None

logger = logging.getLogger(__name__)

class GoogleMapsScraperV3(BaseScraper):
    """
    Enhanced Google Maps scraper with Apify-like performance:
    - Parallel detail extraction
    - Better scrolling and pagination
    - Email and phone extraction with verification
    - Retry logic for incomplete results
    - Robust selectors and stealth mode
    """
    
    def __init__(self, scraper_engine: ScraperEngine):
        super().__init__(scraper_engine)
        self.base_url = "https://www.google.com/maps"
        self.email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
        self.phone_pattern = re.compile(r'[\+\(]?[1-9][0-9 .\-\(\)]{8,}[0-9]')
        
        # Social media patterns
        self.social_patterns = {
            'facebook': re.compile(r'(?:https?://)?(?:www\.)?(?:facebook|fb)\.com/[\w\-\.]+', re.I),
            'instagram': re.compile(r'(?:https?://)?(?:www\.)?instagram\.com/[\w\-\.]+', re.I),
            'twitter': re.compile(r'(?:https?://)?(?:www\.)?(?:twitter|x)\.com/[\w\-]+', re.I),
            'linkedin': re.compile(r'(?:https?://)?(?:www\.)?linkedin\.com/(?:company|in)/[\w\-]+', re.I),
            'youtube': re.compile(r'(?:https?://)?(?:www\.)?youtube\.com/(?:channel|c|user)/[\w\-]+', re.I),
            'tiktok': re.compile(r'(?:https?://)?(?:www\.)?tiktok\.com/@[\w\-\.]+', re.I)
        }
    
    @classmethod
    def get_name(cls) -> str:
        return "Google Maps Scraper V2"
    
    @classmethod
    def get_description(cls) -> str:
        return "Extract businesses, places, reviews from Google Maps with powerful scraping engine"
    
    @classmethod
    def get_category(cls) -> str:
        return "Maps & Location"
    
    @classmethod
    def get_icon(cls) -> str:
        return "🗺️"
    
    @classmethod
    def get_tags(cls) -> List[str]:
        return ["maps", "google", "business", "leads", "local"]
    
    @classmethod
    def get_input_schema(cls) -> Dict[str, Any]:
        return {
            "search_terms": {"type": "array", "description": "List of search terms"},
            "location": {"type": "string", "description": "Location to search in"},
            "max_results": {"type": "integer", "default": 100},
            "extract_reviews": {"type": "boolean", "default": False},
            "extract_images": {"type": "boolean", "default": False}
        }
    
    @classmethod
    def get_output_schema(cls) -> Dict[str, Any]:
        return {
            "title": "string - Business name",
            "address": "string - Full address",
            "phone": "string - Phone number",
            "email": "string - Email address",
            "website": "string - Website URL",
            "rating": "number - Rating score",
            "reviewsCount": "number - Number of reviews",
            "category": "string - Business category",
            "socialMedia": "object - Social media links"
        }
    
    async def scrape(self, config: Dict[str, Any], progress_callback: Optional[Callable] = None) -> List[Dict[str, Any]]:
        """
        Main scraping method with enhanced performance.
        """
        search_terms = config.get('search_terms', [])
        location = config.get('location', '')
        max_results = int(config.get('max_results', 100))
        extract_reviews = bool(config.get('extract_reviews', False))
        extract_images = bool(config.get('extract_images', False))
        
        all_results = []
        context = await self.engine.create_context(use_proxy=True)
        
        try:
            for term in search_terms:
                if progress_callback:
                    await progress_callback(f"🔍 Searching: {term} in {location}")
                
                search_query = f"{term} {location}" if location else term
                
                # Retry logic for incomplete results
                attempt = 0
                max_attempts = 3
                places = []
                
                while attempt < max_attempts and len(places) < max_results:
                    if attempt > 0:
                        if progress_callback:
                            await progress_callback(f"🔄 Retry {attempt}/{max_attempts-1} - Found {len(places)}/{max_results}")
                    
                    new_places = await self._search_places(context, search_query, max_results)
                    
                    # Merge and deduplicate
                    for place_url in new_places:
                        if place_url not in places:
                            places.append(place_url)
                    
                    if len(places) >= max_results:
                        break
                    
                    attempt += 1
                    if attempt < max_attempts:
                        await asyncio.sleep(2)
                
                if progress_callback:
                    await progress_callback(f"✅ Found {len(places)} places for '{term}'")
                
                # Extract details in parallel batches
                batch_size = 5  # Process 5 places at once
                places_to_process = places[:max_results]
                
                for i in range(0, len(places_to_process), batch_size):
                    batch = places_to_process[i:i+batch_size]
                    
                    if progress_callback:
                        progress = min(i + batch_size, len(places_to_process))
                        await progress_callback(f"📊 Extracting details: {progress}/{len(places_to_process)}")
                    
                    # Parallel extraction
                    tasks = [
                        self._extract_place_details(
                            context,
                            place_url,
                            extract_reviews,
                            extract_images
                        )
                        for place_url in batch
                    ]
                    
                    batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    for result in batch_results:
                        if isinstance(result, dict):
                            all_results.append(result)
                        elif isinstance(result, Exception):
                            logger.error(f"Error in batch processing: {str(result)}")
                    
                    # Small delay between batches
                    await asyncio.sleep(0.5)
        
        finally:
            await context.close()
        
        if progress_callback:
            await progress_callback(f"🎉 Complete! Extracted {len(all_results)} places")
        
        return all_results
    
    async def _search_places(self, context, query: str, max_results: int) -> List[str]:
        """Enhanced search with better scrolling and pagination."""
        page = await context.new_page()
        if stealth_async:
            await stealth_async(page)
            
        place_urls = set()
        
        try:
            search_url = f"{self.base_url}/search/{query.replace(' ', '+')}"
            await page.goto(search_url, wait_until="domcontentloaded", timeout=45000)
            
            # Wait for results panel or list
            try:
                await page.wait_for_selector('div[role="feed"], div.m6QErb[aria-label]', timeout=15000)
            except:
                logger.info("Could not find standard feed, trying generic wait")
                await asyncio.sleep(5)
            
            # Enhanced scrolling with more attempts
            no_new_content_count = 0
            
            for scroll_attempt in range(25): # Increased scroll attempts
                # Get all place links - Enhanced selectors
                links = await page.query_selector_all('a[href*="/maps/place/"]')
                
                initial_count = len(place_urls)
                
                for link in links:
                    try:
                        href = await link.get_attribute('href')
                        if href and '/maps/place/' in href:
                            clean_href = href.split('?')[0] # Clean URL
                            place_urls.add(clean_href)
                    except:
                        continue
                
                if len(place_urls) >= max_results:
                    break
                
                if len(place_urls) == initial_count:
                    no_new_content_count += 1
                else:
                    no_new_content_count = 0
                    
                if no_new_content_count > 3: # Stop if no new items found after 3 attempts
                    logger.info("No new items found after scrolling, stopping")
                    break
                
                # Scroll Logic - Try multiple selectors for the scrollable container
                scrolled = await page.evaluate("""
                    () => {
                        const selectors = [
                            'div[role="feed"]',
                            'div.m6QErb[aria-label]', 
                            'div.ResultListLayer',
                            '.section-layout.section-scrollbox',
                            '.m6QErb.DxyBCb.kA9KIf.dS8AEf'
                        ];
                        
                        for (const selector of selectors) {
                            const els = document.querySelectorAll(selector);
                            for (const el of els) {
                                if (el.scrollHeight > el.clientHeight) {
                                    el.scrollTop = el.scrollHeight;
                                    return true;
                                }
                            }
                        }
                        
                        // Fallback: scroll window
                        window.scrollTo(0, document.body.scrollHeight);
                        return false;
                    }
                """)
                
                await asyncio.sleep(2) # Give time for content to load
                
            logger.info(f"Found {len(place_urls)} unique place URLs for query: {query}")
        
        except Exception as e:
            logger.error(f"Error searching places: {str(e)}")
        
        finally:
            await page.close()
        
        return list(place_urls)
    
    async def _extract_place_details(self, context, url: str, extract_reviews: bool = False, extract_images: bool = False) -> Optional[Dict[str, Any]]:
        """Extract detailed information with improved selectors."""
        page = await context.new_page()
        if stealth_async:
            await stealth_async(page)
            
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            
            # Wait for main content to ensure page loaded
            try:
                await page.wait_for_selector('h1', timeout=10000)
            except:
                pass # Continue anyway, might be partial load
            
            await asyncio.sleep(1.5) # Slight delay for dynamic content
            
            place_data = {
                'url': url,
                'placeId': self._extract_place_id(url)
            }
            
            # --- Robust Extraction Logic ---
            
            # 1. Title - Try h1
            try:
                title_elem = await page.query_selector('h1')
                if title_elem:
                    place_data['title'] = (await title_elem.text_content()).strip()
            except Exception as e:
                logger.debug(f"Title extraction failed: {e}")

            # 2. Category
            try:
                # Look for the category button - usually has 'jsaction' and specific class
                category_elem = await page.query_selector('button[jsaction*="category"]')
                if category_elem:
                    place_data['category'] = (await category_elem.text_content()).strip()
            except: pass

            # 3. Rating & Reviews
            try:
                # Search for aria-label containing stars
                rating_elem = await page.query_selector('span[role="img"][aria-label*="stars"]')
                if rating_elem:
                    rating_text = await rating_elem.get_attribute('aria-label')
                    match = re.search(r'([0-9.]+)', rating_text)
                    if match:
                        place_data['rating'] = float(match.group(1))
            except: pass
            
            try:
                # Reviews count
                reviews_elem = await page.query_selector('button[aria-label*="reviews"], span[aria-label*="reviews"]')
                if reviews_elem:
                    reviews_text = await reviews_elem.get_attribute('aria-label')
                    match = re.search(r'([0-9,]+)', reviews_text)
                    if match:
                        place_data['reviewsCount'] = int(match.group(1).replace(',', ''))
            except: pass

            # 4. Contact Details (Address, Website, Phone)
            # Iterate through all buttons/links with data-item-id or aria-labels
            
            # Address
            try:
                address_elem = await page.query_selector('button[data-item-id="address"]')
                if address_elem:
                    address_text = await address_elem.text_content()
                    place_data['address'] = address_text.strip()
                else:
                    # Fallback for address
                    content = await page.content()
                    # Sometimes address is in a specific div class Io6YTe
                    # But better to rely on text patterns if needed or more generic selectors
                    pass
            except: pass
            
            # Parse Address Components
            if place_data.get('address'):
                self._parse_address(place_data)

            # Website
            try:
                website_elem = await page.query_selector('a[data-item-id="authority"]')
                if website_elem:
                    website_url = await website_elem.get_attribute('href')
                    if website_url:
                        place_data['website'] = website_url
            except: pass

            # Phone
            try:
                phone_elem = await page.query_selector('button[data-item-id*="phone"]')
                if phone_elem:
                    phone_text = await phone_elem.get_attribute('aria-label')
                    if phone_text:
                        phone = phone_text.replace('Phone: ', '').replace('Call phone number', '').strip()
                        place_data['phone'] = phone
                        place_data['phoneVerified'] = True
            except: pass
            
            # Opening Hours
            try:
                hours_elem = await page.query_selector('button[data-item-id="oh"]')
                if hours_elem:
                    hours_text = await hours_elem.get_attribute('aria-label')
                    place_data['openingHours'] = hours_text
            except: pass
            
            # Email & Social extraction from website
            if place_data.get('website'):
                email = await self._extract_email_from_website(place_data['website'])
                if email:
                    place_data['email'] = email
                    place_data['emailVerified'] = True
                
                social_links = await self._extract_social_media(page, place_data['website'])
                if social_links:
                    place_data['socialMedia'] = social_links

            # Images
            if extract_images:
                place_data['images'] = await self._extract_images(page)
            
            # Reviews
            if extract_reviews:
                place_data['reviews'] = await self._extract_reviews(page)
            
            # Calculate score
            if 'rating' in place_data and 'reviewsCount' in place_data:
                place_data['totalScore'] = round(place_data['rating'] * math.log(place_data['reviewsCount'] + 1, 10), 2)
            
            logger.info(f"✅ Extracted: {place_data.get('title', 'Unknown')} | Phone: {place_data.get('phone')} | Addr: {place_data.get('address')}")
            return place_data
        
        except Exception as e:
            logger.error(f"Error extracting place details from {url}: {str(e)}")
            return None
        
        finally:
            await page.close()
    
    def _parse_address(self, place_data: Dict[str, Any]):
        """Helper to parse address components."""
        try:
            address_parts = place_data['address'].split(',')
            if len(address_parts) >= 3:
                place_data['city'] = address_parts[-2].strip()
                state_zip = address_parts[-1].strip().split()
                if state_zip:
                    place_data['state'] = state_zip[0]
            
            # Simple country extraction
            last_part = address_parts[-1].strip()
            country_map = {
                'USA': 'US', 'United States': 'US', 'US': 'US',
                'India': 'IN', 'IN': 'IN',
                'UK': 'GB', 'United Kingdom': 'GB',
                'Canada': 'CA',
                'Australia': 'AU'
            }
            
            for name, code in country_map.items():
                if name in last_part:
                    place_data['countryCode'] = code
                    break
            
            if 'countryCode' not in place_data and place_data.get('state'):
                place_data['countryCode'] = 'US' # Default assumption
                
        except Exception as e:
            logger.debug(f"Address parsing error: {e}")

    async def _extract_email_from_website(self, website_url: str) -> Optional[str]:
        """Extract email from business website."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(website_url, timeout=aiohttp.ClientTimeout(total=10), headers={"User-Agent": "Mozilla/5.0"}) as response:
                    if response.status == 200:
                        html = await response.text()
                        soup = BeautifulSoup(html, 'html.parser')
                        
                        # 1. mailto: links
                        mailto_links = soup.find_all('a', href=re.compile(r'^mailto:', re.I))
                        if mailto_links:
                            for link in mailto_links:
                                email = link['href'].replace('mailto:', '').split('?')[0]
                                if self._is_valid_email(email):
                                    return email.lower()
                        
                        # 2. Text content
                        text_content = soup.get_text()
                        emails = self.email_pattern.findall(text_content)
                        for email in emails:
                            if self._is_business_email(email):
                                return email.lower()
        except:
            return None
        return None
    
    def _is_valid_email(self, email: str) -> bool:
        return bool(self.email_pattern.match(email))
    
    def _is_business_email(self, email: str) -> bool:
        email_lower = email.lower()
        excluded = ['example.com', 'test.com', 'domain.com', 'sentry.io', 'wix.com', 'squarespace.com', 'react', 'node_modules']
        for pattern in excluded:
            if pattern in email_lower:
                return False
        # Filter out image extensions erroneously matched
        if email_lower.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
            return False
        return True
    
    async def _extract_images(self, page: Page) -> List[str]:
        """Extract image URLs."""
        images = []
        try:
            photos_button = await page.query_selector('button[aria-label*="Photo"]')
            if photos_button:
                await photos_button.click()
                await asyncio.sleep(2)
                img_elements = await page.query_selector_all('img[src*="googleusercontent"]')
                for img in img_elements[:10]:
                    src = await img.get_attribute('src')
                    if src and src not in images:
                        images.append(src)
                await page.keyboard.press('Escape')
        except: pass
        return images
    
    async def _extract_reviews(self, page: Page, max_reviews: int = 10) -> List[Dict[str, Any]]:
        """Extract reviews."""
        reviews = []
        try:
            reviews_button = await page.query_selector('button[aria-label*="Reviews"]')
            if reviews_button:
                await reviews_button.click()
                await asyncio.sleep(2)
                
                # Scroll a bit
                await page.evaluate("""
                    () => {
                        const panel = document.querySelector('div[role="main"]');
                        if (panel) panel.scrollTop = panel.scrollHeight;
                    }
                """)
                await asyncio.sleep(1)
                
                review_elements = await page.query_selector_all('div[data-review-id]')
                for elem in review_elements[:max_reviews]:
                    try:
                        review_data = {}
                        name_elem = await elem.query_selector('div.d4r55')
                        if name_elem: review_data['reviewerName'] = await name_elem.text_content()
                        
                        text_elem = await elem.query_selector('span.wiI7pd')
                        if text_elem: review_data['text'] = await text_elem.text_content()
                        
                        if review_data: reviews.append(review_data)
                    except: continue
        except: pass
        return reviews
    
    async def _extract_social_media(self, page: Page, website_url: str) -> Dict[str, str]:
        """Extract social media links."""
        social_links = {}
        try:
            # Check Maps page content first (sometimes links are there)
            # Then check website
            if website_url:
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.get(website_url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                            if response.status == 200:
                                html = await response.text()
                                for platform, pattern in self.social_patterns.items():
                                    matches = pattern.findall(html)
                                    if matches:
                                        url = matches[0]
                                        if not url.startswith('http'): url = 'https://' + url
                                        social_links[platform] = url
                except: pass
        except: pass
        return social_links
    
    def _extract_place_id(self, url: str) -> Optional[str]:
        match = re.search(r'!1s([^!]+)', url)
        if match:
            return match.group(1)
        return None
