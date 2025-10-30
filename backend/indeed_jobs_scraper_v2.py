"""
Indeed Jobs Scraper V2 - Enhanced Anti-Bot Bypass
Implements advanced techniques to bypass Cloudflare Turnstile and other anti-bot measures
"""

import asyncio
import re
import logging
import random
import json
from typing import List, Dict, Any, Optional, Callable
from base_scraper import BaseScraper
from scraper_engine import ScraperEngine
from playwright.async_api import Page, TimeoutError as PlaywrightTimeoutError, BrowserContext
from playwright_stealth import stealth_async
from bs4 import BeautifulSoup
from datetime import datetime

logger = logging.getLogger(__name__)


class IndeedJobsScraperV2(BaseScraper):
    """
    Indeed Jobs Scraper V2 - Enhanced with advanced anti-bot bypass techniques.
    
    Features:
    - Advanced Cloudflare Turnstile bypass
    - Human-like behavior simulation
    - Browser fingerprint randomization
    - Intelligent retry mechanisms
    - Multiple anti-detection strategies
    """
    
    def __init__(self, scraper_engine: ScraperEngine):
        super().__init__(scraper_engine)
        self.base_url = "https://www.indeed.com"
        self.email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
        self.phone_pattern = re.compile(r'[\+\(]?[1-9][0-9 .\-\(\)]{8,}[0-9]')
    
    def _get_indeed_domain(self, location: str) -> str:
        """Determine the correct Indeed domain based on location."""
        location_lower = location.lower()
        
        india_locations = [
            'chennai', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'pune', 'kolkata', 
            'india', 'tamilnadu', 'tamil nadu', 'karnataka', 'maharashtra', 'gujarat',
            'rajasthan', 'kerala', 'telangana', 'west bengal', 'uttar pradesh'
        ]
        if any(loc in location_lower for loc in india_locations):
            return "https://in.indeed.com"
        elif any(city in location_lower for city in ['london', 'manchester', 'birmingham', 'uk', 'united kingdom']):
            return "https://uk.indeed.com"
        elif any(city in location_lower for city in ['toronto', 'vancouver', 'montreal', 'canada']):
            return "https://ca.indeed.com"
        elif any(city in location_lower for city in ['sydney', 'melbourne', 'brisbane', 'australia']):
            return "https://au.indeed.com"
        
        return "https://www.indeed.com"
        
    @classmethod
    def get_name(cls) -> str:
        return "Indeed Jobs Scraper V2"
    
    @classmethod
    def get_description(cls) -> str:
        return "Advanced job scraper with Cloudflare bypass - Extract job listings from Indeed.com"
    
    @classmethod
    def get_category(cls) -> str:
        return "Jobs & Careers"
    
    @classmethod
    def get_icon(cls) -> str:
        return "💼"
    
    @classmethod
    def get_tags(cls) -> List[str]:
        return ["indeed", "jobs", "careers", "employment", "hiring", "salary", "cloudflare-bypass"]
    
    def get_input_schema(cls) -> Dict[str, Any]:
        return {
            "keyword": {
                "type": "string",
                "description": "Job search keyword (e.g., 'python developer', 'sales manager')",
                "required": True
            },
            "location": {
                "type": "string",
                "description": "Location to search jobs (e.g., 'New York, NY', 'Remote', 'Chennai, Tamil Nadu')",
                "default": "",
                "required": False
            },
            "max_pages": {
                "type": "integer",
                "description": "Maximum number of pages to scrape (each page ~15 jobs)",
                "default": 3,
                "min": 1,
                "max": 50
            }
        }
    
    def get_output_schema(cls) -> Dict[str, Any]:
        return {
            "jobTitle": "string - Job title",
            "company": "string - Company name",
            "location": "string - Job location",
            "salary": "string - Salary information (if available)",
            "jobUrl": "string - Full Indeed job URL",
            "postedDate": "string - When job was posted",
            "description": "string - Full job description",
            "jobId": "string - Unique Indeed job ID",
            "jobType": "string - Full-time, Part-time, Contract, etc.",
            "benefits": "array - List of benefits mentioned",
            "rating": "string - Company rating (if available)"
        }
    
    async def _create_stealth_context(self) -> BrowserContext:
        """Create a browser context with advanced anti-detection features."""
        # Create context with custom settings to avoid detection
        # Using more realistic settings that match actual Chrome browser
        context = await self.engine.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            locale='en-IN',  # Indian locale for India Indeed
            timezone_id='Asia/Kolkata',  # Indian timezone
            permissions=[],  # Empty permissions initially
            color_scheme='light',
            java_script_enabled=True,
            bypass_csp=True,
            ignore_https_errors=True,  # Sometimes helps
            extra_http_headers={
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Cache-Control': 'max-age=0',
            }
        )
        
        return context
    
    async def _apply_advanced_stealth(self, page: Page):
        """Apply advanced stealth techniques to avoid detection."""
        # Apply playwright-stealth
        await stealth_async(page)
        
        # Override navigator properties
        await page.add_init_script("""
            // Override the navigator.webdriver property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            // Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
            );
            
            // Mock plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            
            // Mock languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });
            
            // Override chrome property
            window.chrome = {
                runtime: {}
            };
            
            // Mock hardware concurrency
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 8
            });
            
            // Override toString
            const oldToString = Function.prototype.toString;
            Function.prototype.toString = function() {
                if (this === window.navigator.permissions.query) {
                    return 'function query() { [native code] }';
                }
                return oldToString.call(this);
            };
        """)
        
        logger.info("✅ Applied advanced stealth techniques")
    
    async def _simulate_human_behavior(self, page: Page):
        """Simulate human-like behavior to avoid detection."""
        try:
            # Random mouse movements
            for _ in range(random.randint(2, 4)):
                x = random.randint(100, 1800)
                y = random.randint(100, 1000)
                await page.mouse.move(x, y, steps=random.randint(10, 20))
                await asyncio.sleep(random.uniform(0.1, 0.3))
            
            # Gradual scrolling
            scroll_height = await page.evaluate('document.body.scrollHeight')
            current_position = 0
            scroll_steps = random.randint(3, 5)
            
            for step in range(scroll_steps):
                scroll_distance = random.randint(200, 500)
                current_position += scroll_distance
                if current_position > scroll_height:
                    break
                    
                await page.evaluate(f'window.scrollTo({{top: {current_position}, behavior: "smooth"}})')
                await asyncio.sleep(random.uniform(0.5, 1.5))
            
            # Scroll back up a bit (human-like)
            await page.evaluate(f'window.scrollTo({{top: {current_position // 2}, behavior: "smooth"}})')
            await asyncio.sleep(random.uniform(0.3, 0.7))
            
            logger.info("✅ Simulated human behavior")
        except Exception as e:
            logger.warning(f"Human behavior simulation error: {e}")
    
    async def _wait_for_cloudflare_bypass(self, page: Page, progress_callback: Optional[Callable] = None) -> bool:
        """
        Wait for Cloudflare Turnstile challenge to be bypassed.
        Returns True if bypassed successfully, False otherwise.
        """
        max_wait_time = 120  # Increased to 120 seconds (2 minutes)
        check_interval = 3  # Check every 3 seconds for more patience
        elapsed = 0
        retry_count = 0
        max_retries = 2
        
        while elapsed < max_wait_time:
            await asyncio.sleep(check_interval)
            elapsed += check_interval
            
            try:
                # Check page title
                title = await page.title()
                content = await page.content()
                url = page.url
                
                # Check if still on challenge page
                challenge_indicators = ["just a moment", "challenge", "checking", "verifying"]
                if any(indicator in title.lower() for indicator in challenge_indicators):
                    if elapsed % 10 == 0:  # Log every 10 seconds
                        await self._log_progress(f"⏳ Waiting for Cloudflare ({elapsed}s)...", progress_callback)
                    
                    # Try clicking on Turnstile checkbox if visible
                    try:
                        turnstile_frame = page.frame_locator('iframe[src*="challenges.cloudflare.com"]')
                        checkbox = turnstile_frame.locator('input[type="checkbox"]')
                        if await checkbox.is_visible(timeout=1000):
                            await checkbox.click()
                            await asyncio.sleep(2)
                            logger.info("🖱️ Clicked Turnstile checkbox")
                    except:
                        pass
                    
                    # If stuck too long, try refreshing once
                    if elapsed == 60 and retry_count < max_retries:
                        await self._log_progress(f"🔄 Refreshing page to retry Cloudflare bypass...", progress_callback)
                        await page.reload(wait_until="domcontentloaded")
                        await asyncio.sleep(random.uniform(3, 5))
                        retry_count += 1
                    
                    continue
                
                # Check for Turnstile widget completion
                turnstile_complete = await page.evaluate("""
                    () => {
                        const turnstile = document.querySelector('input[name="cf-turnstile-response"]');
                        return turnstile && turnstile.value && turnstile.value.length > 0;
                    }
                """)
                
                if turnstile_complete:
                    await self._log_progress(f"✅ Cloudflare bypassed after {elapsed}s!", progress_callback)
                    logger.info(f"✅ Successfully bypassed Cloudflare challenge in {elapsed}s")
                    await asyncio.sleep(2)  # Wait a bit more for page to load
                    return True
                
                # Check if we're on the actual Indeed job search page
                success_indicators = ['indeed.com/jobs', 'indeed.com/viewjob']
                if any(indicator in url for indicator in success_indicators):
                    # Make sure it's not a captcha page
                    if 'captcha' not in content.lower() and 'challenge' not in content.lower():
                        await self._log_progress(f"✅ Reached Indeed page after {elapsed}s!", progress_callback)
                        logger.info(f"✅ Successfully reached Indeed page in {elapsed}s")
                        return True
                
                # Check if page has actual job content
                has_jobs = await page.evaluate("""
                    () => {
                        const indicators = [
                            document.querySelector('.job_seen_beacon'),
                            document.querySelector('[data-testid="slider_item"]'),
                            document.querySelector('.jobsearch-ResultsList'),
                            document.querySelector('[data-jk]')
                        ];
                        return indicators.some(el => el !== null);
                    }
                """)
                
                if has_jobs:
                    await self._log_progress(f"✅ Job content detected after {elapsed}s!", progress_callback)
                    logger.info(f"✅ Job content detected in {elapsed}s")
                    return True
                    
            except Exception as e:
                logger.warning(f"Error checking Cloudflare status: {e}")
        
        # Timeout
        await self._log_progress(f"⚠️ Cloudflare bypass timeout after {max_wait_time}s", progress_callback)
        logger.warning(f"⚠️ Failed to bypass Cloudflare after {max_wait_time}s")
        return False
    
    async def scrape(self, config: Dict[str, Any], progress_callback: Optional[Callable] = None) -> List[Dict[str, Any]]:
        """Main scraping method with advanced anti-bot bypass."""
        keyword = config.get('keyword', '').strip()
        location = config.get('location', '').strip()
        max_pages = int(config.get('max_pages', 3))
        
        if not keyword:
            raise ValueError("Keyword is required for Indeed job search")
        
        # Set the correct Indeed domain
        if location:
            self.base_url = self._get_indeed_domain(location)
            await self._log_progress(f"🌍 Using {self.base_url} for location: {location}", progress_callback)
        
        await self._log_progress(f"🔍 Starting advanced Indeed job search: '{keyword}' in '{location or 'Any Location'}'", progress_callback)
        
        all_jobs = []
        context = await self._create_stealth_context()
        
        try:
            # Collect job URLs
            job_urls = await self._collect_job_urls_v2(
                context, 
                keyword, 
                location, 
                max_pages, 
                progress_callback
            )
            
            await self._log_progress(f"✅ Found {len(job_urls)} job listings", progress_callback)
            
            if not job_urls:
                error_msg = (
                    f"❌ Failed to extract jobs for '{keyword}' in '{location or 'Any Location'}'. "
                    "Cloudflare Turnstile is blocking access. This scraper requires a CAPTCHA solving service like 2captcha to work. "
                    "See documentation for integration options."
                )
                await self._log_progress(error_msg, progress_callback)
                raise ValueError(error_msg)  # Raise error instead of returning empty list
            
            # Extract job details in parallel
            batch_size = 5
            for i in range(0, len(job_urls), batch_size):
                batch = job_urls[i:i+batch_size]
                
                await self._log_progress(
                    f"📊 Extracting details: {min(i + batch_size, len(job_urls))}/{len(job_urls)}", 
                    progress_callback
                )
                
                tasks = [self._extract_job_details_v2(context, url) for url in batch]
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for result in batch_results:
                    if isinstance(result, dict) and result:
                        all_jobs.append(result)
                    elif isinstance(result, Exception):
                        logger.error(f"Error extracting job: {result}")
                
                if i + batch_size < len(job_urls):
                    await asyncio.sleep(random.uniform(1, 2))
            
            await self._log_progress(f"✅ Successfully extracted {len(all_jobs)} jobs", progress_callback)
            
        except Exception as e:
            logger.error(f"Indeed scraping error: {e}")
            await self._log_progress(f"❌ Error: {str(e)}", progress_callback)
            raise
        finally:
            await context.close()
        
        return all_jobs
    
    async def _collect_job_urls_v2(
        self, 
        context: BrowserContext, 
        keyword: str, 
        location: str, 
        max_pages: int,
        progress_callback: Optional[Callable] = None
    ) -> List[str]:
        """Collect job URLs with advanced anti-bot bypass."""
        job_urls = []
        page = await context.new_page()
        
        try:
            # Apply stealth techniques
            await self._apply_advanced_stealth(page)
            
            for page_num in range(max_pages):
                start = page_num * 10
                search_url = f"{self.base_url}/jobs?q={keyword.replace(' ', '+')}"
                if location:
                    search_url += f"&l={location.replace(' ', '+')}"
                if start > 0:
                    search_url += f"&start={start}"
                
                await self._log_progress(f"🔍 Searching page {page_num + 1}/{max_pages}", progress_callback)
                
                try:
                    # Navigate with realistic settings
                    await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
                    
                    # Initial wait
                    await asyncio.sleep(random.uniform(2, 4))
                    
                    # Check for Cloudflare challenge
                    title = await page.title()
                    if "just a moment" in title.lower() or "challenge" in title.lower():
                        await self._log_progress("🔐 Cloudflare detected, waiting for bypass...", progress_callback)
                        
                        # Wait for Cloudflare bypass
                        bypassed = await self._wait_for_cloudflare_bypass(page, progress_callback)
                        
                        if not bypassed:
                            logger.error("Failed to bypass Cloudflare")
                            break
                    
                    # Simulate human behavior
                    await self._simulate_human_behavior(page)
                    
                    # Wait for job listings
                    try:
                        await page.wait_for_selector(
                            '.job_seen_beacon, [data-testid="slider_item"], .jobsearch-ResultsList',
                            timeout=15000
                        )
                    except:
                        logger.warning("Job selector timeout, trying anyway...")
                    
                    # Extra wait for dynamic content
                    await asyncio.sleep(random.uniform(2, 3))
                    
                    # Extract job URLs
                    content = await page.content()
                    soup = BeautifulSoup(content, 'html.parser')
                    
                    # Try multiple selectors
                    job_cards = []
                    selectors = [
                        '.job_seen_beacon',
                        '[data-testid="slider_item"]',
                        '.cardOutline',
                        '[data-jk]',
                        '.jobsearch-ResultsList > li',
                        '.mosaic-provider-jobcards ul li',
                    ]
                    
                    for selector in selectors:
                        job_cards = soup.select(selector)
                        if job_cards:
                            logger.info(f"✅ Found {len(job_cards)} jobs with selector: {selector}")
                            break
                    
                    if not job_cards:
                        logger.warning(f"No jobs found on page {page_num + 1}")
                        
                        # Save debug HTML on first page failure
                        if page_num == 0:
                            debug_file = f"/tmp/indeed_v2_debug_page1.html"
                            with open(debug_file, 'w', encoding='utf-8') as f:
                                f.write(content)
                            logger.info(f"💾 Saved debug HTML to {debug_file}")
                            
                            # Check what we got
                            if 'cloudflare' in content.lower() or 'turnstile' in content.lower():
                                logger.error("🚫 Cloudflare Turnstile challenge still active")
                                await self._log_progress(
                                    "🚫 Cloudflare Turnstile blocking - CAPTCHA solving required", 
                                    progress_callback
                                )
                            elif 'captcha' in content.lower():
                                logger.error("🚫 CAPTCHA detected")
                                await self._log_progress("🚫 CAPTCHA detected", progress_callback)
                            else:
                                logger.warning("⚠️ Unknown blocking mechanism")
                        
                        continue
                    
                    # Extract URLs from cards
                    page_jobs = []
                    for card in job_cards:
                        job_id = card.get('data-jk')
                        if job_id:
                            job_url = f"{self.base_url}/viewjob?jk={job_id}"
                            page_jobs.append(job_url)
                            continue
                        
                        # Try finding links
                        link = card.select_one('a[href*="/viewjob"], a[href*="jk="], h2 a')
                        if link and link.get('href'):
                            href = link['href']
                            if href.startswith('/'):
                                job_url = self.base_url + href
                            elif not href.startswith('http'):
                                job_url = self.base_url + '/' + href
                            else:
                                job_url = href
                            
                            if 'viewjob' in job_url or 'jk=' in job_url:
                                page_jobs.append(job_url)
                    
                    # Add new jobs
                    new_jobs = [url for url in page_jobs if url not in job_urls]
                    job_urls.extend(new_jobs)
                    
                    await self._log_progress(
                        f"✅ Page {page_num + 1}: Found {len(new_jobs)} jobs (Total: {len(job_urls)})", 
                        progress_callback
                    )
                    
                    if not new_jobs and len(job_urls) > 0:
                        logger.info(f"No new jobs on page {page_num + 1}, stopping")
                        break
                    
                    # Human-like delay between pages
                    if page_num < max_pages - 1:
                        await asyncio.sleep(random.uniform(3, 6))
                    
                except Exception as e:
                    logger.error(f"Error on page {page_num + 1}: {e}")
                    continue
        
        finally:
            await page.close()
        
        return job_urls
    
    async def _extract_job_details_v2(self, context: BrowserContext, job_url: str) -> Optional[Dict[str, Any]]:
        """Extract job details with anti-detection."""
        page = await context.new_page()
        
        try:
            await page.goto(job_url, wait_until="networkidle", timeout=20000)
            await asyncio.sleep(random.uniform(1, 2))
            
            content = await page.content()
            soup = BeautifulSoup(content, 'html.parser')
            
            # Extract job ID
            job_id_match = re.search(r'jk=([a-zA-Z0-9]+)', job_url)
            job_id = job_id_match.group(1) if job_id_match else job_url.split('/')[-1]
            
            # Extract fields (same as before but more robust)
            job_data = {
                "jobId": job_id,
                "jobTitle": self._extract_text(soup, [
                    'h1[data-testid="jobsearch-JobInfoHeader-title"]',
                    'h1.jobsearch-JobInfoHeader-title',
                    'h2.jobTitle span'
                ]),
                "company": self._extract_text(soup, [
                    '[data-testid="inlineHeader-companyName"]',
                    'div[data-company-name="true"]',
                    'div.jobsearch-CompanyInfoContainer a'
                ]),
                "location": self._extract_text(soup, [
                    '[data-testid="inlineHeader-companyLocation"]',
                    'div.jobsearch-JobInfoHeader-subtitle div'
                ]),
                "salary": self._extract_text(soup, [
                    '[data-testid="inlineHeader-salary"]',
                    '#salaryInfoAndJobType',
                    '.salary-snippet'
                ]),
                "postedDate": self._extract_text(soup, [
                    'span.jobsearch-JobMetadataFooter',
                    'div.jobsearch-JobMetadataFooter span'
                ]),
                "description": self._extract_text(soup, [
                    '#jobDescriptionText',
                    '[data-testid="jobsearch-JobComponent-description"]',
                    'div.jobsearch-jobDescriptionText'
                ]),
                "jobUrl": job_url,
                "jobType": "Not specified",
                "benefits": [],
                "rating": "N/A"
            }
            
            return job_data
            
        except Exception as e:
            logger.error(f"Error extracting job from {job_url}: {e}")
            return None
        finally:
            await page.close()
    
    def _extract_text(self, soup: BeautifulSoup, selectors: List[str]) -> str:
        """Extract text using multiple selectors."""
        for selector in selectors:
            elem = soup.select_one(selector)
            if elem:
                text = elem.get_text(strip=True)
                if text and len(text) > 0:
                    return text
        return "N/A"
