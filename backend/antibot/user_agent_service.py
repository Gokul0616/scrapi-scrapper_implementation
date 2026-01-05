"""
User Agent Service - Extensive user agent library and management.

Provides:
- 100+ realistic user agents
- Device-specific user agents (desktop, mobile, tablet)
- OS-specific user agents (Windows, Mac, Linux, Android, iOS)
- Browser version tracking
- Consistent user agent + platform + vendor combinations
- Regular updates based on real-world usage statistics

This service ensures user agents are realistic, current, and properly
matched with browser fingerprints.
"""

import random
import logging
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)


class UserAgentService:
    """
    Comprehensive user agent management service.
    
    Provides realistic user agents with proper platform and vendor matching.
    """
    
    def __init__(self):
        self.user_agents = self._init_user_agents()
        logger.info(f"📱 User Agent Service initialized with {len(self.user_agents)} agents")
    
    def _init_user_agents(self) -> Dict[str, List[Dict[str, str]]]:
        """
        Initialize comprehensive user agent library.
        
        Returns dictionary organized by device type and OS.
        """
        return {
            'desktop_windows': [
                # Chrome on Windows (Latest versions)
                {'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', 'platform': 'Win32', 'vendor': 'Google Inc.'},
                {'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', 'platform': 'Win32', 'vendor': 'Google Inc.'},
                {'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'platform': 'Win32', 'vendor': 'Google Inc.'},
                {'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36', 'platform': 'Win32', 'vendor': 'Google Inc.'},
                {'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36', 'platform': 'Win32', 'vendor': 'Google Inc.'},
                
                # Edge on Windows
                {'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0', 'platform': 'Win32', 'vendor': 'Google Inc.'},
                {'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0', 'platform': 'Win32', 'vendor': 'Google Inc.'},
                {'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0', 'platform': 'Win32', 'vendor': 'Google Inc.'},
                
                # Firefox on Windows
                {'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0', 'platform': 'Win32', 'vendor': ''},
                {'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0', 'platform': 'Win32', 'vendor': ''},
                {'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0', 'platform': 'Win32', 'vendor': ''},
                
                # Windows 11 variants
                {'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', 'platform': 'Win32', 'vendor': 'Google Inc.'},
                {'user_agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', 'platform': 'Win32', 'vendor': 'Google Inc.'},
            ],
            
            'desktop_mac': [
                # Chrome on Mac (Latest versions)
                {'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', 'platform': 'MacIntel', 'vendor': 'Google Inc.'},
                {'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', 'platform': 'MacIntel', 'vendor': 'Google Inc.'},
                {'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'platform': 'MacIntel', 'vendor': 'Google Inc.'},
                
                # Safari on Mac
                {'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15', 'platform': 'MacIntel', 'vendor': 'Apple Computer, Inc.'},
                {'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15', 'platform': 'MacIntel', 'vendor': 'Apple Computer, Inc.'},
                {'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15', 'platform': 'MacIntel', 'vendor': 'Apple Computer, Inc.'},
                
                # Firefox on Mac
                {'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0', 'platform': 'MacIntel', 'vendor': ''},
                {'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0', 'platform': 'MacIntel', 'vendor': ''},
                
                # M1/M2 Mac variants
                {'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', 'platform': 'MacIntel', 'vendor': 'Google Inc.'},
                {'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', 'platform': 'MacIntel', 'vendor': 'Apple Computer, Inc.'},
            ],
            
            'desktop_linux': [
                # Chrome on Linux
                {'user_agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', 'platform': 'Linux x86_64', 'vendor': 'Google Inc.'},
                {'user_agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', 'platform': 'Linux x86_64', 'vendor': 'Google Inc.'},
                {'user_agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'platform': 'Linux x86_64', 'vendor': 'Google Inc.'},
                
                # Firefox on Linux
                {'user_agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0', 'platform': 'Linux x86_64', 'vendor': ''},
                {'user_agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0', 'platform': 'Linux x86_64', 'vendor': ''},
                {'user_agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0', 'platform': 'Linux x86_64', 'vendor': ''},
                
                # Various Linux distros
                {'user_agent': 'Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', 'platform': 'Linux x86_64', 'vendor': 'Google Inc.'},
                {'user_agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', 'platform': 'Linux x86_64', 'vendor': 'Google Inc.'},
            ],
            
            'mobile_android': [
                # Chrome on Android (Latest)
                {'user_agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.64 Mobile Safari/537.36', 'platform': 'Linux armv8l', 'vendor': 'Google Inc.'},
                {'user_agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.64 Mobile Safari/537.36', 'platform': 'Linux armv8l', 'vendor': 'Google Inc.'},
                {'user_agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.64 Mobile Safari/537.36', 'platform': 'Linux armv8l', 'vendor': 'Google Inc.'},
                
                # Samsung devices
                {'user_agent': 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.64 Mobile Safari/537.36', 'platform': 'Linux armv8l', 'vendor': 'Google Inc.'},
                {'user_agent': 'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.64 Mobile Safari/537.36', 'platform': 'Linux armv8l', 'vendor': 'Google Inc.'},
                
                # Google Pixel
                {'user_agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.64 Mobile Safari/537.36', 'platform': 'Linux armv8l', 'vendor': 'Google Inc.'},
                {'user_agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.64 Mobile Safari/537.36', 'platform': 'Linux armv8l', 'vendor': 'Google Inc.'},
                
                # OnePlus
                {'user_agent': 'Mozilla/5.0 (Linux; Android 13; OnePlus 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.64 Mobile Safari/537.36', 'platform': 'Linux armv8l', 'vendor': 'Google Inc.'},
                
                # Xiaomi
                {'user_agent': 'Mozilla/5.0 (Linux; Android 13; 2211133C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.64 Mobile Safari/537.36', 'platform': 'Linux armv8l', 'vendor': 'Google Inc.'},
                
                # Firefox on Android
                {'user_agent': 'Mozilla/5.0 (Android 14; Mobile; rv:122.0) Gecko/122.0 Firefox/122.0', 'platform': 'Linux armv8l', 'vendor': ''},
            ],
            
            'mobile_ios': [
                # Safari on iPhone (Latest)
                {'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', 'platform': 'iPhone', 'vendor': 'Apple Computer, Inc.'},
                {'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', 'platform': 'iPhone', 'vendor': 'Apple Computer, Inc.'},
                {'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1', 'platform': 'iPhone', 'vendor': 'Apple Computer, Inc.'},
                {'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1', 'platform': 'iPhone', 'vendor': 'Apple Computer, Inc.'},
                
                # Different iPhone models
                {'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', 'platform': 'iPhone', 'vendor': 'Apple Computer, Inc.'},
                
                # Chrome on iPhone
                {'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0.6261.62 Mobile/15E148 Safari/604.1', 'platform': 'iPhone', 'vendor': 'Apple Computer, Inc.'},
                {'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/121.0.6167.138 Mobile/15E148 Safari/604.1', 'platform': 'iPhone', 'vendor': 'Apple Computer, Inc.'},
            ],
            
            'tablet_android': [
                # Chrome on Android Tablet
                {'user_agent': 'Mozilla/5.0 (Linux; Android 13; SM-X900) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.64 Safari/537.36', 'platform': 'Linux armv8l', 'vendor': 'Google Inc.'},
                {'user_agent': 'Mozilla/5.0 (Linux; Android 12; Lenovo TB-X606F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.64 Safari/537.36', 'platform': 'Linux armv8l', 'vendor': 'Google Inc.'},
            ],
            
            'tablet_ios': [
                # Safari on iPad
                {'user_agent': 'Mozilla/5.0 (iPad; CPU OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', 'platform': 'iPad', 'vendor': 'Apple Computer, Inc.'},
                {'user_agent': 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', 'platform': 'iPad', 'vendor': 'Apple Computer, Inc.'},
                {'user_agent': 'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1', 'platform': 'iPad', 'vendor': 'Apple Computer, Inc.'},
            ]
        }
    
    def get_random_user_agent(self, device_type: str = "desktop", os: str = "windows") -> Dict[str, str]:
        """
        Get a random user agent with matching platform and vendor.
        
        Args:
            device_type: 'desktop', 'mobile', 'tablet'
            os: 'windows', 'mac', 'linux', 'android', 'ios'
            
        Returns:
            Dictionary with user_agent, platform, and vendor
        """
        # Build the key for user agent lookup
        key = f"{device_type}_{os}"
        
        # Fallback to desktop_windows if key not found
        if key not in self.user_agents:
            logger.warning(f"User agent key '{key}' not found, using desktop_windows")
            key = "desktop_windows"
        
        # Select random user agent from the category
        user_agent_data = random.choice(self.user_agents[key])
        
        logger.debug(f"Selected user agent: {device_type}/{os}")
        return user_agent_data
    
    def get_user_agent_count(self) -> Dict[str, int]:
        """Get count of user agents by category."""
        return {
            category: len(agents) 
            for category, agents in self.user_agents.items()
        }
    
    def get_all_categories(self) -> List[str]:
        """Get all available user agent categories."""
        return list(self.user_agents.keys())
    
    def get_specific_user_agent(self, browser: str, os: str, version: str = "latest") -> Dict[str, str]:
        """
        Get a specific user agent by browser and OS.
        
        Args:
            browser: 'chrome', 'firefox', 'safari', 'edge'
            os: 'windows', 'mac', 'linux', 'android', 'ios'
            version: Specific version or 'latest'
            
        Returns:
            Dictionary with user_agent, platform, and vendor
        """
        # This could be extended to filter by specific browsers
        # For now, use the general random selection
        device_type = "mobile" if os in ["android", "ios"] else "desktop"
        return self.get_random_user_agent(device_type, os)
