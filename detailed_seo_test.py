#!/usr/bin/env python3
"""
Detailed SEO Metadata Scraper Test for xploanimation.com
Shows comprehensive results of what was extracted
"""

import asyncio
import aiohttp
import json
import sys
import time
from typing import Dict, Any

class DetailedSEOTest:
    def __init__(self):
        self.base_url = "https://devops-setup.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.session = None
        self.auth_token = None
    
    async def setup_session(self):
        """Setup HTTP session and authenticate"""
        self.session = aiohttp.ClientSession()
        
        # Use provided test credentials
        auth_data = {
            "username": "test@gmail.com",
            "password": "test123"
        }
        
        try:
            async with self.session.post(f"{self.api_url}/auth/login", json=auth_data) as response:
                if response.status == 200:
                    data = await response.json()
                    self.auth_token = data['access_token']
                    print(f"✅ Authentication successful with test@gmail.com")
                    return True
                else:
                    print(f"❌ Authentication failed: {response.status}")
                    return False
        except Exception as e:
            print(f"❌ Authentication error: {e}")
            return False
    
    def get_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    async def get_seo_actor(self):
        """Get SEO Metadata Scraper actor"""
        async with self.session.get(f"{self.api_url}/actors", headers=self.get_headers()) as response:
            if response.status == 200:
                actors = await response.json()
                for actor in actors:
                    if actor.get('name') == 'SEO Metadata Scraper':
                        return actor
        return None
    
    async def create_and_run_seo_test(self):
        """Create and execute SEO scraping run for xploanimation.com"""
        print("\n🚀 Testing SEO Metadata Scraper with https://xploanimation.com/")
        print("=" * 80)
        
        # Get SEO actor
        seo_actor = await self.get_seo_actor()
        if not seo_actor:
            print("❌ SEO Metadata Scraper actor not found")
            return None
        
        print(f"✅ Found SEO Metadata Scraper actor: {seo_actor.get('id')}")
        
        # Create run with comprehensive extraction
        run_data = {
            "actor_id": seo_actor.get('id'),
            "input_data": {
                "url": "https://xploanimation.com/",
                "extract_headings": True,
                "extract_images": True,
                "extract_links": True
            }
        }
        
        print(f"\n📡 Creating scraping run...")
        async with self.session.post(f"{self.api_url}/runs", json=run_data, headers=self.get_headers()) as response:
            if response.status != 200:
                print(f"❌ Failed to create run: {response.status}")
                return None
            
            run = await response.json()
            run_id = run.get('id')
            print(f"✅ Run created: {run_id}")
        
        # Wait for completion
        print(f"\n⏳ Waiting for run to complete...")
        start_time = time.time()
        
        while time.time() - start_time < 300:  # 5 minute timeout
            async with self.session.get(f"{self.api_url}/runs/{run_id}", headers=self.get_headers()) as response:
                if response.status == 200:
                    run_status = await response.json()
                    status = run_status.get('status')
                    
                    if status == 'succeeded':
                        duration = time.time() - start_time
                        print(f"✅ Run completed successfully in {duration:.1f} seconds")
                        break
                    elif status == 'failed':
                        print(f"❌ Run failed")
                        return None
                    else:
                        print(f"   Status: {status}")
                        await asyncio.sleep(5)
                else:
                    print(f"❌ Error checking run status: {response.status}")
                    return None
        else:
            print(f"❌ Run timed out")
            return None
        
        # Get results
        print(f"\n📊 Retrieving scraped data...")
        async with self.session.get(f"{self.api_url}/datasets/{run_id}/items", headers=self.get_headers()) as response:
            if response.status == 200:
                dataset = await response.json()
                return dataset
            else:
                print(f"❌ Failed to get dataset: {response.status}")
                return None
    
    def analyze_seo_data(self, dataset):
        """Analyze and display comprehensive SEO data"""
        if not dataset or 'items' not in dataset:
            print("❌ No dataset items found")
            return
        
        items = dataset['items']
        if not items:
            print("❌ No items in dataset")
            return
        
        # Get the first (and should be only) item
        item = items[0]
        if 'data' not in item:
            print("❌ No data field in item")
            return
        
        seo_data = item['data']
        
        print(f"\n🎯 COMPREHENSIVE SEO ANALYSIS FOR XPLOANIMATION.COM")
        print("=" * 80)
        
        # Basic SEO Information
        print(f"\n📄 BASIC SEO INFORMATION:")
        print(f"   URL: {seo_data.get('url')}")
        print(f"   Status Code: {seo_data.get('status_code')}")
        print(f"   Title: {seo_data.get('title')}")
        print(f"   Meta Description: {seo_data.get('meta_description') or 'Not found'}")
        print(f"   Meta Keywords: {seo_data.get('meta_keywords') or 'Not found'}")
        print(f"   Canonical URL: {seo_data.get('canonical') or 'Not found'}")
        print(f"   Meta Robots: {seo_data.get('meta_robots') or 'Not found'}")
        print(f"   Viewport: {seo_data.get('viewport') or 'Not found'}")
        print(f"   Charset: {seo_data.get('charset') or 'Not found'}")
        print(f"   Language: {seo_data.get('language') or 'Not found'}")
        
        # Open Graph Tags
        og_data = seo_data.get('open_graph', {})
        print(f"\n🌐 OPEN GRAPH TAGS:")
        if og_data:
            for key, value in og_data.items():
                print(f"   og:{key}: {value}")
        else:
            print("   ⚠️ No Open Graph tags found")
        
        # Twitter Card Tags
        twitter_data = seo_data.get('twitter_card', {})
        print(f"\n🐦 TWITTER CARD TAGS:")
        if twitter_data:
            for key, value in twitter_data.items():
                print(f"   twitter:{key}: {value}")
        else:
            print("   ⚠️ No Twitter Card tags found")
        
        # JSON-LD Structured Data
        json_ld = seo_data.get('json_ld', [])
        print(f"\n📊 JSON-LD STRUCTURED DATA:")
        if json_ld:
            for i, obj in enumerate(json_ld, 1):
                obj_type = obj.get('@type', 'Unknown') if isinstance(obj, dict) else 'Unknown'
                print(f"   Object {i}: {obj_type}")
                if isinstance(obj, dict):
                    for key, value in list(obj.items())[:5]:  # Show first 5 properties
                        if key != '@type':
                            print(f"      {key}: {str(value)[:100]}{'...' if len(str(value)) > 100 else ''}")
        else:
            print("   ⚠️ No JSON-LD structured data found")
        
        # Headings Analysis
        headings = seo_data.get('headings', {})
        print(f"\n📝 HEADINGS ANALYSIS:")
        if headings:
            total_headings = sum(len(v) for v in headings.values() if isinstance(v, list))
            print(f"   Total Headings: {total_headings}")
            for level in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                if level in headings:
                    count = len(headings[level])
                    print(f"   {level.upper()}: {count} headings")
                    # Show first few headings
                    for i, heading in enumerate(headings[level][:3]):
                        print(f"      {i+1}. {heading[:80]}{'...' if len(heading) > 80 else ''}")
                    if len(headings[level]) > 3:
                        print(f"      ... and {len(headings[level]) - 3} more")
        else:
            print("   ⚠️ No headings found")
        
        # Icons
        icons = seo_data.get('icons', {})
        print(f"\n🖼️ ICONS:")
        if icons:
            if 'favicon' in icons:
                print(f"   Favicon: {icons['favicon']}")
            if 'apple_touch_icons' in icons:
                apple_icons = icons['apple_touch_icons']
                print(f"   Apple Touch Icons: {len(apple_icons)} found")
                for icon in apple_icons[:3]:
                    print(f"      {icon.get('url')} (sizes: {icon.get('sizes', 'N/A')})")
            if 'other_icons' in icons:
                other_icons = icons['other_icons']
                print(f"   Other Icons: {len(other_icons)} found")
        else:
            print("   ⚠️ No icons found")
        
        # Images Analysis
        images = seo_data.get('images', {})
        print(f"\n📸 IMAGES ANALYSIS:")
        if images:
            total = images.get('total_images', 0)
            with_alt = images.get('images_with_alt', 0)
            without_alt = images.get('images_without_alt', 0)
            samples = images.get('sample_images', [])
            
            print(f"   Total Images: {total}")
            print(f"   Images with Alt Text: {with_alt}")
            print(f"   Images without Alt Text: {without_alt}")
            print(f"   Alt Text Coverage: {(with_alt/total*100):.1f}%" if total > 0 else "N/A")
            
            if samples:
                print(f"   Sample Images:")
                for i, img in enumerate(samples[:5], 1):
                    print(f"      {i}. {img.get('src', 'N/A')}")
                    print(f"         Alt: {img.get('alt', 'No alt text')}")
        else:
            print("   ⚠️ No image analysis data")
        
        # Links Analysis
        links = seo_data.get('links', {})
        print(f"\n🔗 LINKS ANALYSIS:")
        if links:
            total = links.get('total_links', 0)
            internal = links.get('internal_links', 0)
            external = links.get('external_links', 0)
            samples = links.get('sample_links', [])
            
            print(f"   Total Links: {total}")
            print(f"   Internal Links: {internal}")
            print(f"   External Links: {external}")
            print(f"   Internal/External Ratio: {(internal/external):.1f}:1" if external > 0 else "All internal")
            
            if samples:
                print(f"   Sample Links:")
                for i, link in enumerate(samples[:5], 1):
                    link_type = link.get('type', 'unknown')
                    print(f"      {i}. [{link_type.upper()}] {link.get('url', 'N/A')}")
                    print(f"         Text: {link.get('text', 'No text')[:60]}{'...' if len(link.get('text', '')) > 60 else ''}")
        else:
            print("   ⚠️ No links analysis data")
        
        # Technical SEO
        print(f"\n🔧 TECHNICAL SEO:")
        print(f"   Robots.txt URL: {seo_data.get('robots_txt_url')}")
        print(f"   Sitemap URL: {seo_data.get('sitemap_xml_url')}")
        
        # Additional Meta Tags
        additional = seo_data.get('additional_meta', {})
        if additional:
            print(f"   Additional Meta Tags:")
            for key, value in additional.items():
                print(f"      {key}: {value}")
        
        # Hreflang
        hreflang = seo_data.get('hreflang', [])
        if hreflang:
            print(f"   Hreflang Tags: {len(hreflang)} found")
            for tag in hreflang[:3]:
                print(f"      {tag.get('language')}: {tag.get('url')}")
        
        print(f"\n✅ SEO ANALYSIS COMPLETE")
        print("=" * 80)
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()

async def main():
    """Main test execution"""
    print("🔍 DETAILED SEO METADATA SCRAPER TEST")
    print("Testing comprehensive SEO data extraction from https://xploanimation.com/")
    print("=" * 80)
    
    tester = DetailedSEOTest()
    
    try:
        # Setup
        if not await tester.setup_session():
            print("❌ Failed to setup test session")
            return False
        
        # Run test and get results
        dataset = await tester.create_and_run_seo_test()
        if not dataset:
            print("❌ Failed to get dataset")
            return False
        
        # Analyze results
        tester.analyze_seo_data(dataset)
        
        return True
        
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        await tester.cleanup()

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)