import asyncio
import sys
sys.path.append('/app/backend')

from indeed_jobs_scraper import IndeedJobsScraper
from scraper_engine import ScraperEngine

async def test_indeed():
    print("🔍 Testing Indeed Jobs Scraper...")
    
    # Create scraper engine
    engine = ScraperEngine()
    await engine.initialize()
    
    # Create Indeed scraper
    scraper = IndeedJobsScraper(engine)
    
    # Test configuration
    config = {
        'keyword': 'python developer',
        'location': 'tamilnadu',
        'max_pages': 1
    }
    
    print(f"\n📋 Config: {config}")
    print("\n🚀 Starting scrape...\n")
    
    try:
        results = await scraper.scrape(config, progress_callback=lambda msg: print(f"  {msg}"))
        print(f"\n✅ Scrape completed!")
        print(f"📊 Total jobs found: {len(results)}")
        
        if results:
            print(f"\n📝 First job sample:")
            first_job = results[0]
            for key, value in first_job.items():
                if key != '#debug':
                    print(f"  - {key}: {value}")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.cleanup()
        print("\n🔚 Test complete")

if __name__ == "__main__":
    asyncio.run(test_indeed())
