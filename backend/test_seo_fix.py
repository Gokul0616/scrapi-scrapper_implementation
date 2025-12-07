import sys
import os
import asyncio
import json
import logging

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scrapers.scraper_engine import ScraperEngine
from scrapers.seo.seo_metadata_scraper import SEOMetadataScraper

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_test():
    engine = ScraperEngine()
    try:
        await engine.initialize()
        
        scraper = SEOMetadataScraper(engine)
        
        # Test case: URL without protocol (the reported issue)
        # Also testing with whitespace to be sure
        urls_to_test = [
            "xploanimation.com",
            "  xploanimation.com  " 
        ]
        
        print("\n" + "="*50)
        print("SEO METADATA SCRAPER - PROTOCOL FIX TEST")
        print("="*50 + "\n")
        
        for url in urls_to_test:
            print(f"\nTesting URL input: '{url}'")
            print("-" * 30)
            
            config = {
                "url": url,
                "extract_headings": True,
                "extract_images": False, # Speed up test
                "extract_links": False   # Speed up test
            }
            
            # Progress callback to see what's happening
            async def report_progress(msg):
                print(f"  [Progress] {msg}")
            
            results = await scraper.scrape(config, progress_callback=report_progress)
            
            if results and not results[0].get('error'):
                data = results[0]
                print(f"\n✅ SUCCESS!")
                print(f"   Final URL: {data.get('url')}")
                print(f"   Status Code: {data.get('status_code')}")
                print(f"   Title: {data.get('title')}")
                
                if data.get('url').startswith('https://'):
                    print("   ✅ Protocol successfully added")
                else:
                    print("   ❌ Protocol NOT added")
                
            else:
                print(f"❌ Failed to scrape {url}")
                if results:
                    print(f"Error: {results[0].get('error')}")
                    
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.cleanup()

if __name__ == "__main__":
    asyncio.run(run_test())
