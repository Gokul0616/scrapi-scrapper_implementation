import asyncio
import sys
sys.path.append('/app/backend')

from indeed_jobs_scraper_v2 import IndeedJobsScraperV2
from scraper_engine import ScraperEngine

async def test_indeed_v2():
    print("🔍 Testing Indeed Jobs Scraper V2 (Enhanced Anti-Bot)...")
    
    engine = ScraperEngine()
    await engine.initialize()
    
    scraper = IndeedJobsScraperV2(engine)
    
    config = {
        'keyword': 'python developer',
        'location': 'tamilnadu',
        'max_pages': 1
    }
    
    print(f"\n📋 Config: {config}")
    print("\n🚀 Starting scrape with advanced anti-bot bypass...\n")
    
    try:
        results = await scraper.scrape(config, progress_callback=lambda msg: print(f"  {msg}"))
        print(f"\n✅ Scrape completed!")
        print(f"📊 Total jobs found: {len(results)}")
        
        if results:
            print(f"\n📝 Sample jobs:")
            for i, job in enumerate(results[:3], 1):
                print(f"\n  Job {i}:")
                print(f"    - Title: {job.get('jobTitle', 'N/A')}")
                print(f"    - Company: {job.get('company', 'N/A')}")
                print(f"    - Location: {job.get('location', 'N/A')}")
                print(f"    - Salary: {job.get('salary', 'N/A')}")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.cleanup()
        print("\n🔚 Test complete")

if __name__ == "__main__":
    asyncio.run(test_indeed_v2())
