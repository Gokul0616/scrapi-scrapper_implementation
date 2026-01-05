"""
Integration Example: Using Centralized Anti-Bot System

This file demonstrates how to integrate the new AntiBot system
with your existing scrapers.
"""

import asyncio
import logging
from typing import Dict, Any, List
from playwright.async_api import Page

# Import the centralized anti-bot system
from antibot import AntiBotManager

# Import existing scraper components
from scrapers.scraper_engine import ScraperEngine
from scrapers.base_scraper import BaseScraper

logger = logging.getLogger(__name__)


# ============================================================================
# EXAMPLE 1: Enhanced Scraper with Full AntiBot Integration
# ============================================================================

class EnhancedScraperExample(BaseScraper):
    """
    Example scraper using the full AntiBot system.
    
    This shows best practices for integrating anti-bot features.
    """
    
    def __init__(self, scraper_engine: ScraperEngine):
        super().__init__(scraper_engine)
        
        # Initialize AntiBot manager
        self.antibot = AntiBotManager()
    
    async def scrape(self, config: Dict[str, Any], progress_callback=None) -> List[Dict[str, Any]]:
        """
        Main scraping method with full anti-bot protection.
        """
        url = config.get('url')
        profile = config.get('fingerprint_profile', 'windows_chrome')
        simulate_behavior = config.get('simulate_behavior', True)
        
        await self._log_progress(f"Starting scrape of {url}", progress_callback)
        
        # Create context with anti-bot
        context = await self.engine.create_context(
            use_proxy=config.get('use_proxy', True),
            ultra_fast=config.get('ultra_fast', False)
        )
        
        # Apply fingerprinting
        await self.antibot.apply_to_context(context, profile=profile)
        await self._log_progress(f"Applied {profile} fingerprint", progress_callback)
        
        # Create page
        page = await self.engine.new_page(context)
        await self.antibot.apply_to_page(page)
        
        try:
            # Navigate with retry
            await self._log_progress(f"Navigating to {url}", progress_callback)
            success = await self.engine.navigate_with_retry(page, url)
            
            if not success:
                raise Exception(f"Failed to navigate to {url}")
            
            # Check for CAPTCHA
            captcha_result = await self.antibot.detect_captcha(page)
            if captcha_result['detected']:
                await self._log_progress(
                    f"⚠️ CAPTCHA detected: {captcha_result['type']}", 
                    progress_callback
                )
                # Handle CAPTCHA (could wait for manual solve or use solver)
                await self.antibot.behavior_simulator.random_delay(5, 10)
            
            # Simulate human behavior if enabled
            if simulate_behavior:
                await self._log_progress("Simulating human behavior", progress_callback)
                await self.antibot.simulate_natural_browsing(page)
            
            # Extract data
            await self._log_progress("Extracting data", progress_callback)
            data = await self._extract_data(page)
            
            return data
            
        finally:
            await context.close()
    
    async def _extract_data(self, page: Page) -> List[Dict[str, Any]]:
        """Extract data from page."""
        # Your extraction logic here
        return [{'example': 'data'}]
    
    # Required abstract methods
    def get_input_schema(self):
        return {
            'url': {'type': 'string', 'required': True},
            'use_proxy': {'type': 'boolean', 'default': True},
            'fingerprint_profile': {'type': 'string', 'default': 'windows_chrome'},
            'simulate_behavior': {'type': 'boolean', 'default': True}
        }
    
    def get_output_schema(self):
        return {'data': 'array of extracted items'}
    
    @classmethod
    def get_name(cls):
        return "Enhanced Scraper Example"
    
    @classmethod
    def get_description(cls):
        return "Example scraper with full anti-bot integration"
    
    @classmethod
    def get_category(cls):
        return "Example"
    
    @classmethod
    def get_icon(cls):
        return "🛡️"


# ============================================================================
# EXAMPLE 2: Simple Integration
# ============================================================================

async def simple_scrape_with_antibot(url: str):
    """
    Simple example showing minimal anti-bot integration.
    """
    # Initialize components
    engine = ScraperEngine()
    antibot = AntiBotManager()
    
    await engine.initialize()
    
    try:
        # Create context and apply anti-bot
        context = await engine.create_context(use_proxy=True)
        await antibot.apply_to_context(context, profile="windows_chrome")
        
        # Create page
        page = await engine.new_page(context)
        await antibot.apply_to_page(page)
        
        # Navigate
        await page.goto(url)
        
        # Simulate behavior
        await antibot.simulate_human_behavior(page)
        
        # Get data
        title = await page.title()
        
        await context.close()
        return {'title': title}
        
    finally:
        await engine.cleanup()


# ============================================================================
# EXAMPLE 3: Advanced Form Submission with Anti-Bot
# ============================================================================

async def form_submission_with_antibot(url: str, form_data: Dict[str, str]):
    """
    Advanced example: Form submission with full human behavior simulation.
    """
    engine = ScraperEngine()
    antibot = AntiBotManager()
    
    await engine.initialize()
    
    try:
        # Setup
        context = await engine.create_context(use_proxy=True)
        await antibot.apply_to_context(context, profile="windows_chrome")
        
        page = await engine.new_page(context)
        await antibot.apply_to_page(page)
        
        # Navigate
        await page.goto(url)
        await antibot.behavior_simulator.random_delay(1, 2)
        
        # Fill form with human-like behavior
        await antibot.behavior_simulator.simulate_form_interaction(
            page,
            form_data,
            submit_selector="#submit-button"
        )
        
        # Wait for response
        await page.wait_for_load_state('networkidle')
        
        # Check for CAPTCHA after submission
        captcha = await antibot.detect_captcha(page)
        if captcha['detected']:
            logger.warning(f"CAPTCHA after submission: {captcha['type']}")
            # Handle accordingly
        
        # Get result
        result = await page.content()
        
        await context.close()
        return result
        
    finally:
        await engine.cleanup()


# ============================================================================
# EXAMPLE 4: Multi-Page Scraping with Behavior Simulation
# ============================================================================

async def multi_page_scrape_with_antibot(start_url: str, max_pages: int = 10):
    """
    Scrape multiple pages with realistic browsing behavior.
    """
    engine = ScraperEngine()
    antibot = AntiBotManager()
    
    await engine.initialize()
    
    results = []
    
    try:
        context = await engine.create_context(use_proxy=True)
        await antibot.apply_to_context(context, profile="windows_chrome")
        
        page = await engine.new_page(context)
        await antibot.apply_to_page(page)
        
        current_url = start_url
        
        for page_num in range(max_pages):
            logger.info(f"Scraping page {page_num + 1}/{max_pages}")
            
            # Navigate
            await page.goto(current_url)
            
            # Simulate reading behavior
            await antibot.behavior_simulator.simulate_reading(page, duration=3)
            await antibot.behavior_simulator.random_scroll(page, pattern='reading')
            
            # Check for CAPTCHA
            captcha = await antibot.detect_captcha(page)
            if captcha['detected']:
                logger.error(f"CAPTCHA on page {page_num + 1}")
                break
            
            # Extract data
            data = await page.evaluate("""
                () => {
                    return {
                        title: document.title,
                        items: [...document.querySelectorAll('.item')].map(el => el.textContent)
                    }
                }
            """)
            results.append(data)
            
            # Find next page link
            next_link = await page.query_selector('a.next-page')
            if not next_link:
                break
            
            # Click next with human-like behavior
            await antibot.behavior_simulator.simulate_click_with_movement(
                page,
                'a.next-page',
                human_like=True
            )
            
            # Wait for navigation
            await page.wait_for_load_state('networkidle')
            
            # Random delay between pages
            await antibot.behavior_simulator.random_delay(2, 4)
        
        await context.close()
        return results
        
    finally:
        await engine.cleanup()


# ============================================================================
# EXAMPLE 5: Testing Different Fingerprint Profiles
# ============================================================================

async def test_fingerprint_profiles(url: str):
    """
    Test scraping with different fingerprint profiles.
    """
    engine = ScraperEngine()
    antibot = AntiBotManager()
    
    await engine.initialize()
    
    profiles = [
        'windows_chrome',
        'mac_chrome',
        'linux_chrome',
        'mobile_android'
    ]
    
    results = {}
    
    for profile in profiles:
        logger.info(f"Testing profile: {profile}")
        
        try:
            context = await engine.create_context(use_proxy=False)
            await antibot.apply_to_context(context, profile=profile)
            
            page = await engine.new_page(context)
            await antibot.apply_to_page(page)
            
            await page.goto(url)
            await antibot.behavior_simulator.random_delay(1, 2)
            
            # Check what the site sees
            fingerprint_data = await page.evaluate("""
                () => {
                    return {
                        userAgent: navigator.userAgent,
                        platform: navigator.platform,
                        hardwareConcurrency: navigator.hardwareConcurrency,
                        deviceMemory: navigator.deviceMemory,
                        language: navigator.language,
                        languages: navigator.languages,
                        screenWidth: screen.width,
                        screenHeight: screen.height,
                        colorDepth: screen.colorDepth,
                        webdriver: navigator.webdriver
                    }
                }
            """)
            
            results[profile] = fingerprint_data
            
            await context.close()
            
        except Exception as e:
            logger.error(f"Error testing {profile}: {e}")
            results[profile] = {'error': str(e)}
    
    await engine.cleanup()
    
    return results


# ============================================================================
# EXAMPLE 6: Handling Protected E-commerce Sites
# ============================================================================

async def scrape_protected_ecommerce(product_url: str):
    """
    Scrape protected e-commerce sites with full anti-bot measures.
    """
    engine = ScraperEngine()
    antibot = AntiBotManager()
    
    await engine.initialize()
    
    try:
        # Use best profile for e-commerce
        context = await engine.create_context(use_proxy=True)
        await antibot.apply_to_context(context, profile="windows_chrome")
        
        page = await engine.new_page(context)
        await antibot.apply_to_page(page)
        
        # Navigate to product
        await page.goto(product_url)
        
        # Initial reading behavior
        await antibot.behavior_simulator.simulate_reading(page, duration=3)
        
        # Scroll to product details
        await antibot.behavior_simulator.random_scroll(page, scroll_count=2, pattern='reading')
        
        # Check for challenges
        challenge_handled = await antibot.handle_challenge(page)
        if challenge_handled:
            logger.info("Challenge detected and handling attempted")
        
        # Extract product data
        product_data = await page.evaluate("""
            () => {
                return {
                    title: document.querySelector('h1')?.textContent || '',
                    price: document.querySelector('.price')?.textContent || '',
                    rating: document.querySelector('.rating')?.textContent || '',
                    availability: document.querySelector('.availability')?.textContent || ''
                }
            }
        """)
        
        # Simulate looking at images
        await antibot.behavior_simulator.simulate_mouse_movement(page)
        await antibot.behavior_simulator.random_delay(1, 2)
        
        await context.close()
        return product_data
        
    finally:
        await engine.cleanup()


# ============================================================================
# Main - Run Examples
# ============================================================================

async def main():
    """Run example integrations."""
    
    # Example 1: Simple scrape
    logger.info("=== Example 1: Simple Scrape ===")
    result1 = await simple_scrape_with_antibot("https://example.com")
    logger.info(f"Result: {result1}")
    
    # Example 2: Test fingerprints
    logger.info("\n=== Example 2: Test Fingerprints ===")
    result2 = await test_fingerprint_profiles("https://httpbin.org/headers")
    logger.info(f"Fingerprint test results: {result2}")
    
    # Add more examples as needed


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
