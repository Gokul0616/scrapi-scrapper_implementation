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
from urllib.parse import urljoin, urlparse

# Try importing stealth, but don't fail if not present
try:
    from playwright_stealth import stealth_async
except ImportError:
    stealth_async = None

logger = logging.getLogger(__name__)

class GoogleMapsScraperV3(BaseScraper):
    """
    Enhanced Google Maps scraper with Scrapi-like performance:
    - Parallel detail extraction
    - Better scrolling and pagination
    - Email and phone extraction with verification
    - Retry logic for incomplete results
    - Robust selectors and stealth mode
    - Website Enrichment (Meta data, Socials, Deep Email Search)
    """
    
    _location_cache = {} # Static cache to share resolved coordinates across runs
    
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
            "websiteTitle": "string - Website Meta Title",
            "websiteDescription": "string - Website Meta Description",
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
        
        # Detect target country for optimization
        target_country = self._detect_target_country(location, search_terms)
        country_cfg = self._get_country_config(target_country)
        
        context = await self.engine.create_context(
            use_proxy=True,
            locale=country_cfg.get('locale'),
            timezone_id=country_cfg.get('timezone'),
            geolocation=country_cfg.get('geolocation')
        )
        
        try:
            for term in search_terms:
                # 1. Resolve Location Automatically (No Hardcode!)
                target_place_name = self._detect_target_country(location, [term])
                resolved = None
                if target_place_name:
                    resolved = await self._resolve_location(context, target_place_name)
                
                # 2. Get Browser Config (Neutral start)
                country_cfg = self._get_country_config(None)
                
                # Regional parameters for URL
                hl = "en"
                gl = "us"
                
                if resolved and resolved.get('geolocation'):
                     # Use the resolved coordinates and zoom to force Map View
                     country_cfg['geolocation'] = {
                         **resolved['geolocation'],
                         'zoom': resolved.get('zoom', 12)
                     }
                
                region_params = f"&hl={hl}&gl={gl}"
                
                # 3. Clean up display and query
                display_location = location
                if display_location.lower().startswith("in "):
                    display_location = display_location[3:].strip()
                
                if progress_callback:
                    info = f" (Resolved: {target_place_name})" if resolved else " (Local IP)"
                    await progress_callback(f"🔍 Searching: {term} in {display_location}{info}")
                
                # Build the actual search query
                search_query = f"{term} in {display_location}" if display_location else term
                
                # Retry logic for incomplete results
                attempt = 0
                max_attempts = 3
                places = []
                
                while attempt < max_attempts and len(places) < max_results:
                    if attempt > 0:
                        if progress_callback:
                            await progress_callback(f"🔄 Retry {attempt}/{max_attempts-1} - Found {len(places)}/{max_results}")
                    
                    # Pass geolocation to _search_places to avoid single-result redirects
                    new_places = await self._search_places(
                        context, 
                        search_query, 
                        max_results, 
                        region_params,
                        geolocation=country_cfg.get('geolocation')
                    )
                    
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
    
    async def _search_places(self, context, query: str, max_results: int, region_params: str = "", geolocation: Optional[Dict[str, float]] = None) -> List[str]:
        """Enhanced search with better scrolling and pagination.
        Using geolocation helps bypass single-result redirects by forcing a map view.
        """
        page = await context.new_page()
        if stealth_async:
            await stealth_async(page)
            
        place_urls = set()
        
        try:
            # Construct search URL. If geolocation is provided, use it to force a list view.
            # Format: /search/Query/@lat,lng,zoomZ/
            q = query.replace(' ', '+')
            if geolocation and 'latitude' in geolocation and 'longitude' in geolocation:
                lat, lng = geolocation['latitude'], geolocation['longitude']
                zoom = geolocation.get('zoom', 12) # Default to 12 if not provided
                # Correct the URL to avoid double /maps/maps
                search_url = f"{self.base_url}/search/{q}/@{lat},{lng},{zoom}z?{region_params.lstrip('&')}"
            else:
                search_url = f"{self.base_url}/search/{q}?{region_params.lstrip('&')}"
            
            logger.info(f"Navigating to search URL: {search_url}")
            await page.goto(search_url, wait_until="domcontentloaded", timeout=45000)
            
            # 1. Check if we were redirected to a single place directly
            current_url = page.url
            if '/maps/place/' in current_url:
                logger.info(f"Direct redirect to single place: {current_url}")
                clean_href = current_url.split('?')[0]
                place_urls.add(clean_href)
                return list(place_urls)

            # 2. Wait for results panel or list
            try:
                await page.wait_for_selector('div[role="feed"], div.m6QErb[aria-label]', timeout=15000)
            except:
                # Re-check URL after wait just in case of slow redirect
                if '/maps/place/' in page.url:
                    clean_href = page.url.split('?')[0]
                    place_urls.add(clean_href)
                    return list(place_urls)
                    
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
            
            place_data: Dict[str, Any] = {
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
                    # Clean address: remove leading special chars/icons (like )
                    place_data['address'] = re.sub(r'^[^\w\d]+', '', address_text.strip()).strip()
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
            
            # 5. Enrichment: Email & Social extraction from website
            if place_data.get('website'):
                await self._enrich_place_data(place_data)

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
        """Completely automated address parsing without hardcoded maps."""
        try:
            full_address = place_data.get('address', '')
            if not full_address:
                return
                
            address_parts = [p.strip() for p in full_address.split(',')]
            
            # 1. Extract Country (usually the last part)
            if len(address_parts) >= 1:
                # If the last part is just a zip-like string (numbers), the previous part might be the country
                last_part = address_parts[-1]
                if any(char.isdigit() for char in last_part) and len(address_parts) >= 2:
                    # Likely a zip/state, check one part back
                    place_data['countryCode'] = address_parts[-2]
                else:
                    place_data['countryCode'] = last_part
            
            # 2. Extract City (usually the second to last or third to last)
            if len(address_parts) >= 2:
                # Basic heuristic: if we took -1 as country, -2 is likely city/state
                potential_city = address_parts[-2]
                # Split by space to remove zip/state if present
                city_parts = potential_city.split()
                if city_parts:
                    place_data['city'] = city_parts[0]
                    if len(city_parts) > 1:
                        place_data['state'] = " ".join(city_parts[1:])
            
            # Final cleaning: if country is "USA", "United States", etc., it's fine as is
            # The goal is "no hardcode," so we return the name found in the address.
                
        except Exception as e:
            logger.debug(f"Automated address parsing error: {e}")

    async def _resolve_location(self, context, location_name: str) -> Optional[Dict[str, Any]]:
        """
        Dynamically resolve any location name (Nigeria, Paris, etc.) to GPS coordinates.
        This uses Google Maps' own geocoding through URL redirects.
        """
        if location_name.lower() in self._location_cache:
            return self._location_cache[location_name.lower()]
            
        page = await context.new_page()
        try:
            # Quick search to resolve location
            resolve_url = f"{self.base_url}/search/{location_name.replace(' ', '+')}?hl=en"
            logger.info(f"Resolving location coordinates: {location_name}")
            
            await page.goto(resolve_url, wait_until="domcontentloaded", timeout=30000)
            
            # Wait for redirect to /@lat,lng format
            for _ in range(15):
                current_url = page.url
                if '/@' in current_url:
                    match = re.search(r'/@(-?\d+\.\d+),(-?\d+\.\d+),(\d+)z', current_url)
                    if match:
                        lat = float(match.group(1))
                        lng = float(match.group(2))
                        zoom = int(match.group(3))
                        
                        result = {
                            'geolocation': {'latitude': lat, 'longitude': lng},
                            'zoom': zoom,
                            'country_hint': None
                        }
                        self._location_cache[location_name.lower()] = result
                        logger.info(f"📍 Location '{location_name}' resolved to {lat}, {lng} (Zoom: {zoom})")
                        return result
                await asyncio.sleep(0.5)
        except Exception as e:
            logger.debug(f"Geolocation resolution failed for {location_name}: {e}")
        finally:
            await page.close()
        return None

    def _detect_target_country(self, location: str, search_terms: List[str]) -> str:
        """Extract a location name from the query (e.g. 'in nigeria')."""
        # 1. Check if location field is already provided and clean it
        if location:
            loc = location.strip()
            if loc.lower().startswith("in "):
                loc = loc[3:].strip()
            return loc

        # 2. Otherwise extract from search terms
        combined = " ".join(search_terms).lower()
        match = re.search(r'in\s+([a-zA-Z\s]+)', combined)
        if match:
            # Only take the first few words or until we hit a non-location word
            # For simplicity, we just take what the regex found but trimmed
            return match.group(1).strip()
            
        return ""

    def _get_country_config(self, country_code: Optional[str]) -> Dict[str, Any]:
        """Dynamically guess browser configuration for a country code."""
        if not country_code:
            return {}
            
        code = country_code.upper()
        lang = country_code.lower()
        
        # 1. Base config based on code
        config = {
            'locale': f"en-{code}", # Default to English for the region
            'hl': 'en',
            'gl': lang,
            'timezone': None,
            'geolocation': None
        }
        
        # 2. Comprehensive Overrides for Timezones and Geolocation
        # This covers all major regions and helps bypass single-result redirects
        overrides = {
            'US': {'locale': 'en-US', 'timezone': 'America/New_York', 'hl': 'en', 'gl': 'us', 'geolocation': {'latitude': 37.0902, 'longitude': -95.7129}},
            'IN': {'locale': 'en-IN', 'timezone': 'Asia/Kolkata', 'hl': 'en', 'gl': 'in', 'geolocation': {'latitude': 20.5937, 'longitude': 78.9629}},
            'GB': {'locale': 'en-GB', 'timezone': 'Europe/London', 'hl': 'en', 'gl': 'gb', 'geolocation': {'latitude': 51.5074, 'longitude': -0.1278}},
            'RU': {'locale': 'ru-RU', 'timezone': 'Europe/Moscow', 'hl': 'ru', 'gl': 'ru', 'geolocation': {'latitude': 55.7558, 'longitude': 37.6173}},
            'NG': {'locale': 'en-NG', 'timezone': 'Africa/Lagos', 'hl': 'en', 'gl': 'ng', 'geolocation': {'latitude': 9.0820, 'longitude': 8.6753}},
            'IT': {'locale': 'it-IT', 'timezone': 'Europe/Rome', 'hl': 'it', 'gl': 'it', 'geolocation': {'latitude': 41.9028, 'longitude': 12.4964}},
            'FR': {'locale': 'fr-FR', 'timezone': 'Europe/Paris', 'hl': 'fr', 'gl': 'fr', 'geolocation': {'latitude': 48.8566, 'longitude': 2.3522}},
            'DE': {'locale': 'de-DE', 'timezone': 'Europe/Berlin', 'hl': 'de', 'gl': 'de', 'geolocation': {'latitude': 52.5200, 'longitude': 13.4050}},
            'AU': {'locale': 'en-AU', 'timezone': 'Australia/Sydney', 'hl': 'en', 'gl': 'au', 'geolocation': {'latitude': -33.8688, 'longitude': 151.2093}},
            'CA': {'locale': 'en-CA', 'timezone': 'America/Toronto', 'hl': 'en', 'gl': 'ca', 'geolocation': {'latitude': 43.6532, 'longitude': -79.3832}},
            'BR': {'locale': 'pt-BR', 'timezone': 'America/Sao_Paulo', 'hl': 'pt', 'gl': 'br', 'geolocation': {'latitude': -23.5505, 'longitude': -46.6333}},
            'MX': {'locale': 'es-MX', 'timezone': 'America/Mexico_City', 'hl': 'es', 'gl': 'mx', 'geolocation': {'latitude': 19.4326, 'longitude': -99.1332}},
            'JP': {'locale': 'ja-JP', 'timezone': 'Asia/Tokyo', 'hl': 'ja', 'gl': 'jp', 'geolocation': {'latitude': 35.6762, 'longitude': 139.6503}},
            'CN': {'locale': 'zh-CN', 'timezone': 'Asia/Shanghai', 'hl': 'zh-CN', 'gl': 'cn', 'geolocation': {'latitude': 31.2304, 'longitude': 121.4737}},
            'AE': {'locale': 'en-AE', 'timezone': 'Asia/Dubai', 'hl': 'en', 'gl': 'ae', 'geolocation': {'latitude': 25.2048, 'longitude': 55.2708}},
            'ZA': {'locale': 'en-ZA', 'timezone': 'Africa/Johannesburg', 'hl': 'en', 'gl': 'za', 'geolocation': {'latitude': -26.2041, 'longitude': 28.0473}},
            'SG': {'locale': 'en-SG', 'timezone': 'Asia/Singapore', 'hl': 'en', 'gl': 'sg', 'geolocation': {'latitude': 1.3521, 'longitude': 103.8198}},
        }
        
        if code in overrides:
            config.update(overrides[code])
            
        return config

    async def _enrich_place_data(self, place_data: Dict[str, Any]):
        """
        Deep enrichment from website:
        - Meta Title & Description
        - Emails (Home + Contact Page)
        - Social Media
        """
        website_url = place_data.get('website')
        if not website_url: return

        # Headers to mimic browser
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        }

        try:
            async with aiohttp.ClientSession(headers=headers) as session:
                # 1. Fetch Homepage
                async with session.get(website_url, timeout=aiohttp.ClientTimeout(total=15)) as response:
                    if response.status != 200: return
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')

                    # Extract Meta Data
                    if soup.title:
                        place_data['websiteTitle'] = soup.title.string.strip()
                    
                    meta_desc = soup.find('meta', attrs={'name': 'description'}) or soup.find('meta', attrs={'property': 'og:description'})
                    if meta_desc:
                        place_data['websiteDescription'] = meta_desc.get('content', '').strip()

                    # Extract Socials & Emails from Home
                    self._extract_contacts_from_soup(soup, place_data)

                    # 2. If no email, try to find Contact page
                    if not place_data.get('email'):
                        contact_link = self._find_contact_link(soup, website_url)
                        if contact_link:
                            logger.info(f"Visiting contact page for {place_data.get('title')}: {contact_link}")
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
        """Helper to extract emails and socials from a soup object."""
        # Emails
        if not place_data.get('email'):
            # 1. Mailto links
            mailto_links = soup.find_all('a', href=re.compile(r'^mailto:', re.I))
            for link in mailto_links:
                email = link['href'].replace('mailto:', '').split('?')[0]
                if self._is_valid_email(email):
                    place_data['email'] = email.lower()
                    place_data['emailVerified'] = True
                    break # Stop after first valid email

            # 2. Text regex
            if not place_data.get('email'):
                text_content = soup.get_text()
                emails = self.email_pattern.findall(text_content)
                for email in emails:
                    if self._is_business_email(email):
                        place_data['email'] = email.lower()
                        place_data['emailVerified'] = True
                        break

        # Socials
        if 'socialMedia' not in place_data:
            place_data['socialMedia'] = {}
        
        for platform, pattern in self.social_patterns.items():
            if platform not in place_data['socialMedia']:
                # Search in hrefs
                links = soup.find_all('a', href=pattern)
                if links:
                    place_data['socialMedia'][platform] = links[0]['href']

    def _find_contact_link(self, soup: BeautifulSoup, base_url: str) -> Optional[str]:
        """Find a likely contact page URL."""
        contact_keywords = ['contact', 'about', 'get in touch', 'reach us']
        
        for a in soup.find_all('a', href=True):
            text = a.get_text().lower()
            href = a['href'].lower()
            
            if any(k in text for k in contact_keywords) or any(k in href for k in contact_keywords):
                # Resolve relative URL
                full_url = urljoin(base_url, a['href'])
                # Ensure it's the same domain
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
    
    def _extract_place_id(self, url: str) -> Optional[str]:
        match = re.search(r'!1s([^!]+)', url)
        if match:
            return match.group(1)
        return None
