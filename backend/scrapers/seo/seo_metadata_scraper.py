"""
SEO Metadata Scraper - Extract comprehensive SEO data from websites
Similar to Apify's SEO Metadata Scraper
"""
import json
import logging
from typing import Dict, Any, List, Optional, Callable
from urllib.parse import urljoin, urlparse
from playwright.async_api import Page
from scrapers.base_scraper import BaseScraper

logger = logging.getLogger(__name__)


class SEOMetadataScraper(BaseScraper):
    """
    Comprehensive SEO Metadata Scraper
    Extracts: meta tags, Open Graph, Twitter Cards, JSON-LD, headings, icons, and more
    """
    
    @classmethod
    def get_name(cls) -> str:
        return "SEO Metadata Scraper"
    
    @classmethod
    def get_description(cls) -> str:
        return "Extract comprehensive SEO metadata including meta tags, Open Graph, Twitter Cards, JSON-LD structured data, headings, and technical SEO elements"
    
    @classmethod
    def get_category(cls) -> str:
        return "SEO & Analytics"
    
    @classmethod
    def get_icon(cls) -> str:
        return "🔍"
    
    @classmethod
    def get_tags(cls) -> List[str]:
        return ["seo", "metadata", "open-graph", "twitter-cards", "json-ld", "structured-data", "analytics", "audit"]
    
    def get_input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "required": ["url"],
            "properties": {
                "url": {
                    "type": "string",
                    "title": "Target URL",
                    "description": "Enter the website URL to analyze (must include http:// or https://)"
                },
                "extract_headings": {
                    "type": "boolean",
                    "title": "Extract Headings (H1-H6)",
                    "description": "Extract all heading tags for content structure analysis",
                    "default": True
                },
                "extract_images": {
                    "type": "boolean",
                    "title": "Extract Image Metadata",
                    "description": "Extract image statistics and alt text analysis",
                    "default": True
                },
                "extract_links": {
                    "type": "boolean",
                    "title": "Extract Links",
                    "description": "Analyze internal and external links (adds processing time)",
                    "default": False
                }
            }
        }
    
    def get_output_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "url": {"type": "string"},
                "status_code": {"type": "integer"},
                "timestamp": {"type": "string"},
                "title": {"type": "string"},
                "meta_description": {"type": "string"},
                "meta_keywords": {"type": "string"},
                "canonical": {"type": "string"},
                "meta_robots": {"type": "string"},
                "open_graph": {"type": "object"},
                "twitter_card": {"type": "object"},
                "json_ld": {"type": "array"},
                "headings": {"type": "object"},
                "icons": {"type": "object"},
                "hreflang": {"type": "array"},
                "images": {"type": "object"},
                "links": {"type": "object"}
            }
        }
    
    async def scrape(
        self, 
        config: Dict[str, Any], 
        progress_callback: Optional[Callable] = None
    ) -> List[Dict[str, Any]]:
        """
        Main scraping method
        """
        url = config.get('url')
        extract_headings = config.get('extract_headings', True)
        extract_images = config.get('extract_images', True)
        extract_links = config.get('extract_links', False)
        
        if not url:
            raise ValueError("URL parameter is required")
        
        results = []
        page = None
        
        try:
            await self._log_progress(f"🔍 Starting SEO metadata extraction for: {url}", progress_callback)
            
            # Get a browser page from the engine
            page = await self.engine.new_page()
            
            # Navigate to the URL
            await self._log_progress(f"📡 Loading page: {url}", progress_callback)
            response = await page.goto(url, wait_until='networkidle', timeout=60000)
            status_code = response.status if response else None
            
            # Wait for page to be fully loaded
            await page.wait_for_load_state('domcontentloaded')
            await self._log_progress(f"✅ Page loaded (status: {status_code})", progress_callback)
            
            # Extract all metadata
            await self._log_progress("📊 Extracting SEO metadata...", progress_callback)
            metadata = await self._extract_metadata(page, url, status_code)
            
            # Extract headings if requested
            if extract_headings:
                await self._log_progress("📝 Extracting headings (H1-H6)...", progress_callback)
                metadata['headings'] = await self._extract_headings(page)
            
            # Extract images if requested
            if extract_images:
                await self._log_progress("🖼️ Analyzing images...", progress_callback)
                metadata['images'] = await self._extract_image_metadata(page, url)
            
            # Extract links if requested
            if extract_links:
                await self._log_progress("🔗 Analyzing links...", progress_callback)
                metadata['links'] = await self._extract_links(page, url)
            
            results.append(metadata)
            
            await self._log_progress(f"✅ Successfully extracted SEO metadata from: {url}", progress_callback)
            
        except Exception as e:
            logger.error(f"❌ Error scraping {url}: {str(e)}")
            await self._log_progress(f"❌ Error: {str(e)}", progress_callback)
            results.append({
                'url': url,
                'error': str(e),
                'status': 'failed'
            })
        finally:
            if page:
                await page.close()
        
        return results
    
    async def _extract_metadata(self, page: Page, url: str, status_code: Optional[int]) -> Dict[str, Any]:
        """Extract all SEO metadata from the page"""
        
        metadata = {
            'url': url,
            'status_code': status_code,
            'timestamp': self._get_timestamp()
        }
        
        # Basic SEO tags
        metadata['title'] = await page.title()
        metadata['meta_description'] = await self._get_meta_tag(page, 'name', 'description')
        metadata['meta_keywords'] = await self._get_meta_tag(page, 'name', 'keywords')
        metadata['canonical'] = await self._get_link_tag(page, 'rel', 'canonical')
        metadata['meta_robots'] = await self._get_meta_tag(page, 'name', 'robots')
        metadata['viewport'] = await self._get_meta_tag(page, 'name', 'viewport')
        metadata['charset'] = await self._get_charset(page)
        metadata['language'] = await self._get_language(page)
        
        # Open Graph tags
        metadata['open_graph'] = await self._extract_open_graph(page)
        
        # Twitter Card tags
        metadata['twitter_card'] = await self._extract_twitter_card(page)
        
        # JSON-LD structured data
        metadata['json_ld'] = await self._extract_json_ld(page)
        
        # Icons
        metadata['icons'] = await self._extract_icons(page, url)
        
        # Hreflang tags
        metadata['hreflang'] = await self._extract_hreflang(page)
        
        # Robots.txt and Sitemap
        metadata['robots_txt_url'] = self._get_robots_url(url)
        metadata['sitemap_xml_url'] = self._get_sitemap_url(url)
        
        # Additional meta tags
        metadata['additional_meta'] = await self._extract_additional_meta(page)
        
        return metadata
    
    async def _get_meta_tag(self, page: Page, attr: str, value: str) -> Optional[str]:
        """Get content of a meta tag"""
        try:
            element = await page.query_selector(f'meta[{attr}="{value}"]')
            if element:
                return await element.get_attribute('content')
        except Exception as e:
            logger.debug(f"Error getting meta tag {attr}={value}: {e}")
        return None
    
    async def _get_link_tag(self, page: Page, attr: str, value: str) -> Optional[str]:
        """Get href of a link tag"""
        try:
            element = await page.query_selector(f'link[{attr}="{value}"]')
            if element:
                return await element.get_attribute('href')
        except Exception as e:
            logger.debug(f"Error getting link tag {attr}={value}: {e}")
        return None
    
    async def _get_charset(self, page: Page) -> Optional[str]:
        """Get page charset"""
        try:
            element = await page.query_selector('meta[charset]')
            if element:
                return await element.get_attribute('charset')
            # Try http-equiv
            element = await page.query_selector('meta[http-equiv="Content-Type"]')
            if element:
                content = await element.get_attribute('content')
                if content and 'charset=' in content:
                    return content.split('charset=')[-1].strip()
        except Exception as e:
            logger.debug(f"Error getting charset: {e}")
        return None
    
    async def _get_language(self, page: Page) -> Optional[str]:
        """Get page language"""
        try:
            return await page.evaluate('() => document.documentElement.lang')
        except Exception as e:
            logger.debug(f"Error getting language: {e}")
        return None
    
    async def _extract_open_graph(self, page: Page) -> Dict[str, Any]:
        """Extract all Open Graph meta tags"""
        og_data = {}
        try:
            og_tags = await page.query_selector_all('meta[property^="og:"]')
            for tag in og_tags:
                property_name = await tag.get_attribute('property')
                content = await tag.get_attribute('content')
                if property_name and content:
                    # Remove 'og:' prefix for cleaner keys
                    key = property_name.replace('og:', '')
                    og_data[key] = content
        except Exception as e:
            logger.error(f"Error extracting Open Graph tags: {e}")
        return og_data
    
    async def _extract_twitter_card(self, page: Page) -> Dict[str, Any]:
        """Extract all Twitter Card meta tags"""
        twitter_data = {}
        try:
            twitter_tags = await page.query_selector_all('meta[name^="twitter:"]')
            for tag in twitter_tags:
                name = await tag.get_attribute('name')
                content = await tag.get_attribute('content')
                if name and content:
                    # Remove 'twitter:' prefix for cleaner keys
                    key = name.replace('twitter:', '')
                    twitter_data[key] = content
        except Exception as e:
            logger.error(f"Error extracting Twitter Card tags: {e}")
        return twitter_data
    
    async def _extract_json_ld(self, page: Page) -> List[Dict[str, Any]]:
        """Extract all JSON-LD structured data"""
        json_ld_data = []
        try:
            scripts = await page.query_selector_all('script[type="application/ld+json"]')
            for script in scripts:
                content = await script.inner_text()
                if content:
                    try:
                        data = json.loads(content)
                        json_ld_data.append(data)
                    except json.JSONDecodeError as e:
                        logger.warning(f"Invalid JSON-LD: {e}")
        except Exception as e:
            logger.error(f"Error extracting JSON-LD: {e}")
        return json_ld_data
    
    async def _extract_icons(self, page: Page, base_url: str) -> Dict[str, Any]:
        """Extract favicon and other icon URLs"""
        icons = {}
        try:
            # Favicon
            favicon = await page.query_selector('link[rel="icon"]')
            if not favicon:
                favicon = await page.query_selector('link[rel="shortcut icon"]')
            if favicon:
                href = await favicon.get_attribute('href')
                if href:
                    icons['favicon'] = urljoin(base_url, href)
            else:
                # Default favicon location
                icons['favicon'] = urljoin(base_url, '/favicon.ico')
            
            # Apple touch icons
            apple_icons = await page.query_selector_all('link[rel="apple-touch-icon"]')
            apple_icon_list = []
            for icon in apple_icons:
                href = await icon.get_attribute('href')
                sizes = await icon.get_attribute('sizes')
                if href:
                    apple_icon_list.append({
                        'url': urljoin(base_url, href),
                        'sizes': sizes
                    })
            if apple_icon_list:
                icons['apple_touch_icons'] = apple_icon_list
            
            # Other icons
            other_icons = await page.query_selector_all('link[rel*="icon"]')
            other_icon_list = []
            for icon in other_icons:
                rel = await icon.get_attribute('rel')
                if rel not in ['icon', 'shortcut icon', 'apple-touch-icon']:
                    href = await icon.get_attribute('href')
                    if href:
                        other_icon_list.append({
                            'rel': rel,
                            'url': urljoin(base_url, href)
                        })
            if other_icon_list:
                icons['other_icons'] = other_icon_list
                
        except Exception as e:
            logger.error(f"Error extracting icons: {e}")
        return icons
    
    async def _extract_hreflang(self, page: Page) -> List[Dict[str, str]]:
        """Extract hreflang alternate language tags"""
        hreflang_data = []
        try:
            hreflang_tags = await page.query_selector_all('link[rel="alternate"][hreflang]')
            for tag in hreflang_tags:
                hreflang = await tag.get_attribute('hreflang')
                href = await tag.get_attribute('href')
                if hreflang and href:
                    hreflang_data.append({
                        'language': hreflang,
                        'url': href
                    })
        except Exception as e:
            logger.error(f"Error extracting hreflang: {e}")
        return hreflang_data
    
    async def _extract_additional_meta(self, page: Page) -> Dict[str, Any]:
        """Extract other important meta tags"""
        additional = {}
        try:
            # Author
            author = await self._get_meta_tag(page, 'name', 'author')
            if author:
                additional['author'] = author
            
            # Publisher
            publisher = await self._get_meta_tag(page, 'name', 'publisher')
            if publisher:
                additional['publisher'] = publisher
            
            # Theme color
            theme_color = await self._get_meta_tag(page, 'name', 'theme-color')
            if theme_color:
                additional['theme_color'] = theme_color
            
            # Application name
            app_name = await self._get_meta_tag(page, 'name', 'application-name')
            if app_name:
                additional['application_name'] = app_name
            
            # Generator
            generator = await self._get_meta_tag(page, 'name', 'generator')
            if generator:
                additional['generator'] = generator
            
            # Rating
            rating = await self._get_meta_tag(page, 'name', 'rating')
            if rating:
                additional['rating'] = rating
                
        except Exception as e:
            logger.error(f"Error extracting additional meta: {e}")
        return additional
    
    async def _extract_headings(self, page: Page) -> Dict[str, List[str]]:
        """Extract all heading tags (H1-H6)"""
        headings = {}
        try:
            for level in range(1, 7):
                tag = f'h{level}'
                elements = await page.query_selector_all(tag)
                texts = []
                for element in elements:
                    text = await element.inner_text()
                    if text.strip():
                        texts.append(text.strip())
                if texts:
                    headings[tag] = texts
        except Exception as e:
            logger.error(f"Error extracting headings: {e}")
        return headings
    
    async def _extract_image_metadata(self, page: Page, base_url: str) -> Dict[str, Any]:
        """Extract image metadata and statistics"""
        image_data = {
            'total_images': 0,
            'images_with_alt': 0,
            'images_without_alt': 0,
            'sample_images': []
        }
        try:
            images = await page.query_selector_all('img')
            image_data['total_images'] = len(images)
            
            for img in images[:10]:  # Sample first 10 images
                src = await img.get_attribute('src')
                alt = await img.get_attribute('alt')
                title = await img.get_attribute('title')
                
                if alt:
                    image_data['images_with_alt'] += 1
                else:
                    image_data['images_without_alt'] += 1
                
                if src:
                    image_data['sample_images'].append({
                        'src': urljoin(base_url, src),
                        'alt': alt or '',
                        'title': title or ''
                    })
            
            # Count remaining images for alt stats
            for img in images[10:]:
                alt = await img.get_attribute('alt')
                if alt:
                    image_data['images_with_alt'] += 1
                else:
                    image_data['images_without_alt'] += 1
                    
        except Exception as e:
            logger.error(f"Error extracting image metadata: {e}")
        return image_data
    
    async def _extract_links(self, page: Page, base_url: str) -> Dict[str, Any]:
        """Extract and categorize links (internal/external)"""
        link_data = {
            'total_links': 0,
            'internal_links': 0,
            'external_links': 0,
            'sample_links': []
        }
        try:
            base_domain = urlparse(base_url).netloc
            links = await page.query_selector_all('a[href]')
            link_data['total_links'] = len(links)
            
            for link in links[:20]:  # Sample first 20 links
                href = await link.get_attribute('href')
                text = await link.inner_text()
                
                if href:
                    absolute_url = urljoin(base_url, href)
                    link_domain = urlparse(absolute_url).netloc
                    
                    is_internal = link_domain == base_domain or link_domain == ''
                    
                    if is_internal:
                        link_data['internal_links'] += 1
                    else:
                        link_data['external_links'] += 1
                    
                    link_data['sample_links'].append({
                        'url': absolute_url,
                        'text': text.strip() if text else '',
                        'type': 'internal' if is_internal else 'external'
                    })
            
            # Count remaining links
            for link in links[20:]:
                href = await link.get_attribute('href')
                if href:
                    absolute_url = urljoin(base_url, href)
                    link_domain = urlparse(absolute_url).netloc
                    is_internal = link_domain == base_domain or link_domain == ''
                    
                    if is_internal:
                        link_data['internal_links'] += 1
                    else:
                        link_data['external_links'] += 1
                        
        except Exception as e:
            logger.error(f"Error extracting links: {e}")
        return link_data
    
    def _get_robots_url(self, url: str) -> str:
        """Get robots.txt URL for the domain"""
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    
    def _get_sitemap_url(self, url: str) -> str:
        """Get sitemap.xml URL for the domain"""
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}/sitemap.xml"
    
    def _get_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        from datetime import datetime
        return datetime.utcnow().isoformat() + 'Z'
