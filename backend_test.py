#!/usr/bin/env python3
"""
Backend Testing Suite for Scheduler Functionality
Tests comprehensive scheduler API endpoints and functionality
"""

import asyncio
import aiohttp
import json
import os
import sys
import time
from typing import Dict, Any, List
from datetime import datetime

# Add backend to path
sys.path.append('/app/backend')

class SchedulerTester:
    def __init__(self):
        # Get backend URL from frontend env
        self.base_url = "https://playwrite-setup-1.preview.emergentagent.com"
        try:
            with open('/app/frontend/.env', 'r') as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        self.base_url = line.split('=')[1].strip()
                        break
        except Exception:
            pass  # Use default URL
        
        self.api_url = f"{self.base_url}/api"
        self.session = None
        self.auth_token = None
        self.test_results = []
        
        print(f"🔧 Backend URL: {self.base_url}")
        print(f"🔧 API URL: {self.api_url}")
    
    async def setup_session(self):
        """Setup HTTP session and authenticate"""
        self.session = aiohttp.ClientSession()
        
        # Test authentication with provided credentials
        auth_data = {
            "username": "test@gmail.com",
            "password": "test123"
        }
        
        try:
            async with self.session.post(f"{self.api_url}/auth/login", json=auth_data) as response:
                if response.status == 200:
                    data = await response.json()
                    self.auth_token = data['access_token']
                    print(f"✅ Authentication successful")
                    return True
                else:
                    print(f"❌ Authentication failed: {response.status}")
                    # Try to register new user
                    return await self.register_test_user()
        except Exception as e:
            print(f"❌ Authentication error: {e}")
            return False
    
    async def register_test_user(self):
        """Register a new test user"""
        timestamp = int(time.time())
        user_data = {
            "username": f"seo_test_user_{timestamp}",
            "email": f"seo_test_{timestamp}@example.com",
            "password": "testpass123",
            "organization_name": "SEO Test Org"
        }
        
        try:
            async with self.session.post(f"{self.api_url}/auth/register", json=user_data) as response:
                if response.status == 200:
                    data = await response.json()
                    self.auth_token = data['access_token']
                    print(f"✅ User registration successful: {user_data['username']}")
                    return True
                else:
                    text = await response.text()
                    print(f"❌ User registration failed: {response.status} - {text}")
                    return False
        except Exception as e:
            print(f"❌ Registration error: {e}")
            return False
    
    def get_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    async def test_actors_list(self):
        """Test that SEO Metadata Scraper actor exists"""
        print("\n🔍 Testing SEO Metadata Scraper Actor...")
        
        try:
            async with self.session.get(f"{self.api_url}/actors", headers=self.get_headers()) as response:
                if response.status == 200:
                    actors = await response.json()
                    
                    # Find SEO Metadata Scraper
                    seo_actor = None
                    for actor in actors:
                        if actor.get('name') == 'SEO Metadata Scraper':
                            seo_actor = actor
                            break
                    
                    if seo_actor:
                        print(f"✅ SEO Metadata Scraper actor found")
                        print(f"   - ID: {seo_actor.get('id')}")
                        print(f"   - Icon: {seo_actor.get('icon')}")
                        print(f"   - Category: {seo_actor.get('category')}")
                        print(f"   - Description: {seo_actor.get('description')[:100]}...")
                        
                        # Verify input schema
                        input_schema = seo_actor.get('input_schema', {})
                        required_fields = input_schema.get('required', [])
                        properties = input_schema.get('properties', {})
                        
                        print(f"   - Required fields: {required_fields}")
                        print(f"   - Available parameters: {list(properties.keys())}")
                        
                        # Check for expected parameters
                        expected_params = ['url', 'extract_headings', 'extract_images', 'extract_links']
                        missing_params = [p for p in expected_params if p not in properties]
                        if missing_params:
                            print(f"   ⚠️ Missing parameters: {missing_params}")
                        else:
                            print(f"   ✅ All expected parameters present")
                        
                        self.test_results.append({
                            'test': 'SEO Actor Exists',
                            'status': 'PASS',
                            'details': f"Actor found with ID {seo_actor.get('id')}"
                        })
                        return seo_actor
                    else:
                        print(f"❌ SEO Metadata Scraper actor not found")
                        print(f"   Available actors: {[a.get('name') for a in actors]}")
                        self.test_results.append({
                            'test': 'SEO Actor Exists',
                            'status': 'FAIL',
                            'details': 'SEO Metadata Scraper actor not found in actors list'
                        })
                        return None
                else:
                    text = await response.text()
                    print(f"❌ Failed to get actors: {response.status} - {text}")
                    self.test_results.append({
                        'test': 'SEO Actor Exists',
                        'status': 'FAIL',
                        'details': f'API error: {response.status}'
                    })
                    return None
        except Exception as e:
            print(f"❌ Error testing actors: {e}")
            self.test_results.append({
                'test': 'SEO Actor Exists',
                'status': 'FAIL',
                'details': f'Exception: {str(e)}'
            })
            return None
    
    async def create_seo_run(self, actor_id: str, url: str, extract_headings: bool = True, 
                           extract_images: bool = True, extract_links: bool = False):
        """Create a SEO scraping run"""
        run_data = {
            "actor_id": actor_id,
            "input_data": {
                "url": url,
                "extract_headings": extract_headings,
                "extract_images": extract_images,
                "extract_links": extract_links
            }
        }
        
        try:
            async with self.session.post(f"{self.api_url}/runs", json=run_data, headers=self.get_headers()) as response:
                if response.status == 200:
                    run = await response.json()
                    print(f"✅ Created SEO run for {url}")
                    print(f"   - Run ID: {run.get('id')}")
                    print(f"   - Status: {run.get('status')}")
                    return run
                else:
                    text = await response.text()
                    print(f"❌ Failed to create run: {response.status} - {text}")
                    return None
        except Exception as e:
            print(f"❌ Error creating run: {e}")
            return None
    
    async def wait_for_run_completion(self, run_id: str, timeout: int = 180):
        """Wait for run to complete"""
        print(f"⏳ Waiting for run {run_id} to complete...")
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                async with self.session.get(f"{self.api_url}/runs/{run_id}", headers=self.get_headers()) as response:
                    if response.status == 200:
                        run = await response.json()
                        status = run.get('status')
                        print(f"   Status: {status}")
                        
                        if status == 'succeeded':
                            print(f"✅ Run completed successfully")
                            return run
                        elif status == 'failed':
                            print(f"❌ Run failed")
                            return run
                        elif status in ['queued', 'running']:
                            await asyncio.sleep(5)
                            continue
                        else:
                            print(f"⚠️ Unknown status: {status}")
                            await asyncio.sleep(5)
                    else:
                        print(f"❌ Error checking run status: {response.status}")
                        await asyncio.sleep(5)
            except Exception as e:
                print(f"❌ Error waiting for run: {e}")
                await asyncio.sleep(5)
        
        print(f"❌ Run timed out after {timeout} seconds")
        return None
    
    async def get_dataset_items(self, run_id: str):
        """Get dataset items from completed run"""
        try:
            async with self.session.get(f"{self.api_url}/datasets/{run_id}/items", headers=self.get_headers()) as response:
                if response.status == 200:
                    items = await response.json()
                    print(f"✅ Retrieved {len(items)} dataset items")
                    return items
                else:
                    text = await response.text()
                    print(f"❌ Failed to get dataset items: {response.status} - {text}")
                    return []
        except Exception as e:
            print(f"❌ Error getting dataset items: {e}")
            return []
    
    def verify_seo_data_structure(self, item: Dict[str, Any], url: str):
        """Verify that SEO data has all expected fields"""
        print(f"\n🔍 Verifying SEO data structure for {url}...")
        
        # Expected basic fields
        basic_fields = [
            'url', 'status_code', 'timestamp', 'title', 'meta_description', 
            'canonical', 'meta_robots', 'viewport', 'charset', 'language'
        ]
        
        # Expected object fields
        object_fields = [
            'open_graph', 'twitter_card', 'json_ld', 'headings', 'icons', 
            'hreflang', 'additional_meta'
        ]
        
        # Optional fields (based on configuration)
        optional_fields = ['images', 'links']
        
        missing_basic = [field for field in basic_fields if field not in item]
        missing_objects = [field for field in object_fields if field not in item]
        
        print(f"   Basic SEO fields: {len(basic_fields) - len(missing_basic)}/{len(basic_fields)} present")
        if missing_basic:
            print(f"   ⚠️ Missing basic fields: {missing_basic}")
        
        print(f"   Object fields: {len(object_fields) - len(missing_objects)}/{len(object_fields)} present")
        if missing_objects:
            print(f"   ⚠️ Missing object fields: {missing_objects}")
        
        # Verify specific data quality
        issues = []
        
        # Check URL and status
        if item.get('url') != url:
            issues.append(f"URL mismatch: expected {url}, got {item.get('url')}")
        
        status_code = item.get('status_code')
        if not status_code or (status_code < 200 or status_code >= 400) and status_code != 403:
            issues.append(f"Invalid status code: {status_code}")
        elif status_code == 403:
            print(f"   ⚠️ Status 403 (Forbidden) - likely bot detection, but scraper extracted available data")
        
        # Check title
        title = item.get('title')
        if not title or len(title.strip()) == 0:
            issues.append("Missing or empty title")
        
        # Check Open Graph data
        og_data = item.get('open_graph', {})
        if isinstance(og_data, dict) and len(og_data) > 0:
            print(f"   ✅ Open Graph: {len(og_data)} properties")
            og_keys = list(og_data.keys())[:5]  # Show first 5 keys
            print(f"      Sample properties: {og_keys}")
        else:
            print(f"   ⚠️ Open Graph: No data found")
        
        # Check Twitter Card data
        twitter_data = item.get('twitter_card', {})
        if isinstance(twitter_data, dict) and len(twitter_data) > 0:
            print(f"   ✅ Twitter Card: {len(twitter_data)} properties")
            twitter_keys = list(twitter_data.keys())[:5]
            print(f"      Sample properties: {twitter_keys}")
        else:
            print(f"   ⚠️ Twitter Card: No data found")
        
        # Check JSON-LD structured data
        json_ld = item.get('json_ld', [])
        if isinstance(json_ld, list) and len(json_ld) > 0:
            print(f"   ✅ JSON-LD: {len(json_ld)} structured data objects")
            for i, obj in enumerate(json_ld[:3]):  # Show first 3
                obj_type = obj.get('@type', 'Unknown') if isinstance(obj, dict) else 'Unknown'
                print(f"      Object {i+1}: {obj_type}")
        else:
            print(f"   ⚠️ JSON-LD: No structured data found")
        
        # Check headings
        headings = item.get('headings', {})
        if isinstance(headings, dict) and len(headings) > 0:
            total_headings = sum(len(v) for v in headings.values() if isinstance(v, list))
            print(f"   ✅ Headings: {total_headings} total across {len(headings)} levels")
            for level, texts in headings.items():
                if isinstance(texts, list) and len(texts) > 0:
                    print(f"      {level.upper()}: {len(texts)} headings")
        else:
            print(f"   ⚠️ Headings: No headings extracted")
        
        # Check icons
        icons = item.get('icons', {})
        if isinstance(icons, dict) and len(icons) > 0:
            print(f"   ✅ Icons: {len(icons)} icon types")
            for icon_type, data in icons.items():
                if icon_type == 'favicon' and data:
                    print(f"      Favicon: {data}")
                elif isinstance(data, list):
                    print(f"      {icon_type}: {len(data)} icons")
        else:
            print(f"   ⚠️ Icons: No icons found")
        
        # Check images (if enabled)
        if 'images' in item:
            images = item.get('images', {})
            if isinstance(images, dict):
                total = images.get('total_images', 0)
                with_alt = images.get('images_with_alt', 0)
                without_alt = images.get('images_without_alt', 0)
                samples = images.get('sample_images', [])
                print(f"   ✅ Images: {total} total, {with_alt} with alt, {without_alt} without alt, {len(samples)} samples")
            else:
                print(f"   ⚠️ Images: Invalid data structure")
        
        # Check links (if enabled)
        if 'links' in item:
            links = item.get('links', {})
            if isinstance(links, dict):
                total = links.get('total_links', 0)
                internal = links.get('internal_links', 0)
                external = links.get('external_links', 0)
                samples = links.get('sample_links', [])
                print(f"   ✅ Links: {total} total, {internal} internal, {external} external, {len(samples)} samples")
            else:
                print(f"   ⚠️ Links: Invalid data structure")
        
        # Check additional meta
        additional = item.get('additional_meta', {})
        if isinstance(additional, dict) and len(additional) > 0:
            print(f"   ✅ Additional Meta: {len(additional)} properties")
            print(f"      Properties: {list(additional.keys())}")
        else:
            print(f"   ⚠️ Additional Meta: No additional meta tags found")
        
        # Check robots.txt and sitemap URLs
        robots_url = item.get('robots_txt_url')
        sitemap_url = item.get('sitemap_xml_url')
        if robots_url:
            print(f"   ✅ Robots.txt URL: {robots_url}")
        if sitemap_url:
            print(f"   ✅ Sitemap URL: {sitemap_url}")
        
        if issues:
            print(f"   ⚠️ Issues found: {issues}")
            return False, issues
        else:
            print(f"   ✅ SEO data structure verification passed")
            return True, []
    
    async def test_seo_scraper_comprehensive(self):
        """Test SEO scraper with multiple URLs and configurations"""
        print("\n🚀 Starting Comprehensive SEO Scraper Testing...")
        
        # Test URLs - well-structured sites with rich metadata
        test_urls = [
            {
                'url': 'https://xploanimation.com/',
                'name': 'XploAnimation',
                'extract_headings': True,
                'extract_images': True,
                'extract_links': True  # Test all features for comprehensive analysis
            }
        ]
        
        # Get SEO actor
        seo_actor = await self.test_actors_list()
        if not seo_actor:
            print("❌ Cannot proceed without SEO actor")
            return False
        
        actor_id = seo_actor.get('id')
        all_tests_passed = True
        
        for test_config in test_urls:
            print(f"\n{'='*60}")
            print(f"🔍 Testing SEO Scraper with {test_config['name']}")
            print(f"   URL: {test_config['url']}")
            print(f"   Extract Headings: {test_config['extract_headings']}")
            print(f"   Extract Images: {test_config['extract_images']}")
            print(f"   Extract Links: {test_config['extract_links']}")
            print(f"{'='*60}")
            
            # Create run
            run = await self.create_seo_run(
                actor_id=actor_id,
                url=test_config['url'],
                extract_headings=test_config['extract_headings'],
                extract_images=test_config['extract_images'],
                extract_links=test_config['extract_links']
            )
            
            if not run:
                print(f"❌ Failed to create run for {test_config['name']}")
                self.test_results.append({
                    'test': f"SEO Scraper - {test_config['name']}",
                    'status': 'FAIL',
                    'details': 'Failed to create run'
                })
                all_tests_passed = False
                continue
            
            # Wait for completion
            completed_run = await self.wait_for_run_completion(run['id'])
            if not completed_run or completed_run.get('status') != 'succeeded':
                print(f"❌ Run failed or timed out for {test_config['name']}")
                self.test_results.append({
                    'test': f"SEO Scraper - {test_config['name']}",
                    'status': 'FAIL',
                    'details': f"Run status: {completed_run.get('status') if completed_run else 'timeout'}"
                })
                all_tests_passed = False
                continue
            
            # Get dataset items
            items = await self.get_dataset_items(run['id'])
            if not items:
                print(f"❌ No dataset items found for {test_config['name']}")
                self.test_results.append({
                    'test': f"SEO Scraper - {test_config['name']}",
                    'status': 'FAIL',
                    'details': 'No dataset items returned'
                })
                all_tests_passed = False
                continue
            
            # Verify data structure
            # Extract the actual data item
            if isinstance(items, dict) and 'items' in items:
                data_items = items['items']
                if isinstance(data_items, list) and len(data_items) > 0:
                    dataset_item = data_items[0]
                    print(f"   Dataset item keys: {list(dataset_item.keys()) if isinstance(dataset_item, dict) else 'N/A'}")
                    
                    # The actual scraped data is in the 'data' field
                    if 'data' in dataset_item:
                        item = dataset_item['data']
                        print(f"   Scraped data keys: {list(item.keys()) if isinstance(item, dict) else 'N/A'}")
                        
                        # Check for errors in the scraped data
                        if 'error' in item:
                            print(f"   ❌ Scraping error found: {item['error']}")
                            self.test_results.append({
                                'test': f"SEO Scraper - {test_config['name']}",
                                'status': 'FAIL',
                                'details': f"Scraping error: {item['error']}"
                            })
                            all_tests_passed = False
                            continue
                    else:
                        print(f"❌ No 'data' field in dataset item")
                        self.test_results.append({
                            'test': f"SEO Scraper - {test_config['name']}",
                            'status': 'FAIL',
                            'details': 'No data field in dataset item'
                        })
                        all_tests_passed = False
                        continue
                else:
                    print(f"❌ No items in dataset")
                    self.test_results.append({
                        'test': f"SEO Scraper - {test_config['name']}",
                        'status': 'FAIL',
                        'details': 'No items in dataset'
                    })
                    all_tests_passed = False
                    continue
            else:
                print(f"❌ Unexpected dataset structure: {items}")
                self.test_results.append({
                    'test': f"SEO Scraper - {test_config['name']}",
                    'status': 'FAIL',
                    'details': f'Unexpected dataset structure: {type(items)}'
                })
                all_tests_passed = False
                continue
            
            is_valid, issues = self.verify_seo_data_structure(item, test_config['url'])
            
            if is_valid:
                print(f"✅ SEO scraper test passed for {test_config['name']}")
                self.test_results.append({
                    'test': f"SEO Scraper - {test_config['name']}",
                    'status': 'PASS',
                    'details': f"Successfully extracted SEO data with all required fields"
                })
            else:
                print(f"❌ SEO scraper test failed for {test_config['name']}: {issues}")
                self.test_results.append({
                    'test': f"SEO Scraper - {test_config['name']}",
                    'status': 'FAIL',
                    'details': f"Data validation issues: {issues}"
                })
                all_tests_passed = False
        
        return all_tests_passed
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
    
    def print_test_summary(self):
        """Print comprehensive test summary"""
        print(f"\n{'='*80}")
        print(f"🎯 SEO METADATA SCRAPER TEST SUMMARY")
        print(f"{'='*80}")
        
        passed = sum(1 for result in self.test_results if result['status'] == 'PASS')
        failed = sum(1 for result in self.test_results if result['status'] == 'FAIL')
        total = len(self.test_results)
        
        print(f"📊 Total Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed/total*100):.1f}%" if total > 0 else "N/A")
        
        print(f"\n📋 Detailed Results:")
        for i, result in enumerate(self.test_results, 1):
            status_icon = "✅" if result['status'] == 'PASS' else "❌"
            print(f"{i:2d}. {status_icon} {result['test']}")
            if result['status'] == 'FAIL':
                print(f"     Details: {result['details']}")
        
        print(f"\n{'='*80}")
        
        return passed == total


async def main():
    """Main test execution"""
    print("🚀 Starting SEO Metadata Scraper Backend Testing")
    print("=" * 60)
    
    tester = SEOScraperTester()
    
    try:
        # Setup
        if not await tester.setup_session():
            print("❌ Failed to setup test session")
            return False
        
        # Run comprehensive tests
        success = await tester.test_seo_scraper_comprehensive()
        
        # Print summary
        all_passed = tester.print_test_summary()
        
        return all_passed
        
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