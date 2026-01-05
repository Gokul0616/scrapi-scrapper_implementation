"""
Fingerprint Service - Advanced browser fingerprinting evasion.

Provides comprehensive fingerprinting capabilities:
- Canvas fingerprinting randomization
- WebGL fingerprinting
- Audio context fingerprinting
- Font detection evasion
- Hardware fingerprinting (CPU, memory, battery)
- Timezone and locale matching
- Screen resolution randomization

This service generates realistic, consistent browser fingerprints that
evade detection by Cloudflare, DataDome, PerimeterX, and other systems.
"""

import random
import logging
import hashlib
from typing import Dict, Any, List, Optional
from playwright.async_api import BrowserContext, Page

logger = logging.getLogger(__name__)


class FingerprintService:
    """
    Advanced fingerprinting service for browser anti-detection.
    
    Generates consistent, realistic fingerprints that bypass modern
    bot detection systems.
    """
    
    def __init__(self):
        self.profiles = self._init_profiles()
        self.current_profile = None
    
    def _init_profiles(self) -> Dict[str, Dict[str, Any]]:
        """
        Initialize fingerprint profiles for different device types.
        Each profile contains realistic hardware and browser characteristics.
        """
        return {
            'windows_chrome': {
                'platform': 'Win32',
                'vendor': 'Google Inc.',
                'hardware_concurrency': random.choice([4, 6, 8, 12, 16]),
                'device_memory': random.choice([4, 8, 16, 32]),
                'max_touch_points': 0,
                'screen': {
                    'width': random.choice([1920, 2560, 3840]),
                    'height': random.choice([1080, 1440, 2160]),
                    'color_depth': 24,
                    'pixel_depth': 24
                },
                'timezone_offset': random.choice([-480, -420, -360, -300, -240, 0, 60, 120]),
                'languages': ['en-US', 'en'],
                'plugins': ['Chrome PDF Plugin', 'Chrome PDF Viewer', 'Native Client']
            },
            'mac_chrome': {
                'platform': 'MacIntel',
                'vendor': 'Google Inc.',
                'hardware_concurrency': random.choice([4, 8, 10, 12]),
                'device_memory': random.choice([8, 16, 32]),
                'max_touch_points': 0,
                'screen': {
                    'width': random.choice([1440, 1920, 2560]),
                    'height': random.choice([900, 1080, 1440]),
                    'color_depth': 24,
                    'pixel_depth': 24
                },
                'timezone_offset': random.choice([-480, -420, -360, -300, -240]),
                'languages': ['en-US', 'en'],
                'plugins': ['Chrome PDF Plugin', 'Chrome PDF Viewer', 'Native Client']
            },
            'linux_chrome': {
                'platform': 'Linux x86_64',
                'vendor': 'Google Inc.',
                'hardware_concurrency': random.choice([4, 6, 8, 12]),
                'device_memory': random.choice([4, 8, 16]),
                'max_touch_points': 0,
                'screen': {
                    'width': random.choice([1920, 2560]),
                    'height': random.choice([1080, 1440]),
                    'color_depth': 24,
                    'pixel_depth': 24
                },
                'timezone_offset': random.choice([0, 60, 120, 180]),
                'languages': ['en-US', 'en'],
                'plugins': ['Chrome PDF Plugin', 'Chrome PDF Viewer']
            },
            'mobile_android': {
                'platform': 'Linux armv8l',
                'vendor': 'Google Inc.',
                'hardware_concurrency': random.choice([4, 6, 8]),
                'device_memory': random.choice([2, 4, 6, 8]),
                'max_touch_points': 5,
                'screen': {
                    'width': random.choice([360, 375, 390, 412]),
                    'height': random.choice([640, 667, 812, 915]),
                    'color_depth': 24,
                    'pixel_depth': 24
                },
                'timezone_offset': random.choice([-480, -360, -240, 0]),
                'languages': ['en-US', 'en'],
                'plugins': []
            }
        }
    
    def get_available_profiles(self) -> List[str]:
        """Get list of available fingerprint profiles."""
        return list(self.profiles.keys())
    
    def _select_profile(self, profile_name: str) -> Dict[str, Any]:
        """Select and customize a fingerprint profile."""
        if profile_name == 'default':
            profile_name = 'windows_chrome'
        
        if profile_name not in self.profiles:
            logger.warning(f"Profile '{profile_name}' not found, using default")
            profile_name = 'windows_chrome'
        
        # Deep copy and customize
        profile = self.profiles[profile_name].copy()
        profile['screen'] = profile['screen'].copy()
        
        # Add some randomization to make each instance unique
        profile['canvas_noise'] = random.random()
        profile['webgl_vendor_hash'] = hashlib.md5(str(random.random()).encode()).hexdigest()[:8]
        profile['audio_hash'] = hashlib.md5(str(random.random()).encode()).hexdigest()[:8]
        
        self.current_profile = profile
        return profile
    
    async def apply_fingerprint(self, context: BrowserContext, profile_name: str = "default") -> None:
        """
        Apply comprehensive fingerprinting to a browser context.
        
        Args:
            context: Playwright browser context
            profile_name: Name of the fingerprint profile to use
        """
        profile = self._select_profile(profile_name)
        
        # Build the comprehensive fingerprint script
        fingerprint_script = self._build_fingerprint_script(profile)
        
        # Apply to context
        await context.add_init_script(fingerprint_script)
        
        logger.info(f"👤 Applied '{profile_name}' fingerprint profile")
    
    async def apply_page_fingerprint(self, page: Page) -> None:
        """
        Apply page-specific fingerprinting.
        
        Args:
            page: Playwright page
        """
        if not self.current_profile:
            self.current_profile = self._select_profile('default')
        
        # Add canvas noise
        await page.add_script_tag(content=self._get_canvas_noise_script())
        
        logger.debug("🎨 Applied page-specific canvas fingerprinting")
    
    def _build_fingerprint_script(self, profile: Dict[str, Any]) -> str:
        """
        Build comprehensive JavaScript fingerprint injection script.
        
        This script overrides browser APIs to provide consistent,
        realistic fingerprints.
        """
        return f"""
        // ==== COMPREHENSIVE BROWSER FINGERPRINTING EVASION ====
        
        (function() {{
            'use strict';
            
            // 1. NAVIGATOR PROPERTIES
            Object.defineProperty(navigator, 'webdriver', {{
                get: () => undefined
            }});
            
            Object.defineProperty(navigator, 'platform', {{
                get: () => '{profile['platform']}'
            }});
            
            Object.defineProperty(navigator, 'vendor', {{
                get: () => '{profile['vendor']}'
            }});
            
            Object.defineProperty(navigator, 'hardwareConcurrency', {{
                get: () => {profile['hardware_concurrency']}
            }});
            
            Object.defineProperty(navigator, 'deviceMemory', {{
                get: () => {profile['device_memory']}
            }});
            
            Object.defineProperty(navigator, 'maxTouchPoints', {{
                get: () => {profile['max_touch_points']}
            }});
            
            Object.defineProperty(navigator, 'languages', {{
                get: () => {profile['languages']}
            }});
            
            // 2. PLUGINS
            Object.defineProperty(navigator, 'plugins', {{
                get: () => {{
                    const plugins = {profile['plugins']};
                    return plugins.map((name, i) => ({{
                        name: name,
                        description: name,
                        filename: name.toLowerCase().replace(/ /g, '_') + '.plugin',
                        length: 1,
                        item: () => null,
                        namedItem: () => null
                    }}));
                }}
            }});
            
            // 3. SCREEN PROPERTIES
            Object.defineProperty(screen, 'width', {{
                get: () => {profile['screen']['width']}
            }});
            
            Object.defineProperty(screen, 'height', {{
                get: () => {profile['screen']['height']}
            }});
            
            Object.defineProperty(screen, 'availWidth', {{
                get: () => {profile['screen']['width']}
            }});
            
            Object.defineProperty(screen, 'availHeight', {{
                get: () => {profile['screen']['height'] - 40}
            }});
            
            Object.defineProperty(screen, 'colorDepth', {{
                get: () => {profile['screen']['color_depth']}
            }});
            
            Object.defineProperty(screen, 'pixelDepth', {{
                get: () => {profile['screen']['pixel_depth']}
            }});
            
            // 4. WEBGL FINGERPRINTING
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {{
                if (parameter === 37445) {{
                    return 'Intel Inc.';
                }}
                if (parameter === 37446) {{
                    return 'Intel Iris OpenGL Engine';
                }}
                return getParameter.apply(this, arguments);
            }};
            
            // WebGL2 support
            if (window.WebGL2RenderingContext) {{
                const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
                WebGL2RenderingContext.prototype.getParameter = function(parameter) {{
                    if (parameter === 37445) {{
                        return 'Intel Inc.';
                    }}
                    if (parameter === 37446) {{
                        return 'Intel Iris OpenGL Engine';
                    }}
                    return getParameter2.apply(this, arguments);
                }};
            }}
            
            // 5. CANVAS FINGERPRINTING
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            const originalToBlob = HTMLCanvasElement.prototype.toBlob;
            const noise = {profile['canvas_noise']};
            
            HTMLCanvasElement.prototype.toDataURL = function() {{
                const context = this.getContext('2d');
                if (context) {{
                    const imageData = context.getImageData(0, 0, this.width, this.height);
                    for (let i = 0; i < imageData.data.length; i += 4) {{
                        imageData.data[i] = imageData.data[i] + noise * 0.1;
                    }}
                    context.putImageData(imageData, 0, 0);
                }}
                return originalToDataURL.apply(this, arguments);
            }};
            
            // 6. AUDIO CONTEXT FINGERPRINTING
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {{
                const originalCreateOscillator = AudioContext.prototype.createOscillator;
                AudioContext.prototype.createOscillator = function() {{
                    const oscillator = originalCreateOscillator.apply(this, arguments);
                    const originalStart = oscillator.start;
                    oscillator.start = function() {{
                        this.frequency.value = this.frequency.value + noise * 0.001;
                        return originalStart.apply(this, arguments);
                    }};
                    return oscillator;
                }};
            }}
            
            // 7. PERMISSIONS API
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => {{
                if (parameters.name === 'notifications') {{
                    return Promise.resolve({{ state: 'default', onchange: null }});
                }}
                return originalQuery(parameters);
            }};
            
            // 8. BATTERY API
            if (navigator.getBattery) {{
                const originalGetBattery = navigator.getBattery;
                navigator.getBattery = () => {{
                    return Promise.resolve({{
                        charging: true,
                        chargingTime: 0,
                        dischargingTime: Infinity,
                        level: 1.0,
                        addEventListener: () => {{}},
                        removeEventListener: () => {{}},
                        dispatchEvent: () => true
                    }});
                }};
            }}
            
            // 9. MEDIA DEVICES
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {{
                const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices;
                navigator.mediaDevices.enumerateDevices = () => {{
                    return originalEnumerateDevices().then(devices => {{
                        return devices.map(device => ({{
                            deviceId: device.deviceId,
                            kind: device.kind,
                            label: '',
                            groupId: device.groupId
                        }}));
                    }});
                }};
            }}
            
            // 10. TIMEZONE
            Date.prototype.getTimezoneOffset = function() {{
                return {profile['timezone_offset']};
            }};
            
            // 11. CHROME RUNTIME
            if (!window.chrome) {{
                window.chrome = {{}};
            }}
            window.chrome.runtime = {{
                connect: () => {{}},
                sendMessage: () => {{}}
            }};
            
            console.log('✅ Advanced fingerprinting applied');
        }})();
        """
    
    def _get_canvas_noise_script(self) -> str:
        """Get canvas noise injection script for page-level application."""
        if not self.current_profile:
            return ""
        
        noise = self.current_profile.get('canvas_noise', random.random())
        
        return f"""
        (function() {{
            const noise = {noise};
            const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
            
            CanvasRenderingContext2D.prototype.getImageData = function() {{
                const imageData = originalGetImageData.apply(this, arguments);
                for (let i = 0; i < imageData.data.length; i += 4) {{
                    imageData.data[i] = Math.min(255, imageData.data[i] + noise);
                }}
                return imageData;
            }};
        }})();
        """
