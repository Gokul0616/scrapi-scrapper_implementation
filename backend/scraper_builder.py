"""
Visual Scraper Builder Engine
Handles field extraction, CSS/XPath parsing, and test runs
"""
import asyncio
import logging
import re
from typing import List, Dict, Any, Optional
from playwright.async_api import async_playwright, Page, Browser
from models import ScraperField, ScraperConfig, PaginationConfig

logger = logging.getLogger(__name__)

class ScraperBuilderEngine:
    """Engine for building and testing custom scrapers"""
    
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.playwright = None
    
    async def initialize(self):
        """Initialize Playwright browser"""
        if not self.browser:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled'
                ]
            )
            logger.info("✅ Scraper builder browser initialized")
    
    async def cleanup(self):
        """Cleanup browser resources"""
        if self.browser:
            await self.browser.close()
            await self.playwright.stop()
            self.browser = None
            self.playwright = None
            logger.info("🧹 Scraper builder browser cleaned up")
    
    async def test_selector(self, url: str, selector: str, selector_type: str = "css") -> Dict[str, Any]:
        """
        Test a CSS or XPath selector on a URL
        Returns extracted data and element count
        """
        await self.initialize()
        
        context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        
        # Add cookies if provided in config
        if config.cookies:
            try:
                await context.add_cookies(config.cookies)
                logger.info(f"✅ Added {len(config.cookies)} cookies to scraper context")
            except Exception as e:
                logger.warning(f"⚠️ Error adding cookies: {e}")
        
        page = await context.new_page()
        
        try:
            # Navigate to URL
            await page.goto(url, wait_until='domcontentloaded', timeout=30000)
            await page.wait_for_timeout(2000)  # Wait for dynamic content
            
            # Extract elements based on selector type
            if selector_type == "css":
                elements = await page.query_selector_all(selector)
            else:  # xpath
                elements = await page.locator(f"xpath={selector}").all()
            
            # Extract text from first 5 elements as samples
            samples = []
            for i, elem in enumerate(elements[:5]):
                try:
                    text = await elem.text_content()
                    html = await elem.inner_html()
                    samples.append({
                        'index': i,
                        'text': text.strip() if text else '',
                        'html': html[:200] if html else ''  # First 200 chars
                    })
                except:
                    pass
            
            return {
                'success': True,
                'count': len(elements),
                'samples': samples,
                'selector': selector,
                'selector_type': selector_type
            }
            
        except Exception as e:
            logger.error(f"❌ Error testing selector: {e}")
            return {
                'success': False,
                'error': str(e),
                'count': 0,
                'samples': []
            }
        finally:
            await context.close()
    
    async def extract_field(self, page: Page, field: ScraperField) -> Any:
        """Extract a single field from a page"""
        try:
            # Get elements
            if field.selector_type == "css":
                if field.multiple:
                    elements = await page.query_selector_all(field.selector)
                else:
                    element = await page.query_selector(field.selector)
                    elements = [element] if element else []
            else:  # xpath
                locator = page.locator(f"xpath={field.selector}")
                count = await locator.count()
                if field.multiple:
                    elements = await locator.all()
                else:
                    elements = [await locator.first()] if count > 0 else []
            
            if not elements:
                return field.default_value if field.default_value else ([] if field.multiple else None)
            
            # Extract values based on type
            values = []
            for elem in elements:
                if not elem:
                    continue
                    
                if field.extract_type == "text":
                    value = await elem.text_content()
                    value = value.strip() if value else ""
                    
                elif field.extract_type == "html":
                    value = await elem.inner_html()
                    
                elif field.extract_type == "attribute":
                    if field.attribute:
                        value = await elem.get_attribute(field.attribute)
                    else:
                        value = ""
                        
                elif field.extract_type == "link":
                    value = await elem.get_attribute("href")
                    if value and not value.startswith("http"):
                        # Convert relative to absolute URL
                        base_url = page.url
                        value = f"{base_url.rstrip('/')}/{value.lstrip('/')}"
                        
                elif field.extract_type == "image":
                    value = await elem.get_attribute("src")
                else:
                    value = await elem.text_content()
                
                # Apply transformations
                if field.transform and value:
                    value = self._apply_transform(value, field.transform)
                
                values.append(value)
            
            # Return based on multiple flag
            if field.multiple:
                return values
            else:
                return values[0] if values else (field.default_value or None)
                
        except Exception as e:
            logger.error(f"❌ Error extracting field {field.name}: {e}")
            return field.default_value if field.default_value else ([] if field.multiple else None)
    
    def _apply_transform(self, value: str, transform: str) -> str:
        """Apply transformation to extracted value"""
        if transform == "clean":
            # Remove extra whitespace
            return re.sub(r'\s+', ' ', value).strip()
        
        elif transform == "number":
            # Extract numbers only
            numbers = re.findall(r'\d+\.?\d*', value)
            return numbers[0] if numbers else value
        
        elif transform.startswith("regex:"):
            # Apply regex pattern
            pattern = transform.replace("regex:", "")
            match = re.search(pattern, value)
            return match.group(0) if match else value
        
        elif transform == "lowercase":
            return value.lower()
        
        elif transform == "uppercase":
            return value.upper()
        
        return value
    
    async def test_scraper(self, url: str, fields: List[ScraperField], use_browser: bool = True, 
                          wait_for_selector: Optional[str] = None) -> Dict[str, Any]:
        """
        Test complete scraper configuration on a single URL
        Returns extracted data
        """
        await self.initialize()
        
        context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        
        # Add cookies if provided in config
        if config.cookies:
            try:
                await context.add_cookies(config.cookies)
                logger.info(f"✅ Added {len(config.cookies)} cookies to scraper context")
            except Exception as e:
                logger.warning(f"⚠️ Error adding cookies: {e}")
        
        page = await context.new_page()
        
        try:
            # Navigate to URL
            logger.info(f"🔍 Testing scraper on: {url}")
            await page.goto(url, wait_until='domcontentloaded', timeout=30000)
            
            # Wait for specific selector if provided
            if wait_for_selector:
                try:
                    await page.wait_for_selector(wait_for_selector, timeout=10000)
                except:
                    logger.warning(f"⚠️ Wait selector not found: {wait_for_selector}")
            
            await page.wait_for_timeout(2000)  # Wait for dynamic content
            
            # Extract all fields
            result = {}
            for field in fields:
                result[field.name] = await self.extract_field(page, field)
                logger.info(f"✅ Extracted {field.name}: {result[field.name]}")
            
            return {
                'success': True,
                'url': url,
                'data': result,
                'fields_extracted': len(result)
            }
            
        except Exception as e:
            logger.error(f"❌ Error testing scraper: {e}")
            return {
                'success': False,
                'error': str(e),
                'url': url,
                'data': {}
            }
        finally:
            await context.close()
    
    async def run_scraper(self, config: ScraperConfig) -> List[Dict[str, Any]]:
        """
        Run complete scraper with pagination support
        Returns list of scraped items
        """
        await self.initialize()
        
        all_results = []
        pages_scraped = 0
        
        context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        
        # Add cookies if provided in config
        if config.cookies:
            try:
                await context.add_cookies(config.cookies)
                logger.info(f"✅ Added {len(config.cookies)} cookies to scraper context")
            except Exception as e:
                logger.warning(f"⚠️ Error adding cookies: {e}")
        
        page = await context.new_page()
        
        try:
            for start_url in config.start_urls:
                current_url = start_url
                
                while pages_scraped < config.max_pages:
                    logger.info(f"🔍 Scraping page {pages_scraped + 1}: {current_url}")
                    
                    # Navigate to page
                    await page.goto(current_url, wait_until='domcontentloaded', timeout=config.wait_timeout)
                    
                    if config.wait_for_selector:
                        try:
                            await page.wait_for_selector(config.wait_for_selector, timeout=10000)
                        except:
                            logger.warning(f"⚠️ Wait selector not found: {config.wait_for_selector}")
                    
                    await page.wait_for_timeout(config.delay_between_pages)
                    
                    # Extract all fields
                    result = {}
                    for field in config.fields:
                        result[field.name] = await self.extract_field(page, field)
                    
                    all_results.append(result)
                    pages_scraped += 1
                    
                    # Check max items
                    if config.max_items and len(all_results) >= config.max_items:
                        logger.info(f"✅ Reached max items: {config.max_items}")
                        break
                    
                    # Handle pagination
                    if not config.pagination.enabled or pages_scraped >= config.pagination.max_pages:
                        break
                    
                    # Try to navigate to next page
                    try:
                        if config.pagination.type == "next_button" and config.pagination.next_selector:
                            next_button = await page.query_selector(config.pagination.next_selector)
                            if next_button:
                                await next_button.click()
                                await page.wait_for_timeout(config.pagination.wait_after_load)
                                current_url = page.url
                            else:
                                logger.info("✅ No more pages (next button not found)")
                                break
                        else:
                            # No pagination support for now
                            break
                    except Exception as e:
                        logger.warning(f"⚠️ Pagination error: {e}")
                        break
            
            logger.info(f"🎉 Scraping complete! Extracted {len(all_results)} items from {pages_scraped} pages")
            return all_results
            
        except Exception as e:
            logger.error(f"❌ Error running scraper: {e}")
            return all_results
        finally:
            await context.close()
    
    async def generate_css_selector(self, page: Page, element_text: str) -> Optional[str]:
        """
        Generate CSS selector for an element based on its text content
        (Helper for click-to-select feature)
        """
        # This would be implemented on frontend with injected script
        # Backend receives the selector from frontend
        pass

# Global instance
scraper_builder = ScraperBuilderEngine()
