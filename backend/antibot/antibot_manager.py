"""
AntiBot Manager - Central coordinator for all anti-bot detection services.

This is the main interface that scrapers use to access all anti-bot capabilities.
It coordinates between different services and provides a unified API.
"""

import logging
from typing import Optional, Dict, Any
from playwright.async_api import Page, BrowserContext

from .fingerprint_service import FingerprintService
from .user_agent_service import UserAgentService
from .behavior_simulator import BehaviorSimulator
from .captcha_detector import CaptchaDetector
from .stealth_enhancer import StealthEnhancer

logger = logging.getLogger(__name__)


class AntiBotManager:
    """
    Central manager for all anti-bot detection and evasion capabilities.
    
    Usage:
        antibot = AntiBotManager()
        await antibot.apply_to_context(context)
        await antibot.apply_to_page(page)
        await antibot.simulate_human_behavior(page)
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize AntiBot Manager with all services.
        
        Args:
            config: Optional configuration dictionary
        """
        self.config = config or {}
        
        # Initialize all services
        self.fingerprint_service = FingerprintService()
        self.user_agent_service = UserAgentService()
        self.behavior_simulator = BehaviorSimulator()
        self.captcha_detector = CaptchaDetector()
        self.stealth_enhancer = StealthEnhancer()
        
        logger.info("🛡️ AntiBot Manager initialized with all services")
    
    async def apply_to_context(self, context: BrowserContext, profile: str = "default") -> None:
        """
        Apply anti-bot measures to a browser context.
        
        Args:
            context: Playwright browser context
            profile: Fingerprint profile to use ('default', 'windows', 'mac', 'linux', 'mobile')
        """
        logger.info(f"Applying anti-bot measures to context (profile: {profile})")
        
        # Apply stealth init scripts
        await self.stealth_enhancer.apply_context_stealth(context)
        
        # Apply fingerprinting
        await self.fingerprint_service.apply_fingerprint(context, profile)
        
        logger.info("✅ Anti-bot measures applied to context")
    
    async def apply_to_page(self, page: Page, enable_all: bool = True) -> None:
        """
        Apply anti-bot measures to a specific page.
        
        Args:
            page: Playwright page
            enable_all: Enable all anti-detection features
        """
        logger.info("Applying anti-bot measures to page")
        
        if enable_all:
            # Apply advanced stealth techniques
            await self.stealth_enhancer.apply_page_stealth(page)
            
            # Apply page-specific fingerprinting
            await self.fingerprint_service.apply_page_fingerprint(page)
        
        logger.info("✅ Anti-bot measures applied to page")
    
    async def simulate_human_behavior(self, page: Page, 
                                     mouse_movement: bool = True,
                                     random_scrolls: bool = True,
                                     random_delays: bool = True) -> None:
        """
        Simulate human-like behavior on a page.
        
        Args:
            page: Playwright page
            mouse_movement: Enable mouse movement simulation
            random_scrolls: Enable random scrolling
            random_delays: Enable random delays
        """
        if mouse_movement:
            await self.behavior_simulator.simulate_mouse_movement(page)
        
        if random_scrolls:
            await self.behavior_simulator.random_scroll(page)
        
        if random_delays:
            await self.behavior_simulator.random_delay()
    
    async def detect_captcha(self, page: Page) -> Dict[str, Any]:
        """
        Detect if a CAPTCHA is present on the page.
        
        Args:
            page: Playwright page
            
        Returns:
            Dictionary with detection results:
            {
                'detected': bool,
                'type': str,  # 'recaptcha', 'hcaptcha', 'cloudflare', etc.
                'selectors': list
            }
        """
        return await self.captcha_detector.detect(page)
    
    def get_user_agent(self, device_type: str = "desktop", 
                      os: str = "windows") -> Dict[str, str]:
        """
        Get a random user agent with matching browser profile.
        
        Args:
            device_type: 'desktop', 'mobile', 'tablet'
            os: 'windows', 'mac', 'linux', 'android', 'ios'
            
        Returns:
            Dictionary with user_agent, platform, and vendor
        """
        return self.user_agent_service.get_random_user_agent(device_type, os)
    
    def get_headers(self, user_agent: Optional[str] = None) -> Dict[str, str]:
        """
        Get realistic HTTP headers.
        
        Args:
            user_agent: Optional specific user agent
            
        Returns:
            Dictionary of HTTP headers
        """
        return self.stealth_enhancer.get_realistic_headers(user_agent)
    
    async def handle_challenge(self, page: Page) -> bool:
        """
        Attempt to handle common anti-bot challenges.
        
        Args:
            page: Playwright page
            
        Returns:
            True if challenge was handled, False otherwise
        """
        # Check for CAPTCHA
        captcha_result = await self.detect_captcha(page)
        if captcha_result['detected']:
            logger.warning(f"CAPTCHA detected: {captcha_result['type']}")
            # Framework ready for CAPTCHA solving integration
            return False
        
        # Check for Cloudflare challenge
        cloudflare_detected = await self._detect_cloudflare(page)
        if cloudflare_detected:
            logger.warning("Cloudflare challenge detected")
            # Wait for challenge to resolve
            await self.behavior_simulator.random_delay(min_delay=3, max_delay=6)
            return True
        
        return False
    
    async def _detect_cloudflare(self, page: Page) -> bool:
        """Detect Cloudflare challenge page."""
        try:
            title = await page.title()
            content = await page.content()
            
            cloudflare_indicators = [
                'Just a moment' in title,
                'Cloudflare' in title,
                'cf-browser-verification' in content,
                'challenge-platform' in content
            ]
            
            return any(cloudflare_indicators)
        except Exception:
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the anti-bot system.
        
        Returns:
            Dictionary with system statistics
        """
        return {
            'fingerprint_profiles': self.fingerprint_service.get_available_profiles(),
            'user_agents_count': self.user_agent_service.get_user_agent_count(),
            'behavior_patterns': self.behavior_simulator.get_available_patterns(),
            'captcha_types_supported': self.captcha_detector.get_supported_types(),
            'version': '1.0.0'
        }
