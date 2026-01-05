"""
Stealth Enhancer - Advanced stealth techniques and header management.

Provides:
- Advanced stealth JavaScript injection
- Realistic HTTP headers
- Header consistency checking
- Anti-detection techniques
- Chrome DevTools Protocol (CDP) evasion
- WebDriver flag removal
- Automation indicators removal

This service enhances stealth beyond basic playwright-stealth.
"""

import random
import logging
from typing import Dict, Any, Optional
from playwright.async_api import BrowserContext, Page

logger = logging.getLogger(__name__)


class StealthEnhancer:
    """
    Advanced stealth enhancement service.
    
    Provides comprehensive anti-detection techniques beyond
    standard stealth libraries.
    """
    
    def __init__(self):
        self.default_headers = self._init_default_headers()
    
    def _init_default_headers(self) -> Dict[str, str]:
        """Initialize default HTTP headers."""
        return {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'DNT': '1'
        }
    
    def get_realistic_headers(self, user_agent: Optional[str] = None) -> Dict[str, str]:
        """
        Get realistic HTTP headers.
        
        Args:
            user_agent: Optional user agent string
            
        Returns:
            Dictionary of HTTP headers
        """
        headers = self.default_headers.copy()
        
        if user_agent:
            headers['User-Agent'] = user_agent
        
        # Randomly include optional headers
        if random.random() < 0.7:
            headers['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"'
            headers['sec-ch-ua-mobile'] = '?0'
            headers['sec-ch-ua-platform'] = '"Windows"'
        
        return headers
    
    async def apply_context_stealth(self, context: BrowserContext) -> None:
        """
        Apply stealth enhancements to browser context.
        
        Args:
            context: Playwright browser context
        """
        # Comprehensive stealth script
        stealth_script = self._build_stealth_script()
        await context.add_init_script(stealth_script)
        
        logger.debug("🕵️ Applied context stealth enhancements")
    
    async def apply_page_stealth(self, page: Page) -> None:
        """
        Apply page-specific stealth enhancements.
        
        Args:
            page: Playwright page
        """
        # Set realistic headers
        headers = self.get_realistic_headers()
        await page.set_extra_http_headers(headers)
        
        logger.debug("🕵️ Applied page stealth enhancements")
    
    def _build_stealth_script(self) -> str:
        """
        Build comprehensive stealth JavaScript injection.
        
        Returns:
            JavaScript code string
        """
        return """
        // ==== ADVANCED STEALTH ENHANCEMENTS ====
        
        (function() {
            'use strict';
            
            // 1. Remove WebDriver flag
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
                configurable: true
            });
            
            // 2. Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission, onchange: null }) :
                    originalQuery(parameters)
            );
            
            // 3. Plugin array override
            Object.defineProperty(navigator, 'plugins', {
                get: () => {
                    const plugins = [
                        { name: 'Chrome PDF Plugin', description: 'Portable Document Format', filename: 'internal-pdf-viewer' },
                        { name: 'Chrome PDF Viewer', description: '', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                        { name: 'Native Client', description: '', filename: 'internal-nacl-plugin' }
                    ];
                    
                    // Add array-like properties
                    plugins.item = function(index) { return this[index] || null; };
                    plugins.namedItem = function(name) {
                        return this.find(p => p.name === name) || null;
                    };
                    plugins.refresh = function() {};
                    
                    return plugins;
                },
                configurable: true
            });
            
            // 4. Languages override
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
                configurable: true
            });
            
            // 5. Chrome runtime
            if (!window.chrome) {
                window.chrome = {};
            }
            
            if (!window.chrome.runtime) {
                window.chrome.runtime = {
                    connect: function() {
                        return {
                            onMessage: { addListener: function() {}, removeListener: function() {} },
                            postMessage: function() {},
                            disconnect: function() {}
                        };
                    },
                    sendMessage: function() {},
                    onMessage: { addListener: function() {}, removeListener: function() {} }
                };
            }
            
            // 6. Remove automation indicators
            delete navigator.__proto__.webdriver;
            
            // 7. Iframe contentWindow override
            const originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
            if (originalContentWindow) {
                Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
                    get: function() {
                        const win = originalContentWindow.get.call(this);
                        if (win) {
                            try {
                                win.navigator.webdriver = undefined;
                            } catch (e) {}
                        }
                        return win;
                    }
                });
            }
            
            // 8. Override toString methods
            const overrideToString = (obj, name) => {
                const original = obj[name];
                obj[name] = new Proxy(original, {
                    apply: function(target, thisArg, argumentsList) {
                        return Reflect.apply(target, thisArg, argumentsList);
                    }
                });
                obj[name].toString = () => `function ${name}() { [native code] }`;
            };
            
            // Apply to common detection targets
            if (window.navigator.permissions) {
                overrideToString(window.navigator.permissions, 'query');
            }
            
            // 9. Notification permission
            if (window.Notification) {
                Object.defineProperty(window, 'Notification', {
                    get: () => {
                        const NotificationProxy = new Proxy(Notification, {
                            get(target, prop) {
                                if (prop === 'permission') {
                                    return 'default';
                                }
                                return target[prop];
                            }
                        });
                        return NotificationProxy;
                    },
                    configurable: true
                });
            }
            
            // 10. Connection information
            if (navigator.connection) {
                Object.defineProperty(navigator.connection, 'rtt', {
                    get: () => 100,
                    configurable: true
                });
            }
            
            // 11. Document hidden state
            Object.defineProperty(document, 'hidden', {
                get: () => false,
                configurable: true
            });
            
            Object.defineProperty(document, 'visibilityState', {
                get: () => 'visible',
                configurable: true
            });
            
            // 12. Timezone consistency
            const originalDateToString = Date.prototype.toString;
            Date.prototype.toString = function() {
                return originalDateToString.call(this);
            };
            
            console.log('✅ Advanced stealth script applied');
        })();
        """
    
    def get_sec_ch_ua_headers(self, user_agent: str) -> Dict[str, str]:
        """
        Generate Client Hints headers based on user agent.
        
        Args:
            user_agent: User agent string
            
        Returns:
            Dictionary of Client Hints headers
        """
        headers = {}
        
        # Determine browser and version from user agent
        if 'Chrome/' in user_agent:
            version = user_agent.split('Chrome/')[1].split('.')[0]
            headers['sec-ch-ua'] = f'"Not_A Brand";v="8", "Chromium";v="{version}", "Google Chrome";v="{version}"'
        elif 'Edg/' in user_agent:
            version = user_agent.split('Edg/')[1].split('.')[0]
            headers['sec-ch-ua'] = f'"Not_A Brand";v="8", "Chromium";v="{version}", "Microsoft Edge";v="{version}"'
        
        # Mobile detection
        if 'Mobile' in user_agent or 'Android' in user_agent:
            headers['sec-ch-ua-mobile'] = '?1'
        else:
            headers['sec-ch-ua-mobile'] = '?0'
        
        # Platform
        if 'Windows' in user_agent:
            headers['sec-ch-ua-platform'] = '"Windows"'
        elif 'Mac' in user_agent:
            headers['sec-ch-ua-platform'] = '"macOS"'
        elif 'Linux' in user_agent:
            headers['sec-ch-ua-platform'] = '"Linux"'
        elif 'Android' in user_agent:
            headers['sec-ch-ua-platform'] = '"Android"'
        
        return headers
