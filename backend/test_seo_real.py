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
        
        urls_to_test = [
            "https://www.google.com",
            "https://github.com",
            "https://www.python.org"
        ]
        
        print("\n" + "="*50)
        print("SEO METADATA SCRAPER - REAL WORLD TEST")
        print("="*50 + "\n")
        
        for url in urls_to_test:
            print(f"\nTesting URL: {url}")
            print("-" * 30)
            
            config = {
                "url": url,
                "extract_headings": True,
                "extract_images": True,
                "extract_links": True
            }
            
            # Progress callback to see what's happening
            async def report_progress(msg):
                print(f"  [Progress] {msg}")
            
            results = await scraper.scrape(config, progress_callback=report_progress)
            
            if results and not results[0].get('error'):
                data = results[0]
                print(f"\n✅ SUCCESS!")
                print(f"   Status Code: {data.get('status_code')}")
                print(f"   Title: {data.get('title')}")
                print(f"   Description: {data.get('meta_description')}")
                print(f"   Canonical: {data.get('canonical')}")
                
                og = data.get('open_graph', {})
                print(f"   Open Graph: {len(og)} tags")
                if og:
                    print(f"     - Title: {og.get('title', 'N/A')}")
                    print(f"     - Type: {og.get('type', 'N/A')}")
                
                twitter = data.get('twitter_card', {})
                print(f"   Twitter Card: {len(twitter)} tags")
                
                json_ld = data.get('json_ld', [])
                print(f"   JSON-LD: {len(json_ld)} schemas")
                if json_ld:
                    print(f"     - Types: {[item.get('@type') for item in json_ld if isinstance(item, dict) and '@type' in item]}")
                
                headings = data.get('headings', {})
                total_headings = sum(len(h) for h in headings.values())
                print(f"   Headings: {total_headings} total (H1: {len(headings.get('h1', []))})")
                
                images = data.get('images', {})
                print(f"   Images: {images.get('total_images')} total ({images.get('images_without_alt')} without alt)")
                
                links = data.get('links', {})
                print(f"   Links: {links.get('total_links')} total ({links.get('internal_links')} internal, {links.get('external_links')} external)")
                
                # Check for icons
                icons = data.get('icons', {})
                print(f"   Icons: Favicon found? {'Yes' if icons.get('favicon') else 'No'}")
                
                # Validate output structure vs Apify-like expectation
                required_fields = ['url', 'title', 'meta_description', 'canonical', 'open_graph', 'twitter_card', 'json_ld']
                missing = [f for f in required_fields if f not in data]
                if missing:
                    print(f"   ⚠️ MISSING APIFY-LIKE FIELDS: {missing}")
                else:
                    print(f"   ✅ All core Apify-like fields present")
                
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
