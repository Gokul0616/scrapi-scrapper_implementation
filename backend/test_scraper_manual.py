import asyncio
import logging
import sys
import os

# Add backend directory to path
sys.path.append('/app/backend')

from scrapers.googlemap.google_maps_scraper_v3 import GoogleMapsScraperV3
from scrapers.scraper_engine import ScraperEngine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_scraper():
    logger.info("Starting scraper test...")
    
    # Mock ScraperEngine
    class MockEngine:
        async def create_context(self, use_proxy=False):
            from playwright.async_api import async_playwright
            p = await async_playwright().start()
            browser = await p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
            return await browser.new_context()

    engine = MockEngine()
    scraper = GoogleMapsScraperV3(engine)
    
    config = {
        "search_terms": ["saloon"],
        "location": "Chennai",
        "max_results": 5,
        "extract_reviews": False,
        "extract_images": False
    }
    
    async def progress(msg):
        print(f"PROGRESS: {msg}")
        
    results = await scraper.scrape(config, progress_callback=progress)
    
    print("\n\n=== RESULTS ===")
    for r in results:
        print(f"Title: {r.get('title')}")
        print(f"Address: {r.get('address')}")
        print(f"Phone: {r.get('phone')}")
        print(f"Rating: {r.get('rating')}")
        print("-" * 20)
        
    logger.info("Test complete")

if __name__ == "__main__":
    asyncio.run(test_scraper())
