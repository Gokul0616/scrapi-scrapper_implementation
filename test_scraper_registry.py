"""
Quick test to verify scraper registry and Amazon scraper works
"""
import asyncio
from scraper_engine import ScraperEngine
from scraper_registry import get_scraper_registry

async def test_registry():
    print("=" * 60)
    print("SCRAPER REGISTRY TEST")
    print("=" * 60)
    
    registry = get_scraper_registry()
    
    # List all scrapers
    scrapers = registry.list_scrapers()
    print(f"\n✅ Registered Scrapers: {len(scrapers)}")
    for scraper in scrapers:
        print(f"   📌 {scraper['icon']} {scraper['name']}")
        print(f"      Category: {scraper['category']}")
        print(f"      Tags: {', '.join(scraper['tags'])}")
        print()
    
    # Test Amazon scraper instantiation
    print("\n" + "=" * 60)
    print("AMAZON SCRAPER TEST")
    print("=" * 60)
    
    engine = ScraperEngine()
    amazon_scraper = registry.get_scraper("Amazon Product Scraper", engine)
    
    if amazon_scraper:
        print(f"✅ Amazon scraper instantiated successfully!")
        print(f"   Name: {amazon_scraper.name}")
        print(f"   Description: {amazon_scraper.description}")
        print(f"   Category: {amazon_scraper.category}")
        
        input_schema = amazon_scraper.get_input_schema()
        print(f"\n   Input Schema:")
        for key, value in input_schema.items():
            print(f"      - {key}: {value.get('description', 'No description')}")
        
        output_schema = amazon_scraper.get_output_schema()
        print(f"\n   Output Fields: {len(output_schema)} fields")
        print(f"      - {', '.join(list(output_schema.keys())[:10])}...")
    else:
        print("❌ Failed to instantiate Amazon scraper")
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_registry())
