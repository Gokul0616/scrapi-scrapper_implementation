"""
Indeed Jobs Scraper - Extract job listings from Indeed.com
Supports: job search, location filtering, salary data, company info, pagination
"""

import asyncio
import re
import logging
from typing import List, Dict, Any, Optional, Callable
from base_scraper import BaseScraper
from scraper_engine import ScraperEngine
from playwright.async_api import Page, TimeoutError as PlaywrightTimeoutError
from playwright_stealth import stealth_async
from bs4 import BeautifulSoup
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class IndeedJobsScraper(BaseScraper):
    """
    Indeed Jobs Scraper - Extract job listings with full details.
    
    Features:
    - Job search with keywords and location
    - Pagination support (up to 100 pages)
    - Salary extraction
    - Full job descriptions
    - Company information
    - Posted date tracking
    - Parallel job detail extraction
    """
    
    def __init__(self, scraper_engine: ScraperEngine):
        super().__init__(scraper_engine)
        self.base_url = "https://www.indeed.com"  # Default to US
        self.email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
        self.phone_pattern = re.compile(r'[\+\(]?[1-9][0-9 .\-\(\)]{8,}[0-9]')
    
    def _get_indeed_domain(self, location: str) -> str:
        """Determine the correct Indeed domain based on location."""
        location_lower = location.lower()
        
        # India domains - Added more Indian states and cities
        india_locations = [
            'chennai', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'pune', 'kolkata', 
            'india', 'tamilnadu', 'tamil nadu', 'karnataka', 'maharashtra', 'gujarat',
            'rajasthan', 'kerala', 'telangana', 'west bengal', 'uttar pradesh'
        ]
        if any(loc in location_lower for loc in india_locations):
            return "https://in.indeed.com"
        
        # UK domain
        elif any(city in location_lower for city in ['london', 'manchester', 'birmingham', 'uk', 'united kingdom']):
            return "https://uk.indeed.com"
        
        # Canada domain
        elif any(city in location_lower for city in ['toronto', 'vancouver', 'montreal', 'canada']):
            return "https://ca.indeed.com"
        
        # Australia domain
        elif any(city in location_lower for city in ['sydney', 'melbourne', 'brisbane', 'australia']):
            return "https://au.indeed.com"
        
        # Default to US
        return "https://www.indeed.com"
        
    @classmethod
    def get_name(cls) -> str:
        return "Indeed Jobs Scraper"
    
    @classmethod
    def get_description(cls) -> str:
        return "Extract job listings, salaries, company info, and full descriptions from Indeed.com"
    
    @classmethod
    def get_category(cls) -> str:
        return "Jobs & Careers"
    
    @classmethod
    def get_icon(cls) -> str:
        return "💼"
    
    @classmethod
    def get_tags(cls) -> List[str]:
        return ["indeed", "jobs", "careers", "employment", "hiring", "salary"]
    
    def get_input_schema(self) -> Dict[str, Any]:
        return {
            "keyword": {
                "type": "string",
                "description": "Job search keyword (e.g., 'python developer', 'sales manager')",
                "required": True
            },
            "location": {
                "type": "string",
                "description": "Location to search jobs (e.g., 'New York, NY', 'Remote')",
                "default": "",
                "required": False
            },
            "max_pages": {
                "type": "integer",
                "description": "Maximum number of pages to scrape (each page ~15 jobs)",
                "default": 5,
                "min": 1,
                "max": 100
            }
        }
    
    def get_output_schema(self) -> Dict[str, Any]:
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
    
    async def scrape(self, config: Dict[str, Any], progress_callback: Optional[Callable] = None) -> List[Dict[str, Any]]:
        """
        Main scraping method for Indeed jobs.
        """
        keyword = config.get('keyword', '').strip()
        location = config.get('location', '').strip()
        max_pages = int(config.get('max_pages', 5))
        
        if not keyword:
            raise ValueError("Keyword is required for Indeed job search")
        
        # Set the correct Indeed domain based on location
        if location:
            self.base_url = self._get_indeed_domain(location)
            await self._log_progress(f"🌍 Using {self.base_url} for location: {location}", progress_callback)
        
        await self._log_progress(f"🔍 Starting Indeed job search: '{keyword}' in '{location or 'Any Location'}'", progress_callback)
        
        all_jobs = []
        # Create context with stealth mode enabled
        context = await self.engine.create_context(use_proxy=False)  # Disable proxy for better success rate
        
        try:
            # Step 1: Collect all job URLs from search pages
            job_urls = await self._collect_job_urls(
                context, 
                keyword, 
                location, 
                max_pages, 
                progress_callback
            )
            
            await self._log_progress(f"✅ Found {len(job_urls)} job listings", progress_callback)
            
            if not job_urls:
                error_msg = (
                    f"❌ Failed to find any jobs for '{keyword}' in '{location or 'Any Location'}'. "
                    "This could be due to: (1) Indeed's anti-bot detection, (2) No jobs available for this search, "
                    "(3) Incorrect location format, or (4) HTML structure changes. "
                    "Check backend logs for HTML samples and selector debugging info."
                )
                await self._log_progress(error_msg, progress_callback)
                raise ValueError(error_msg)
            
            # Step 2: Extract details from each job (parallel batches)
            batch_size = 5  # Process 5 jobs at once
            
            for i in range(0, len(job_urls), batch_size):
                batch = job_urls[i:i+batch_size]
                
                await self._log_progress(
                    f"📊 Extracting job details: {min(i + batch_size, len(job_urls))}/{len(job_urls)}", 
                    progress_callback
                )
                
                # Parallel extraction
                tasks = [
                    self._extract_job_details(context, job_url)
                    for job_url in batch
                ]
                
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Filter out exceptions and None results
                for result in batch_results:
                    if isinstance(result, dict) and result:
                        all_jobs.append(result)
                    elif isinstance(result, Exception):
                        logger.error(f"Error extracting job: {result}")
                
                # Respectful delay between batches
                if i + batch_size < len(job_urls):
                    await asyncio.sleep(1)
            
            await self._log_progress(f"✅ Successfully extracted {len(all_jobs)} jobs", progress_callback)
            
        except Exception as e:
            logger.error(f"Indeed scraping error: {e}")
            await self._log_progress(f"❌ Error: {str(e)}", progress_callback)
            raise
        finally:
            await context.close()
        
        return all_jobs
    
    async def _collect_job_urls(
        self, 
        context, 
        keyword: str, 
        location: str, 
        max_pages: int,
        progress_callback: Optional[Callable] = None
    ) -> List[str]:
        """Collect all job URLs from search result pages."""
        job_urls = []
        page = await context.new_page()
        
        # Apply playwright-stealth to make automation undetectable
        await stealth_async(page)
        await self._log_progress("🥷 Applied stealth mode to avoid detection", progress_callback)
        
        # ENHANCED CLOUDFLARE BYPASS: Advanced fingerprint masking via CDP
        await self._log_progress("🛡️ Applying advanced anti-detection measures...", progress_callback)
        
        # Remove automation signals using CDP
        cdp = await page.context.new_cdp_session(page)
        
        # Override navigator.webdriver to hide automation
        await page.evaluate("""
            () => {
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            }
        """)
        
        # Mask Chrome automation flags
        await page.evaluate("""
            () => {
                // Remove automation property
                delete window.navigator.__proto__.webdriver;
                
                // Override permissions
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );
                
                // Mock plugins
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [
                        {
                            0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format"},
                            description: "Portable Document Format",
                            filename: "internal-pdf-viewer",
                            length: 1,
                            name: "Chrome PDF Plugin"
                        },
                        {
                            0: {type: "application/pdf", suffixes: "pdf", description: "Portable Document Format"},
                            description: "Portable Document Format",
                            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
                            length: 1,
                            name: "Chrome PDF Viewer"
                        }
                    ]
                });
                
                // Spoof Chrome runtime
                window.chrome = {
                    runtime: {}
                };
                
                // Override languages to appear more natural
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en']
                });
                
                // Mock WebGL to prevent fingerprinting
                const getParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function(parameter) {
                    if (parameter === 37445) {
                        return 'Intel Inc.';
                    }
                    if (parameter === 37446) {
                        return 'Intel Iris OpenGL Engine';
                    }
                    return getParameter.call(this, parameter);
                };
            }
        """)
        
        # Set realistic user agent and headers to avoid detection
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        ]
        import random
        selected_ua = random.choice(user_agents)
        await page.set_extra_http_headers({
            'User-Agent': selected_ua,
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Referer': 'https://www.google.com/',
            'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'cross-site',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        })
        
        # Set viewport to realistic desktop size with randomization
        viewport_widths = [1920, 1680, 1536, 1440, 1366]
        viewport_heights = [1080, 1050, 864, 900, 768]
        width = random.choice(viewport_widths)
        height = random.choice(viewport_heights)
        await page.set_viewport_size({"width": width, "height": height})
        
        await self._log_progress("✅ Advanced anti-detection applied successfully", progress_callback)
        
        consecutive_failures = 0  # Track consecutive page failures
        max_consecutive_failures = 2  # Stop after 2 consecutive failures
        
        try:
            for page_num in range(max_pages):
                start = page_num * 10  # Indeed uses 'start' parameter for pagination
                
                # Build search URL
                search_url = f"{self.base_url}/jobs?q={keyword.replace(' ', '+')}"
                if location:
                    search_url += f"&l={location.replace(' ', '+')}"
                if start > 0:
                    search_url += f"&start={start}"
                
                await self._log_progress(f"🔍 Searching page {page_num + 1}/{max_pages}", progress_callback)
                
                try:
                    # Navigate to search page with extended timeout for Cloudflare
                    await page.goto(search_url, wait_until="domcontentloaded", timeout=90000)
                    
                    # ENHANCED CLOUDFLARE DETECTION AND BYPASS
                    await asyncio.sleep(3)
                    
                    # Check if we hit Cloudflare challenge
                    page_content = await page.content()
                    page_title = await page.title()
                    logger.info(f"📄 Page title: {page_title}")
                    
                    # Detect Cloudflare challenge (multiple indicators)
                    cloudflare_indicators = [
                        "just a moment" in page_title.lower(),
                        "challenge" in page_title.lower(),
                        "cf-challenge" in page_content.lower(),
                        "checking your browser" in page_content.lower(),
                        "cloudflare" in page_title.lower() and "ray id" in page_content.lower()
                    ]
                    
                    if any(cloudflare_indicators):
                        await self._log_progress(f"🔐 Cloudflare challenge detected - employing advanced bypass techniques...", progress_callback)
                        logger.info("⏳ Cloudflare challenge detected - attempting automated bypass...")
                        
                        # Simulate realistic human behavior while waiting
                        for human_action in range(3):
                            import random
                            # Random mouse movements
                            await page.mouse.move(
                                random.randint(100, 1500), 
                                random.randint(100, 900),
                                steps=random.randint(10, 30)
                            )
                            await asyncio.sleep(random.uniform(0.5, 1.5))
                            
                            # Random scrolling
                            await page.evaluate(f"window.scrollTo(0, {random.randint(0, 500)})")
                            await asyncio.sleep(random.uniform(0.3, 0.8))
                        
                        # Wait for Cloudflare to auto-solve with intelligent checking
                        max_wait_iterations = 12  # Wait up to 120 seconds total (Cloudflare can take time)
                        solved = False
                        
                        for wait_iteration in range(max_wait_iterations):
                            await asyncio.sleep(10)
                            
                            # Check multiple indicators of success
                            try:
                                page_title = await page.title()
                                page_url = page.url
                                page_content_check = await page.content()
                                
                                logger.info(f"🔄 Check {wait_iteration + 1}/{max_wait_iterations}: Title='{page_title[:50]}...', URL={page_url[:80]}...")
                                
                                # Success indicators - any of these means we're through
                                success_indicators = [
                                    "just a moment" not in page_title.lower(),
                                    "challenge" not in page_title.lower(),
                                    "job" in page_title.lower() or "indeed" in page_title.lower(),
                                    ".job_seen_beacon" in page_content_check or "data-jk=" in page_content_check,
                                    page_url != search_url and "indeed.com/jobs" in page_url
                                ]
                                
                                # If we see job content, we're through
                                if sum(success_indicators) >= 2:  # At least 2 success indicators
                                    solved = True
                                    await self._log_progress(f"✅ Cloudflare challenge bypassed after {(wait_iteration + 1) * 10}s!", progress_callback)
                                    logger.info(f"✅ Successfully bypassed Cloudflare in {(wait_iteration + 1) * 10} seconds")
                                    break
                                
                                # Continue simulating human behavior while waiting
                                if wait_iteration % 2 == 0:
                                    import random
                                    await page.mouse.move(random.randint(200, 1000), random.randint(200, 700))
                                    
                            except Exception as e:
                                logger.warning(f"Error during Cloudflare bypass check: {e}")
                                continue
                        
                        if not solved:
                            # Still on challenge page after max wait
                            await self._log_progress(f"⚠️ Cloudflare challenge not fully resolved after {max_wait_iterations * 10}s, continuing anyway...", progress_callback)
                            logger.warning(f"⚠️ Cloudflare challenge still present after {max_wait_iterations * 10}s")
                            
                            # Save debug HTML
                            try:
                                debug_content = await page.content()
                                debug_file = f"/tmp/indeed_cloudflare_stuck_page{page_num + 1}.html"
                                with open(debug_file, 'w', encoding='utf-8') as f:
                                    f.write(debug_content)
                                logger.info(f"💾 Saved Cloudflare challenge page to {debug_file}")
                                await self._log_progress(f"💾 Debug: Saved challenge HTML to {debug_file}", progress_callback)
                            except Exception as e:
                                logger.error(f"Failed to save debug HTML: {e}")
                            
                            # Try refreshing the page once
                            logger.info("🔄 Attempting page refresh to retry Cloudflare...")
                            await page.reload(wait_until="domcontentloaded", timeout=60000)
                            await asyncio.sleep(10)
                    
                    else:
                        # No Cloudflare detected
                        await self._log_progress("✅ No Cloudflare challenge - page loaded successfully", progress_callback)
                    
                    # Random delay to appear more human (2-4 seconds)
                    import random
                    human_delay = 2 + random.random() * 2
                    await asyncio.sleep(human_delay)
                    
                    # Simulate human mouse movement and scrolling
                    try:
                        # Move mouse randomly
                        await page.mouse.move(random.randint(100, 800), random.randint(100, 600))
                        await asyncio.sleep(0.5)
                        
                        # Scroll down gradually like a human
                        for scroll_step in range(3):
                            scroll_amount = random.randint(200, 400)
                            await page.evaluate(f"window.scrollBy(0, {scroll_amount})")
                            await asyncio.sleep(0.5 + random.random() * 0.5)
                        
                        # Scroll back up a bit
                        await page.evaluate("window.scrollTo(0, 100)")
                        await asyncio.sleep(0.5)
                    except Exception as e:
                        logger.warning(f"Mouse/scroll simulation failed: {e}")
                    
                    # Wait for job results to load - try multiple selectors
                    try:
                        await page.wait_for_selector('.job_seen_beacon, [data-testid="slider_item"], .jobsearch-ResultsList, .mosaic-provider-jobcards', timeout=25000)
                        await self._log_progress("✅ Job listings loaded successfully", progress_callback)
                    except:
                        logger.warning("Job selector not found within timeout, proceeding anyway")
                        await self._log_progress("⚠️ Job selector timeout, checking page content...", progress_callback)
                    
                    # Additional wait for dynamic content
                    await asyncio.sleep(3)
                    
                    # Extract job URLs from page
                    content = await page.content()
                    
                    # Check for blocking/captcha
                    if 'captcha' in content.lower() or 'blocked' in content.lower() or 'unusual traffic' in content.lower():
                        logger.error("⚠️ Detected CAPTCHA or blocking on Indeed")
                        await self._log_progress(f"⚠️ CAPTCHA/blocking detected on page {page_num + 1} - Trying stealth techniques", progress_callback)
                        
                        # Save debug HTML
                        try:
                            debug_file = f"/tmp/indeed_captcha_page{page_num + 1}.html"
                            with open(debug_file, 'w', encoding='utf-8') as f:
                                f.write(content)
                            logger.info(f"💾 Saved CAPTCHA page to {debug_file}")
                        except Exception as e:
                            logger.error(f"Failed to save CAPTCHA HTML: {e}")
                        
                        consecutive_failures += 1
                        if consecutive_failures >= max_consecutive_failures:
                            break
                        await asyncio.sleep(15)  # Wait longer before retry
                        continue
                    
                    soup = BeautifulSoup(content, 'html.parser')
                    
                    # Try multiple selector strategies for 2024-2025 Indeed
                    job_cards = []
                    selector_strategies = [
                        # Strategy 1: Primary 2024-2025 selector
                        ('.job_seen_beacon', 'Primary 2024-2025 selector'),
                        # Strategy 2: Data attribute based
                        ('[data-testid="slider_item"]', 'Slider item selector'),
                        # Strategy 3: Card outline
                        ('.cardOutline', 'Card outline selector'),
                        # Strategy 4: Job key data attribute
                        ('[data-jk]', 'Data-jk selector'),
                        # Strategy 5: Results list items
                        ('.jobsearch-ResultsList > li', 'Results list selector'),
                        # Strategy 6: Alternative structure
                        ('td.resultContent', 'Result content selector'),
                        # Strategy 7: Job container
                        ('.job-container', 'Job container selector'),
                        # Strategy 8: Mosaic provider
                        ('.mosaic-provider-jobcards ul li', 'Mosaic provider selector'),
                    ]
                    
                    for selector, strategy_name in selector_strategies:
                        job_cards = soup.select(selector)
                        if job_cards and len(job_cards) > 0:
                            logger.info(f"✅ Found {len(job_cards)} jobs using: {strategy_name} ({selector})")
                            await self._log_progress(f"✅ Found {len(job_cards)} job cards using {strategy_name}", progress_callback)
                            break
                    
                    if not job_cards:
                        consecutive_failures += 1
                        logger.warning(f"❌ No job cards found on page {page_num + 1} (consecutive failures: {consecutive_failures})")
                        
                        # Save full HTML for debugging
                        try:
                            debug_file = f"/tmp/indeed_debug_page{page_num + 1}.html"
                            with open(debug_file, 'w', encoding='utf-8') as f:
                                f.write(content)
                            logger.info(f"💾 Saved full HTML to {debug_file} for debugging")
                            await self._log_progress(f"💾 Saved HTML to {debug_file}", progress_callback)
                            
                            # Log first 5000 chars of HTML for inspection
                            logger.debug(f"HTML preview (first 5000 chars):\n{content[:5000]}")
                        except Exception as save_error:
                            logger.error(f"Failed to save HTML sample: {save_error}")
                        
                        # If too many consecutive failures, stop scraping
                        if consecutive_failures >= max_consecutive_failures:
                            logger.error(f"❌ {consecutive_failures} consecutive page failures, stopping scraper")
                            await self._log_progress(f"❌ Stopping after {consecutive_failures} consecutive failures", progress_callback)
                            break
                        
                        # If page 1 has no jobs, it's likely a detection issue
                        if page_num == 0:
                            logger.warning("⚠️ Page 1 failed - possible anti-bot detection, retrying...")
                            await self._log_progress("⚠️ Page 1 failed - retrying with longer wait...", progress_callback)
                            await asyncio.sleep(8)
                            continue
                        else:
                            continue
                    else:
                        # Reset failure counter on success
                        consecutive_failures = 0
                    
                    # Extract job URLs from cards
                    page_jobs = []
                    for card in job_cards:
                        job_url = None
                        
                        # Method 1: Extract from data-jk attribute
                        job_id = card.get('data-jk')
                        if job_id:
                            job_url = f"{self.base_url}/viewjob?jk={job_id}"
                            page_jobs.append(job_url)
                            continue
                        
                        # Method 2: Find job ID in onclick or data attributes
                        for attr in ['onclick', 'data-mobtk', 'data-jk', 'id']:
                            attr_value = card.get(attr, '')
                            if attr_value:
                                jk_match = re.search(r'jk=([a-f0-9]+)', attr_value)
                                if not jk_match:
                                    jk_match = re.search(r'([a-f0-9]{16})', attr_value)
                                if jk_match:
                                    job_id = jk_match.group(1)
                                    job_url = f"{self.base_url}/viewjob?jk={job_id}"
                                    page_jobs.append(job_url)
                                    break
                        
                        if job_url:
                            continue
                        
                        # Method 3: Find link within card using multiple selectors
                        link_selectors = [
                            'a.jcs-JobTitle',
                            'h2.jobTitle a',
                            'a[id^="job_"]',
                            'a[href*="/viewjob"]',
                            'a[href*="/rc/clk"]',
                            'a[href*="jk="]',
                            'a.job-title',
                            'h2 a'
                        ]
                        
                        for link_selector in link_selectors:
                            link = card.select_one(link_selector)
                            if link and link.get('href'):
                                href = link['href']
                                
                                # Convert relative URLs to absolute
                                if href.startswith('/'):
                                    job_url = self.base_url + href
                                elif not href.startswith('http'):
                                    job_url = self.base_url + '/' + href
                                else:
                                    job_url = href
                                
                                # Only add if it's a valid job URL
                                if any(pattern in job_url for pattern in ['/viewjob', '/rc/clk', '/pagead', 'jk=']):
                                    page_jobs.append(job_url)
                                    break
                    
                    # Deduplicate and add to results
                    new_jobs = [url for url in page_jobs if url not in job_urls]
                    job_urls.extend(new_jobs)
                    
                    logger.info(f"📊 Page {page_num + 1}: Found {len(new_jobs)} new jobs (Total: {len(job_urls)})")
                    await self._log_progress(f"✅ Page {page_num + 1}: Found {len(new_jobs)} jobs (Total: {len(job_urls)})", progress_callback)
                    
                    # If no new jobs found on this page but we found some on previous pages, we've reached the end
                    if not new_jobs and len(job_urls) > 0:
                        logger.info(f"📍 No new jobs on page {page_num + 1}, reached end (total: {len(job_urls)})")
                        await self._log_progress(f"📍 Reached end of results at page {page_num + 1}", progress_callback)
                        break
                    elif not new_jobs and len(job_urls) == 0:
                        # No jobs found at all - continue to next page in case of issues
                        logger.warning(f"⚠️ No jobs on page {page_num + 1} and still 0 total, trying next page...")
                        continue
                    
                    # Respectful delay between pages (3-5 seconds to avoid detection)
                    delay = 3 + (page_num % 3)  # Variable delay: 3, 4, or 5 seconds
                    await asyncio.sleep(delay)
                    
                except PlaywrightTimeoutError:
                    logger.error(f"⏱️ Timeout on page {page_num + 1}")
                    await self._log_progress(f"⏱️ Timeout on page {page_num + 1}", progress_callback)
                    consecutive_failures += 1
                    if consecutive_failures >= max_consecutive_failures:
                        break
                    continue
                except Exception as e:
                    logger.error(f"❌ Error on page {page_num + 1}: {e}")
                    await self._log_progress(f"❌ Error on page {page_num + 1}: {str(e)}", progress_callback)
                    consecutive_failures += 1
                    if consecutive_failures >= max_consecutive_failures:
                        break
                    continue
        
        finally:
            await page.close()
        
        return job_urls
    
    async def _extract_job_details(self, context, job_url: str) -> Optional[Dict[str, Any]]:
        """Extract detailed information from a single job posting."""
        page = await context.new_page()
        
        try:
            # Navigate to job page
            await page.goto(job_url, wait_until="networkidle", timeout=20000)
            await asyncio.sleep(2)  # Increased wait time
            
            content = await page.content()
            soup = BeautifulSoup(content, 'html.parser')
            
            # Extract job ID from URL
            job_id_match = re.search(r'jk=([a-zA-Z0-9]+)', job_url)
            job_id = job_id_match.group(1) if job_id_match else job_url.split('/')[-1]
            
            # Extract job title
            job_title = None
            title_selectors = [
                'h1[data-testid="jobsearch-JobInfoHeader-title"]',
                'h1.jobsearch-JobInfoHeader-title',
                'h1[class*="jobTitle"]',
                'h2.jobTitle span',
                'h2.jobTitle',
                'h1.icl-u-xs-mb--xs',
                '[data-testid="job-title"]'
            ]
            for selector in title_selectors:
                title_elem = soup.select_one(selector)
                if title_elem:
                    job_title = title_elem.get_text(strip=True)
                    break
            
            # Extract company name
            company = None
            company_selectors = [
                '[data-testid="inlineHeader-companyName"]',
                'div[data-company-name="true"]',
                '[data-testid="company-name"]',
                'div.jobsearch-InlineCompanyRating div',
                'div.jobsearch-CompanyInfoContainer a',
                'a[data-tn-element="companyName"]',
                'span[data-testid="company-name"]'
            ]
            for selector in company_selectors:
                company_elem = soup.select_one(selector)
                if company_elem:
                    company = company_elem.get_text(strip=True)
                    break
            
            # Extract location
            location = None
            location_selectors = [
                '[data-testid="inlineHeader-companyLocation"]',
                'div[data-testid="inlineHeader-companyLocation"]',
                'div.jobsearch-JobInfoHeader-subtitle div',
                'div.jobsearch-InlineCompanyRating + div',
                'span.jobsearch-JobMetadataHeader-iconLabel',
                '[data-testid="job-location"]'
            ]
            for selector in location_selectors:
                location_elem = soup.select_one(selector)
                if location_elem:
                    loc_text = location_elem.get_text(strip=True)
                    # Filter out non-location text
                    if loc_text and not loc_text.startswith('$') and len(loc_text) > 2:
                        location = loc_text
                        break
            
            # Extract salary
            salary = None
            salary_selectors = [
                '[data-testid="inlineHeader-salary"]',
                '#salaryInfoAndJobType',
                'div.jobsearch-JobMetadataHeader-item',
                '.salary-snippet',
                '.metadata.salary-snippet-container'
            ]
            for selector in salary_selectors:
                salary_elem = soup.select_one(selector)
                if salary_elem:
                    salary_text = salary_elem.get_text(strip=True)
                    if '$' in salary_text or 'hour' in salary_text.lower() or 'year' in salary_text.lower():
                        salary = salary_text
                        break
            
            # Extract posted date
            posted_date = None
            posted_elem = soup.select_one('span.jobsearch-JobMetadataFooter, div.jobsearch-JobMetadataFooter span, span.date')
            if posted_elem:
                posted_date = posted_elem.get_text(strip=True)
            
            # Extract job type
            job_type = None
            type_elem = soup.select_one('div.jobsearch-JobMetadataHeader-item:has-text("Full-time"), div.jobsearch-JobMetadataHeader-item:has-text("Part-time"), div.jobsearch-JobMetadataHeader-item:has-text("Contract")')
            if type_elem:
                job_type = type_elem.get_text(strip=True)
            
            # Extract company rating
            rating = None
            rating_elem = soup.select_one('div[class*="rating"] span, div.icl-Ratings-count, a.icl-Ratings')
            if rating_elem:
                rating_text = rating_elem.get_text(strip=True)
                rating_match = re.search(r'(\d+\.?\d*)', rating_text)
                if rating_match:
                    rating = rating_match.group(1)
            
            # Extract full job description
            description = None
            desc_selectors = [
                '#jobDescriptionText',
                'div#jobDescriptionText',
                '[data-testid="jobsearch-JobComponent-description"]',
                'div.jobsearch-jobDescriptionText',
                'div[class*="jobDescription"]',
                'div.job-description',
                'div[id*="jobDescription"]'
            ]
            for selector in desc_selectors:
                desc_elem = soup.select_one(selector)
                if desc_elem:
                    description = desc_elem.get_text(separator='\n', strip=True)
                    break
            
            # Extract benefits
            benefits = []
            benefits_section = soup.select('div.jobsearch-JobMetadataHeader-item, div.benefits-list li, ul.benefits li')
            for benefit in benefits_section:
                benefit_text = benefit.get_text(strip=True)
                if benefit_text and len(benefit_text) > 3 and benefit_text not in benefits:
                    benefits.append(benefit_text)
            
            # Build job data object
            job_data = {
                "jobId": job_id,
                "jobTitle": job_title or "N/A",
                "company": company or "N/A",
                "location": location or "N/A",
                "salary": salary or "Not specified",
                "jobUrl": job_url,
                "postedDate": posted_date or "N/A",
                "description": description or "N/A",
                "jobType": job_type or "Not specified",
                "benefits": benefits,
                "rating": rating or "N/A",
                "#debug": {
                    "extractedAt": datetime.utcnow().isoformat(),
                    "sourceUrl": job_url
                }
            }
            
            return job_data
            
        except Exception as e:
            logger.error(f"Error extracting job from {job_url}: {e}")
            return None
        finally:
            await page.close()
