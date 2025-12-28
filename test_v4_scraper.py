#!/usr/bin/env python3
"""
Test script to verify Google Maps Scraper V4 is registered and working.
"""
import sys
sys.path.insert(0, '/app/backend')

from scrapers import get_scraper_registry, ScraperEngine
import asyncio

async def test_v4_scraper():
    print("=" * 60)
    print("Testing Google Maps Scraper V4 Registration")
    print("=" * 60)
    
    # Get registry
    registry = get_scraper_registry()
    
    # List all scrapers
    print("\n📋 Registered Scrapers:")
    print("-" * 60)
    scrapers = registry.list_scrapers()
    for i, scraper in enumerate(scrapers, 1):
        print(f"{i}. {scraper['name']}")
        print(f"   Category: {scraper['category']}")
        print(f"   Icon: {scraper['icon']}")
        print(f"   Description: {scraper['description'][:60]}...")
        print()
    
    # Check if V4 is registered
    print("\n🔍 Checking for Google Maps Scraper V4...")
    print("-" * 60)
    v4_name = "Google Maps Scraper V4 (Crawlee)"
    
    if registry.is_registered(v4_name):
        print(f"✅ SUCCESS: '{v4_name}' is registered!")
        
        # Get scraper info
        info = registry.get_scraper_info(v4_name)
        if info:
            print(f"\n📊 Scraper Details:")
            print(f"   Name: {info['name']}")
            print(f"   Category: {info['category']}")
            print(f"   Icon: {info['icon']}")
            print(f"   Tags: {', '.join(info['tags'])}")
            print(f"   Premium: {info['is_premium']}")
            print(f"\n   Input Schema Keys: {', '.join(info['input_schema'].keys())}")
            print(f"   Output Schema Keys: {', '.join(info['output_schema'].keys())}")
        
        # Try to instantiate
        print(f"\n🔧 Attempting to instantiate scraper...")
        engine = ScraperEngine()
        scraper = registry.get_scraper(v4_name, engine)
        
        if scraper:
            print(f"✅ Successfully instantiated: {type(scraper).__name__}")
            print(f"   Scraper name: {scraper.name}")
            print(f"   Description: {scraper.description}")
        else:
            print(f"❌ Failed to instantiate scraper")
    else:
        print(f"❌ FAILED: '{v4_name}' is NOT registered!")
        print(f"\nAvailable scrapers:")
        for scraper in scrapers:
            print(f"  - {scraper['name']}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(test_v4_scraper())
