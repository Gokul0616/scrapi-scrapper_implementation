"""
CAPTCHA Detector - Detect various types of CAPTCHAs on web pages.

Supports detection of:
- reCAPTCHA v2 and v3
- hCaptcha
- Cloudflare Turnstile
- Image CAPTCHAs
- Custom CAPTCHAs

Provides framework for integrating CAPTCHA solving services:
- 2Captcha
- Anti-Captcha
- CapSolver
- Custom solvers

Note: This module detects CAPTCHAs. Actual solving requires
external service integration or custom implementation.
"""

import logging
from typing import Dict, Any, List, Optional
from playwright.async_api import Page

logger = logging.getLogger(__name__)


class CaptchaDetector:
    """
    CAPTCHA detection service.
    
    Identifies various CAPTCHA types on web pages and provides
    framework for solving integration.
    """
    
    def __init__(self):
        self.supported_types = [
            'recaptcha_v2',
            'recaptcha_v3',
            'hcaptcha',
            'cloudflare_turnstile',
            'funcaptcha',
            'image_captcha',
            'text_captcha'
        ]
        
        # Selectors for different CAPTCHA types
        self.selectors = {
            'recaptcha_v2': [
                'iframe[src*="recaptcha"]',
                '.g-recaptcha',
                'div[class*="recaptcha"]'
            ],
            'recaptcha_v3': [
                'script[src*="recaptcha/api.js"]',
                'script[src*="recaptcha/enterprise.js"]'
            ],
            'hcaptcha': [
                'iframe[src*="hcaptcha"]',
                '.h-captcha',
                'div[class*="hcaptcha"]'
            ],
            'cloudflare_turnstile': [
                'iframe[src*="challenges.cloudflare.com"]',
                'div[class*="cf-turnstile"]',
                '#cf-challenge-running'
            ],
            'funcaptcha': [
                'iframe[src*="funcaptcha"]',
                'iframe[src*="arkoselabs"]'
            ]
        }
    
    def get_supported_types(self) -> List[str]:
        """Get list of supported CAPTCHA types."""
        return self.supported_types
    
    async def detect(self, page: Page) -> Dict[str, Any]:
        """
        Detect if any CAPTCHA is present on the page.
        
        Args:
            page: Playwright page
            
        Returns:
            Dictionary with detection results:
            {
                'detected': bool,
                'type': str or None,
                'selectors': list,
                'confidence': float
            }
        """
        results = {
            'detected': False,
            'type': None,
            'selectors': [],
            'confidence': 0.0
        }
        
        # Check for each CAPTCHA type
        for captcha_type, selectors in self.selectors.items():
            for selector in selectors:
                try:
                    element = await page.query_selector(selector)
                    if element:
                        # Check if element is visible
                        is_visible = await element.is_visible()
                        if is_visible:
                            results['detected'] = True
                            results['type'] = captcha_type
                            results['selectors'].append(selector)
                            results['confidence'] = 0.9
                            
                            logger.info(f"🔍 CAPTCHA detected: {captcha_type}")
                            return results
                except Exception as e:
                    logger.debug(f"Error checking selector {selector}: {e}")
        
        # Check page content for CAPTCHA keywords
        if not results['detected']:
            content_detection = await self._detect_by_content(page)
            if content_detection['detected']:
                return content_detection
        
        logger.debug("No CAPTCHA detected")
        return results
    
    async def _detect_by_content(self, page: Page) -> Dict[str, Any]:
        """
        Detect CAPTCHA by analyzing page content and scripts.
        
        Args:
            page: Playwright page
            
        Returns:
            Detection results dictionary
        """
        results = {
            'detected': False,
            'type': None,
            'selectors': [],
            'confidence': 0.5  # Lower confidence for content-based detection
        }
        
        try:
            # Get page HTML
            content = await page.content()
            content_lower = content.lower()
            
            # Check for reCAPTCHA
            if 'google.com/recaptcha' in content_lower or 'grecaptcha' in content_lower:
                results['detected'] = True
                results['type'] = 'recaptcha_v3' if 'v3' in content_lower else 'recaptcha_v2'
                logger.info(f"🔍 CAPTCHA detected by content: {results['type']}")
                return results
            
            # Check for hCaptcha
            if 'hcaptcha' in content_lower:
                results['detected'] = True
                results['type'] = 'hcaptcha'
                logger.info(f"🔍 CAPTCHA detected by content: hCaptcha")
                return results
            
            # Check for Cloudflare
            if 'cloudflare' in content_lower and ('challenge' in content_lower or 'turnstile' in content_lower):
                results['detected'] = True
                results['type'] = 'cloudflare_turnstile'
                logger.info(f"🔍 CAPTCHA detected by content: Cloudflare Turnstile")
                return results
            
            # Check for FunCaptcha
            if 'funcaptcha' in content_lower or 'arkoselabs' in content_lower:
                results['detected'] = True
                results['type'] = 'funcaptcha'
                logger.info(f"🔍 CAPTCHA detected by content: FunCaptcha")
                return results
        
        except Exception as e:
            logger.error(f"Error in content-based CAPTCHA detection: {e}")
        
        return results
    
    async def wait_for_captcha_solve(self, page: Page, timeout: int = 120000) -> bool:
        """
        Wait for CAPTCHA to be solved (either manually or by solver).
        
        Args:
            page: Playwright page
            timeout: Maximum wait time in milliseconds
            
        Returns:
            True if CAPTCHA was solved, False if timeout
        """
        try:
            # Wait for CAPTCHA elements to disappear
            all_selectors = []
            for selectors in self.selectors.values():
                all_selectors.extend(selectors)
            
            # Check periodically if CAPTCHA is gone
            end_time = page.context.browser.playwright.loop.time() + (timeout / 1000)
            
            while page.context.browser.playwright.loop.time() < end_time:
                detection = await self.detect(page)
                if not detection['detected']:
                    logger.info("✅ CAPTCHA solved")
                    return True
                
                await page.wait_for_timeout(2000)  # Check every 2 seconds
            
            logger.warning("⏱️ CAPTCHA solve timeout")
            return False
        
        except Exception as e:
            logger.error(f"Error waiting for CAPTCHA solve: {e}")
            return False
    
    def get_solver_config(self, captcha_type: str, api_key: Optional[str] = None) -> Dict[str, Any]:
        """
        Get configuration for CAPTCHA solver integration.
        
        Args:
            captcha_type: Type of CAPTCHA
            api_key: API key for solver service
            
        Returns:
            Configuration dictionary for solver
        """
        # Framework for solver integration
        # Users can extend this with actual solver implementations
        
        config = {
            'type': captcha_type,
            'solver': None,
            'api_key': api_key,
            'supported_services': [
                '2captcha',
                'anti-captcha',
                'capsolver',
                'custom'
            ]
        }
        
        logger.info(f"CAPTCHA solver config for {captcha_type} prepared")
        return config
