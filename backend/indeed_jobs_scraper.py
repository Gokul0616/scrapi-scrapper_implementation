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
        
        # India domains
        if any(city in location_lower for city in ['chennai', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'pune', 'kolkata', 'india']):
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
        context = await self.engine.create_context(use_proxy=True)
        
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
                    # Navigate to search page
                    await page.goto(search_url, wait_until="networkidle", timeout=30000)
                    await asyncio.sleep(3)  # Wait for dynamic content to load
                    
                    # Extract job URLs from page
                    content = await page.content()
                    soup = BeautifulSoup(content, 'html.parser')
                    
                    # Use the correct 2024-2025 Indeed selector
                    job_cards = soup.select('.job_seen_beacon')
                    
                    if not job_cards:
                        # Fallback selectors if primary fails
                        fallback_selectors = [
                            'div[data-testid="slider_item"]',
                            'div.cardOutline',
                            'div[data-jk]',
                            'div.jobsearch-ResultsList > li',
                            'td.resultContent'
                        ]
                        
                        for selector in fallback_selectors:
                            job_cards = soup.select(selector)
                            if job_cards:
                                logger.info(f"Found {len(job_cards)} jobs using fallback selector: {selector}")
                                break
                    else:
                        logger.info(f"Found {len(job_cards)} jobs using primary selector: .job_seen_beacon")
                    
                    if not job_cards:
                        logger.warning(f"No job cards found on page {page_num + 1}")
                        # Save full HTML for debugging
                        try:
                            debug_file = f"/tmp/indeed_debug_page{page_num + 1}.html"
                            with open(debug_file, 'w', encoding='utf-8') as f:
                                f.write(content)
                            logger.info(f"💾 Saved HTML sample to {debug_file} for debugging")
                            await self._log_progress(f"💾 Saved HTML sample to {debug_file} for debugging", progress_callback)
                        except Exception as save_error:
                            logger.error(f"Failed to save HTML sample: {save_error}")
                        
                        # Log sample HTML in logs as well
                        sample_html = content[:3000] if len(content) > 3000 else content
                        logger.debug(f"Sample HTML: {sample_html}")
                        
                        # If page 1 has no jobs, it's likely a detection issue - continue trying more pages
                        if page_num == 0:
                            logger.warning("Page 1 failed, trying with longer wait time...")
                            await self._log_progress("⚠️ Page 1 detection failed, retrying with longer wait...", progress_callback)
                            await asyncio.sleep(5)  # Longer wait for anti-bot
                            continue  # Try next page
                        else:
                            break
                    
                    page_jobs = []
                    for card in job_cards:
                        # Extract job ID from data attribute (primary method)
                        job_id = card.get('data-jk')
                        
                        if job_id:
                            # Build proper Indeed job URL
                            job_url = f"{self.base_url}/viewjob?jk={job_id}"
                            page_jobs.append(job_url)
                        else:
                            # Fallback: Try to find link within card
                            link = None
                            link_selectors = [
                                'a.jcs-JobTitle',
                                'h2.jobTitle a',
                                'a[id^="job_"]',
                                'a[href*="/viewjob"]',
                                'a[href*="/rc/clk"]'
                            ]
                            
                            for link_selector in link_selectors:
                                link = card.select_one(link_selector)
                                if link and link.get('href'):
                                    break
                            
                            if link and link.get('href'):
                                job_url = link['href']
                                
                                # Convert relative URLs to absolute
                                if job_url.startswith('/'):
                                    job_url = self.base_url + job_url
                                elif not job_url.startswith('http'):
                                    job_url = self.base_url + '/' + job_url
                                
                                # Only add if it's a valid job URL
                                if '/viewjob' in job_url or '/rc/clk' in job_url or '/pagead' in job_url or 'jk=' in job_url:
                                    page_jobs.append(job_url)
                    
                    # Deduplicate and add to results
                    new_jobs = [url for url in page_jobs if url not in job_urls]
                    job_urls.extend(new_jobs)
                    
                    await self._log_progress(f"✅ Page {page_num + 1}: Found {len(new_jobs)} jobs (Total: {len(job_urls)})", progress_callback)
                    
                    # If no new jobs found, we've reached the end
                    if not new_jobs:
                        logger.info(f"No new jobs found on page {page_num + 1}, stopping pagination")
                        break
                    
                    # Respectful delay between pages
                    await asyncio.sleep(2)
                    
                except PlaywrightTimeoutError:
                    logger.error(f"Timeout on page {page_num + 1}")
                    break
                except Exception as e:
                    logger.error(f"Error on page {page_num + 1}: {e}")
                    break
        
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
