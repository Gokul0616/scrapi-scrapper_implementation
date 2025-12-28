import asyncio
import logging
import re
import math
from typing import List, Dict, Any, Optional, Callable
from ..base_scraper import BaseScraper
from ..scraper_engine import ScraperEngine
from crawlee.playwright_crawler import PlaywrightCrawler, PlaywrightCrawlingContext
from crawlee.proxy_configuration import ProxyConfiguration
from playwright.async_api import Page
from bs4 import BeautifulSoup
import aiohttp
from urllib.parse import urljoin, urlparse
import os

# Try importing stealth, but don't fail if not present
try:
    from playwright_stealth import stealth_async
except ImportError:
    stealth_async = None

logger = logging.getLogger(__name__)


class GoogleMapsScraperV4(BaseScraper):
    """
    Google Maps scraper V4 with Crawlee integration for Apify-like performance:
    - Built-in request queue and concurrency management
    - Automatic dataset storage (JSON/CSV export)
    - Better anti-blocking with proxy rotation
    - Retry logic and resilience
    - All V3 features: emails, socials, website enrichment
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
        
        # Storage for results (since we can't directly access Crawlee's dataset in scrape method)
        self.results = []
    
    @classmethod
    def get_name(cls) -> str:
        return "Google Maps Scraper V4 (Crawlee)"
    
    @classmethod
    def get_description(cls) -> str:
        return "Next-gen Google Maps scraper with Crawlee - Enhanced concurrency, request queuing, and Apify-like features"
    
    @classmethod
    def get_category(cls) -> str:
        return "Maps & Location"
    
    @classmethod
    def get_icon(cls) -> str:
        return "🗺️"
    
    @classmethod
    def get_tags(cls) -> List[str]:
        return ["maps", "google", "business", "leads", "local", "crawlee", "apify"]
    
    @classmethod
    def get_input_schema(cls) -> Dict[str, Any]:
        return {
            "search_terms": {"type": "array", "description": "List of search terms"},
            "location": {"type": "string", "description": "Location to search in"},
            "max_results": {"type": "integer", "default": 100},
            "extract_reviews": {"type": "boolean", "default": False},
            "extract_images": {"type": "boolean", "default": False},
            "use_proxy": {"type": "boolean", "default": True},
            "max_concurrency": {"type": "integer", "default": 10}
        }
    
    @classmethod
    def get_output_schema(cls) -> Dict[str, Any]:
        return {
            "title": "string - Business name",
            "address": "string - Full address",
            "phone": "string - Phone number",
            "email": "string - Email address",
            "website": "string - Website URL",
            "websiteTitle": "string - Website Meta Title",
            "websiteDescription": "string - Website Meta Description",
            "rating": "number - Rating score",
            "reviewsCount": "number - Number of reviews",
            "category": "string - Business category",
            "socialMedia": "object - Social media links"
        }
    
    async def scrape(self, config: Dict[str, Any], progress_callback: Optional[Callable] = None) -> List[Dict[str, Any]]:
        """
        Main scraping method using Crawlee for enhanced performance.
        """
        search_terms = config.get('search_terms', [])
        location = config.get('location', '')
        max_results = int(config.get('max_results', 100))
        extract_reviews = bool(config.get('extract_reviews', False))
        extract_images = bool(config.get('extract_images', False))
        use_proxy = bool(config.get('use_proxy', True))
        max_concurrency = int(config.get('max_concurrency', 10))
        
        # Reset results for this scrape
        self.results = []
        
        # Setup proxy configuration if available
        proxy_config = None
        if use_proxy:
            try:
                # Check if scraper engine has proxy support
                if hasattr(self.engine, 'proxy_urls') and self.engine.proxy_urls:
                    proxy_config = ProxyConfiguration(proxy_urls=self.engine.proxy_urls)
                    logger.info(f"Using proxy configuration with {len(self.engine.proxy_urls)} proxies")
            except Exception as e:
                logger.warning(f"Proxy setup failed, continuing without proxy: {e}")
        
        # Create Crawlee crawler
        crawler = PlaywrightCrawler(
            max_concurrency=max_concurrency,
            max_requests_per_crawl=max_results * 2,  # Rough limit
            headless=True,
            proxy_configuration=proxy_config,
            # Use Chromium for better compatibility
            browser_type='chromium',
        )
        
        # Store shared config in crawler's user_data
        crawler.user_data = {
            'location': location,
            'max_results': max_results,
            'extract_reviews': extract_reviews,
            'extract_images': extract_images,
            'scraper': self,
            'progress_callback': progress_callback,
            'places_found': 0,
        }
        
        # Handler for search/list pages (enqueues detail URLs)
        @crawler.router.default_handler
        async def search_handler(context: PlaywrightCrawlingContext) -> None:
            if context.request.label == 'search':
                await self._handle_search(context)
            elif context.request.label == 'detail':
                await self._handle_detail(context)
        
        # Build initial search requests
        start_requests = []
        for term in search_terms:
            query = f"{term} {location}" if location else term
            start_requests.append({
                'url': f"{self.base_url}/search/?q={query.replace(' ', '+')}",
                'label': 'search',
                'user_data': {'query': query, 'search_term': term}
            })
        
        if progress_callback:
            await progress_callback(f"🚀 Starting Crawlee-powered scrape for {len(search_terms)} search terms")
        
        # Run the crawler
        try:
            await crawler.run(start_requests)
        except Exception as e:
            logger.error(f"Crawler error: {e}")
        
        if progress_callback:
            await progress_callback(f"🎉 Complete! Extracted {len(self.results)} places")
        
        return self.results
    
    async def _handle_search(self, context: PlaywrightCrawlingContext) -> None:
        """Handle search page - find and enqueue place detail URLs."""
        page = context.page
        query = context.request.user_data.get('query', '')
        search_term = context.request.user_data.get('search_term', '')
        max_results = context.user_data['max_results']
        progress_callback = context.user_data.get('progress_callback')
        
        if stealth_async:
            await stealth_async(page)
        
        try:
            if progress_callback:
                await progress_callback(f"🔍 Searching: {search_term}")
            
            await page.goto(context.request.url, wait_until="domcontentloaded", timeout=45000)
            
            # Wait for results panel
            try:
                await page.wait_for_selector('div[role="feed"], div.m6QErb[aria-label]', timeout=15000)
            except:
                logger.info("Standard feed not found, trying generic wait")
                await asyncio.sleep(5)
            
            # Scroll and collect place URLs
            place_urls = set()
            no_new_content_count = 0
            
            for scroll_attempt in range(25):  # Enhanced scrolling
                links = await page.query_selector_all('a[href*="/maps/place/"]')
                
                initial_count = len(place_urls)
                
                for link in links:
                    try:
                        href = await link.get_attribute('href')
                        if href and '/maps/place/' in href:
                            clean_href = href.split('?')[0]
                            place_urls.add(clean_href)
                    except:
                        continue
                
                if len(place_urls) >= max_results:
                    break
                
                if len(place_urls) == initial_count:
                    no_new_content_count += 1
                else:
                    no_new_content_count = 0
                
                if no_new_content_count > 3:
                    logger.info(f"No new places found after {no_new_content_count} scroll attempts")
                    break
                
                # Scroll logic
                await page.evaluate("""
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
                        
                        window.scrollTo(0, document.body.scrollHeight);
                        return false;
                    }
                """)
                
                await asyncio.sleep(2)
            
            logger.info(f"Found {len(place_urls)} places for '{search_term}'")
            
            if progress_callback:
                await progress_callback(f"✅ Found {len(place_urls)} places for '{search_term}'")
            
            # Enqueue detail pages
            for url in list(place_urls)[:max_results]:
                await context.enqueue_request(url, label='detail')
        
        except Exception as e:
            logger.error(f"Search handler error: {e}")
    
    async def _handle_detail(self, context: PlaywrightCrawlingContext) -> None:
        """Handle detail page - extract place information."""
        page = context.page
        url = context.request.url
        extract_reviews = context.user_data['extract_reviews']
        extract_images = context.user_data['extract_images']
        progress_callback = context.user_data.get('progress_callback')
        
        if stealth_async:
            await stealth_async(page)
        
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            
            # Wait for main content
            try:
                await page.wait_for_selector('h1', timeout=10000)
            except:
                pass
            
            await asyncio.sleep(1.5)
            
            place_data = {
                'url': url,
                'placeId': self._extract_place_id(url)
            }
            
            # Extract title
            try:
                title_elem = await page.query_selector('h1')
                if title_elem:
                    place_data['title'] = (await title_elem.text_content()).strip()
            except Exception as e:
                logger.debug(f"Title extraction failed: {e}")
            
            # Extract category
            try:
                category_elem = await page.query_selector('button[jsaction*="category"]')
                if category_elem:
                    place_data['category'] = (await category_elem.text_content()).strip()
            except:
                pass
            
            # Extract rating
            try:
                rating_elem = await page.query_selector('span[role="img"][aria-label*="stars"]')
                if rating_elem:
                    rating_text = await rating_elem.get_attribute('aria-label')
                    match = re.search(r'([0-9.]+)', rating_text)
                    if match:
                        place_data['rating'] = float(match.group(1))
            except:
                pass
            
            # Extract reviews count
            try:
                reviews_elem = await page.query_selector('button[aria-label*="reviews"], span[aria-label*="reviews"]')
                if reviews_elem:
                    reviews_text = await reviews_elem.get_attribute('aria-label')
                    match = re.search(r'([0-9,]+)', reviews_text)
                    if match:
                        place_data['reviewsCount'] = int(match.group(1).replace(',', ''))
            except:
                pass
            
            # Extract address
            try:
                address_elem = await page.query_selector('button[data-item-id="address"]')
                if address_elem:
                    address_text = await address_elem.text_content()
                    place_data['address'] = re.sub(r'^[^\w\d]+', '', address_text.strip()).strip()
                    self._parse_address(place_data)
            except:
                pass
            
            # Extract website
            try:
                website_elem = await page.query_selector('a[data-item-id="authority"]')
                if website_elem:
                    website_url = await website_elem.get_attribute('href')
                    if website_url:
                        place_data['website'] = website_url
            except:
                pass
            
            # Extract phone
            try:
                phone_elem = await page.query_selector('button[data-item-id*="phone"]')
                if phone_elem:
                    phone_text = await phone_elem.get_attribute('aria-label')
                    if phone_text:
                        phone = phone_text.replace('Phone: ', '').replace('Call phone number', '').strip()
                        place_data['phone'] = phone
                        place_data['phoneVerified'] = True
            except:
                pass
            
            # Extract opening hours
            try:
                hours_elem = await page.query_selector('button[data-item-id="oh"]')
                if hours_elem:
                    hours_text = await hours_elem.get_attribute('aria-label')
                    place_data['openingHours'] = hours_text
            except:
                pass
            
            # Enrich with website data (emails, socials, metadata)
            if place_data.get('website'):
                await self._enrich_place_data(place_data)
            
            # Extract images if requested
            if extract_images:
                place_data['images'] = await self._extract_images(page)
            
            # Extract reviews if requested
            if extract_reviews:
                place_data['reviews'] = await self._extract_reviews(page)
            
            # Calculate total score
            if 'rating' in place_data and 'reviewsCount' in place_data:
                place_data['totalScore'] = round(place_data['rating'] * math.log(place_data['reviewsCount'] + 1, 10), 2)
            
            logger.info(f"✅ Extracted: {place_data.get('title', 'Unknown')}")
            
            # Store result
            self.results.append(place_data)
            
            # Update progress
            context.user_data['places_found'] += 1
            if progress_callback:
                await progress_callback(f"📊 Extracted {context.user_data['places_found']} places")
            
            # Push to Crawlee dataset (for export)
            await context.push_data(place_data)
        
        except Exception as e:
            logger.error(f"Detail handler error for {url}: {e}")
    
    def _parse_address(self, place_data: Dict[str, Any]):
        """Parse address components."""
        try:
            address_parts = place_data['address'].split(',')
            if len(address_parts) >= 3:
                place_data['city'] = address_parts[-2].strip()
                state_zip = address_parts[-1].strip().split()
                if state_zip:
                    place_data['state'] = state_zip[0]
            
            # Country extraction
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
                place_data['countryCode'] = 'US'
        
        except Exception as e:
            logger.debug(f"Address parsing error: {e}")
    
    async def _enrich_place_data(self, place_data: Dict[str, Any]):
        """
        Deep enrichment from website:
        - Meta Title & Description
        - Emails (Home + Contact Page)
        - Social Media
        """
        website_url = place_data.get('website')
        if not website_url:
            return
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        }
        
        try:
            async with aiohttp.ClientSession(headers=headers) as session:
                # Fetch homepage
                async with session.get(website_url, timeout=aiohttp.ClientTimeout(total=15)) as response:
                    if response.status != 200:
                        return
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Extract meta data
                    if soup.title:
                        place_data['websiteTitle'] = soup.title.string.strip()
                    
                    meta_desc = soup.find('meta', attrs={'name': 'description'}) or soup.find('meta', attrs={'property': 'og:description'})
                    if meta_desc:
                        place_data['websiteDescription'] = meta_desc.get('content', '').strip()
                    
                    # Extract contacts from homepage
                    self._extract_contacts_from_soup(soup, place_data)
                    
                    # Try contact page if no email found
                    if not place_data.get('email'):
                        contact_link = self._find_contact_link(soup, website_url)
                        if contact_link:
                            try:
                                async with session.get(contact_link, timeout=aiohttp.ClientTimeout(total=10)) as contact_resp:
                                    if contact_resp.status == 200:
                                        contact_html = await contact_resp.text()
                                        contact_soup = BeautifulSoup(contact_html, 'html.parser')
                                        self._extract_contacts_from_soup(contact_soup, place_data)
                            except Exception as e:
                                logger.debug(f"Error visiting contact page: {e}")
        
        except Exception as e:
            logger.debug(f"Enrichment error for {website_url}: {e}")
    
    def _extract_contacts_from_soup(self, soup: BeautifulSoup, place_data: Dict[str, Any]):
        """Extract emails and socials from soup."""
        # Extract emails
        if not place_data.get('email'):
            # Mailto links
            mailto_links = soup.find_all('a', href=re.compile(r'^mailto:', re.I))
            for link in mailto_links:
                email = link['href'].replace('mailto:', '').split('?')[0]
                if self._is_valid_email(email):
                    place_data['email'] = email.lower()
                    place_data['emailVerified'] = True
                    break
            
            # Text regex
            if not place_data.get('email'):
                text_content = soup.get_text()
                emails = self.email_pattern.findall(text_content)
                for email in emails:
                    if self._is_business_email(email):
                        place_data['email'] = email.lower()
                        place_data['emailVerified'] = True
                        break
        
        # Extract social media
        if 'socialMedia' not in place_data:
            place_data['socialMedia'] = {}
        
        for platform, pattern in self.social_patterns.items():
            if platform not in place_data['socialMedia']:
                links = soup.find_all('a', href=pattern)
                if links:
                    place_data['socialMedia'][platform] = links[0]['href']
    
    def _find_contact_link(self, soup: BeautifulSoup, base_url: str) -> Optional[str]:
        """Find contact page URL."""
        contact_keywords = ['contact', 'about', 'get in touch', 'reach us']
        
        for a in soup.find_all('a', href=True):
            text = a.get_text().lower()
            href = a['href'].lower()
            
            if any(k in text for k in contact_keywords) or any(k in href for k in contact_keywords):
                full_url = urljoin(base_url, a['href'])
                if urlparse(full_url).netloc == urlparse(base_url).netloc:
                    return full_url
        return None
    
    def _is_valid_email(self, email: str) -> bool:
        return bool(self.email_pattern.match(email))
    
    def _is_business_email(self, email: str) -> bool:
        email_lower = email.lower()
        excluded = ['example.com', 'test.com', 'domain.com', 'sentry.io', 'wix.com', 'squarespace.com', 'react', 'node_modules', 'bootstrap']
        for pattern in excluded:
            if pattern in email_lower:
                return False
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
        except:
            pass
        return images
    
    async def _extract_reviews(self, page: Page, max_reviews: int = 10) -> List[Dict[str, Any]]:
        """Extract reviews."""
        reviews = []
        try:
            reviews_button = await page.query_selector('button[aria-label*="Reviews"]')
            if reviews_button:
                await reviews_button.click()
                await asyncio.sleep(2)
                
                # Scroll reviews panel
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
                        if name_elem:
                            review_data['reviewerName'] = await name_elem.text_content()
                        
                        text_elem = await elem.query_selector('span.wiI7pd')
                        if text_elem:
                            review_data['text'] = await text_elem.text_content()
                        
                        if review_data:
                            reviews.append(review_data)
                    except:
                        continue
        except:
            pass
        return reviews
    
    def _extract_place_id(self, url: str) -> Optional[str]:
        match = re.search(r'!1s([^!]+)', url)
        if match:
            return match.group(1)
        return None
