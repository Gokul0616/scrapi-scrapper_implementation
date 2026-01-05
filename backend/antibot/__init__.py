"""
Centralized Anti-Bot Detection System for Scrapi

Provides comprehensive anti-bot evasion capabilities:
- Advanced browser fingerprinting
- Human-like behavior simulation
- Extensive user-agent rotation
- CAPTCHA detection
- Stealth enhancement
- Proxy management integration

All scrapers in the platform use this centralized system.
"""

from .antibot_manager import AntiBotManager
from .fingerprint_service import FingerprintService
from .user_agent_service import UserAgentService
from .behavior_simulator import BehaviorSimulator
from .captcha_detector import CaptchaDetector
from .stealth_enhancer import StealthEnhancer

__all__ = [
    'AntiBotManager',
    'FingerprintService',
    'UserAgentService',
    'BehaviorSimulator',
    'CaptchaDetector',
    'StealthEnhancer'
]

__version__ = '1.0.0'
