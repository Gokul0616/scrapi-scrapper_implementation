
import asyncio
import logging
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_test():
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        
        page = await context.new_page()
        
        # Test Search
        keyword = "laptop"
        search_url = f"https://www.amazon.com/s?k={keyword}"
        logger.info(f"Navigating to {search_url}")
        
        try:
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(5000) # Wait for dynamic content
            
            # Check for CAPTCHA
            content = await page.content()
            if "api-services-support@amazon.com" in content or "Enter the characters you see below" in content:
                logger.error("CAPTCHA DETECTED!")
                await page.screenshot(path="amazon_captcha.png")
            else:
                logger.info("No CAPTCHA detected immediately.")
                await page.screenshot(path="amazon_search.png")
            
            # Parse results
            soup = BeautifulSoup(content, 'html.parser')
            product_divs = soup.find_all('div', {'data-asin': True})
            
            valid_asins = []
            for div in product_divs:
                asin = div.get('data-asin')
                if asin and len(asin) == 10:
                    valid_asins.append(asin)
            
            logger.info(f"Found {len(product_divs)} product divs")
            logger.info(f"Found {len(valid_asins)} valid ASINs: {valid_asins[:5]}")
            
            if not valid_asins:
                logger.warning("No ASINs found. Dumping HTML structure...")
                # Log first 500 characters of body to see what we got
                body = soup.find('body')
                if body:
                    logger.info(f"Body content start: {body.text[:500]}")
                    
        except Exception as e:
            logger.error(f"Error: {e}")
            await page.screenshot(path="amazon_error.png")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_test())
