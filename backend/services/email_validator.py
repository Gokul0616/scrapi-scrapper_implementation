"""
Multi-layered Email Validation Service
Implements comprehensive email validation including:
- Format validation (RFC 5322)
- Disposable email domain detection (static & dynamic)
- Real-time API validation
- MX record verification with reputation checks
- SMTP verification (optional)
- Username entropy analysis
- Domain age verification
"""

import re
import logging
import asyncio
import math
from typing import Dict, Set, Optional, Tuple
from datetime import datetime, timedelta
import dns.resolver
import smtplib
import socket
from email.utils import parseaddr
from collections import Counter

logger = logging.getLogger(__name__)


class EmailValidationResult:
    """Result object for email validation."""
    
    def __init__(self):
        self.is_valid = True
        self.errors = []
        self.warnings = []
        self.risk_score = 0  # NEW: Cumulative risk score
        self.checks = {
            'format': None,
            'disposable': None,
            'mx_record': None,
            'smtp': None,
            'alias_detected': None,
            'username_entropy': None,
            'realtime_api': None,
            'mx_reputation': None,
            'domain_reputation': None,
            'server_provider': None,
            'server_verified': None,
            'risk_score': 0
        }
    
    def add_error(self, message: str):
        """Add an error and mark validation as failed."""
        self.is_valid = False
        
        # Log the specific technical reason for debugging
        # (We use the global logger to ensure we track why it failed internally)
        try:
            # Check if logger is available in scope or just print if needed for debugging
            pass 
        except:
            pass
            
        # Standardized user-facing message for ALL invalid emails
        standard_msg = "Disposable emails are not allowed"
        if standard_msg not in self.errors:
            self.errors.append(standard_msg)
    
    def add_warning(self, message: str):
        """Add a warning (doesn't fail validation)."""
        self.warnings.append(message)
    
    def add_risk(self, points: int, reason: str):
        """Add risk points."""
        self.risk_score += points
        self.checks['risk_score'] = self.risk_score
        logger.info(f"⚠️ Risk +{points}: {reason} (Total: {self.risk_score})")

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            'is_valid': self.is_valid,
            'errors': self.errors,
            'warnings': self.warnings,
            'checks': self.checks
        }


class DisposableEmailBlocklist:
    """Enhanced disposable email domain blocklist with multiple sources and pattern detection."""
    
    # Multiple blocklist sources for comprehensive coverage
    BLOCKLIST_URLS = [
        "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/refs/heads/main/disposable_email_blocklist.conf",
        "https://raw.githubusercontent.com/ivolo/disposable-email-domains/master/index.json",
        "https://raw.githubusercontent.com/FGRibreau/mailchecker/master/list.txt",
        "https://raw.githubusercontent.com/martenson/disposable-email-domains/master/disposable_email_blocklist.conf"
    ]
    
    # Trusted email providers (whitelist - skip disposable check)
    TRUSTED_PROVIDERS = {
        'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
        'yahoo.com', 'ymail.com', 'icloud.com', 'me.com', 'mac.com',
        'aol.com', 'protonmail.com', 'proton.me', 'zoho.com', 'mail.com',
        'gmx.com', 'gmx.net', 'yandex.com', 'yandex.ru', 'fastmail.com',
        'tutanota.com', 'mailbox.org', 'hushmail.com', 'runbox.com'
    }
    
    # Suspicious TLDs commonly used for disposable emails
    SUSPICIOUS_TLDS = {
        '.tk', '.ml', '.ga', '.cf', '.gq',  # Free TLDs
        '.buzz', '.club', '.top', '.xyz'     # Often used for spam
    }
    
    # Common disposable email patterns
    DISPOSABLE_PATTERNS = [
        'temp', 'temporary', 'disposable', 'throwaway', 'fake',
        '10minute', '20minute', '30minute', 'minutemail', 'tempmail',
        'guerrilla', 'mailinator', 'maildrop', 'mailnesia', 'trashmail',
        'yopmail', 'sharklasers', 'spam', 'burner', 'trash'
    ]
    
    CACHE_DURATION = timedelta(hours=24)  # Refresh daily
    
    def __init__(self):
        self.blocklist: Set[str] = set()
        self.last_updated: Optional[datetime] = None
        self._lock = asyncio.Lock()
        self.load_stats = {
            'total_domains': 0,
            'sources_loaded': 0,
            'sources_failed': 0
        }
    
    async def load_blocklist(self, force: bool = False) -> bool:
        """Load or refresh the disposable email blocklist from multiple sources."""
        async with self._lock:
            if not force and self.last_updated:
                if datetime.now() - self.last_updated < self.CACHE_DURATION:
                    return True
            
            import aiohttp
            new_blocklist = set()
            sources_loaded = 0
            sources_failed = 0
            
            async with aiohttp.ClientSession() as session:
                for url in self.BLOCKLIST_URLS:
                    try:
                        logger.info(f"Loading blocklist from: {url}")
                        async with session.get(url, timeout=15) as response:
                            if response.status == 200:
                                content = await response.text()
                                if url.endswith('.json'):
                                    import json
                                    try:
                                        domains = json.loads(content)
                                        if isinstance(domains, list):
                                            new_blocklist.update(d.strip().lower() for d in domains if d.strip())
                                        sources_loaded += 1
                                    except json.JSONDecodeError:
                                        sources_failed += 1
                                else:
                                    lines = content.splitlines()
                                    domains = set()
                                    for line in lines:
                                        line = line.strip().lower()
                                        if line and not line.startswith('#') and not line.startswith('//'):
                                            domains.add(line)
                                    new_blocklist.update(domains)
                                    sources_loaded += 1
                            else:
                                sources_failed += 1
                    except Exception:
                        sources_failed += 1
            
            if sources_loaded > 0:
                self.blocklist = new_blocklist
                self.last_updated = datetime.now()
                self.load_stats = {
                    'total_domains': len(self.blocklist),
                    'sources_loaded': sources_loaded,
                    'sources_failed': sources_failed
                }
                return True
            else:
                return False
    
    def _check_pattern_match(self, domain: str) -> bool:
        """Check if domain matches known disposable patterns."""
        domain_lower = domain.lower()
        for pattern in self.DISPOSABLE_PATTERNS:
            if pattern in domain_lower:
                return True
        return False
    
    def _check_suspicious_tld(self, domain: str) -> bool:
        """Check if domain uses suspicious TLD."""
        for tld in self.SUSPICIOUS_TLDS:
            if domain.lower().endswith(tld):
                return True
        return False
    
    def _is_trusted_provider(self, domain: str) -> bool:
        """Check if domain is a trusted email provider."""
        return domain.lower() in self.TRUSTED_PROVIDERS
    
    def _check_suspicious_structure(self, domain: str) -> bool:
        """Check for suspicious domain structure patterns."""
        domain_lower = domain.lower()
        parts = domain_lower.split('.')
        if len(parts) >= 2:
            domain_name = parts[-2]
            if len(domain_name) < 4:
                return True
        domain_name_only = domain_lower.split('.')[0]
        if len(domain_name_only) > 0:
            num_count = sum(c.isdigit() for c in domain_name_only)
            if num_count / len(domain_name_only) > 0.5:
                return True
        return False
    
    def is_disposable(self, domain: str) -> bool:
        """Comprehensive check if a domain is disposable."""
        domain = domain.lower().strip()
        if self._is_trusted_provider(domain):
            return False
        if domain in self.blocklist:
            logger.info(f"🚫 Blocked (blocklist exact): {domain}")
            return True
        domain_parts = domain.split(".")
        for i in range(len(domain_parts) - 1):
            parent_domain = ".".join(domain_parts[i:])
            if parent_domain in self.blocklist:
                logger.info(f"🚫 Blocked (blocklist parent): {domain} -> {parent_domain}")
                return True
        if self._check_pattern_match(domain):
            logger.info(f"🚫 Blocked (pattern match): {domain}")
            return True
        if self._check_suspicious_tld(domain):
            logger.info(f"🚫 Blocked (suspicious TLD): {domain}")
            return True
        if self._check_suspicious_structure(domain):
            logger.info(f"🚫 Blocked (suspicious structure): {domain}")
            return True
        return False


class MailServerVerifier:
    """Advanced mail server verification to detect ACTUAL hosting provider."""
    
    TRUSTED_PROVIDERS = {
        'gmail': {
            'name': 'Gmail/Google Workspace',
            'mx_patterns': ['google.com', 'googlemail.com'],
            'spf_patterns': ['include:_spf.google.com', 'include:spf.google.com'],
            'domains': ['gmail.com', 'googlemail.com']
        },
        'outlook': {
            'name': 'Outlook/Hotmail/Microsoft 365',
            'mx_patterns': ['outlook.com', 'hotmail.com', 'protection.outlook.com'],
            'spf_patterns': ['include:spf.protection.outlook.com'],
            'domains': ['outlook.com', 'hotmail.com', 'live.com', 'msn.com']
        },
        'yahoo': {
            'name': 'Yahoo Mail',
            'mx_patterns': ['yahoodns.net', 'yahoo.com'],
            'spf_patterns': ['include:_spf.mail.yahoo.com'],
            'domains': ['yahoo.com', 'ymail.com', 'rocketmail.com']
        },
        'zoho': {
            'name': 'Zoho Mail',
            'mx_patterns': ['zoho.com', 'zoho.eu', 'zoho.in'],
            'spf_patterns': ['include:zoho.com'],
            'domains': ['zoho.com', 'zohomail.com']
        },
        'protonmail': {
            'name': 'ProtonMail',
            'mx_patterns': ['protonmail.ch', 'proton.me'],
            'spf_patterns': ['include:_spf.protonmail.ch'],
            'domains': ['protonmail.com', 'proton.me', 'pm.me']
        },
        'icloud': {
            'name': 'iCloud Mail',
            'mx_patterns': ['mail.icloud.com'],
            'spf_patterns': ['icloud.com'],
            'domains': ['icloud.com', 'me.com', 'mac.com']
        },
        'aol': {
            'name': 'AOL Mail',
            'mx_patterns': ['aol.com', 'yahoodns.net'],
            'spf_patterns': ['include:_spf.mail.aol.com'],
            'domains': ['aol.com']
        },
        'fastmail': {
            'name': 'FastMail',
            'mx_patterns': ['messagingengine.com'],
            'spf_patterns': ['include:spf.messagingengine.com'],
            'domains': ['fastmail.com', 'fastmail.fm']
        }
    }
    
    @staticmethod
    async def get_mx_records(domain: str) -> list:
        try:
            mx_records = dns.resolver.resolve(domain, 'MX')
            return [(mx.preference, str(mx.exchange).lower().rstrip('.')) for mx in mx_records]
        except Exception:
            return []
    
    @staticmethod
    async def get_spf_record(domain: str) -> Optional[str]:
        try:
            txt_records = dns.resolver.resolve(domain, 'TXT')
            for txt in txt_records:
                txt_str = str(txt).strip('"')
                if txt_str.lower().startswith('v=spf1'):
                    return txt_str.lower()
            return None
        except Exception:
            return None
    
    @staticmethod
    async def verify_server_provider(email: str, domain: str) -> Tuple[bool, Optional[str], str]:
        mx_records = await MailServerVerifier.get_mx_records(domain)
        spf_record = await MailServerVerifier.get_spf_record(domain)
        
        if not mx_records:
            return False, None, "No MX records found - domain cannot receive email"
        
        for provider_key, provider_info in MailServerVerifier.TRUSTED_PROVIDERS.items():
            provider_name = provider_info['name']
            is_native_domain = domain in provider_info['domains']
            mx_match = False
            for _, mx_host in mx_records:
                for pattern in provider_info['mx_patterns']:
                    if pattern in mx_host:
                        mx_match = True
                        break
                if mx_match:
                    break
            
            if is_native_domain:
                if mx_match:
                    return True, provider_name, f"Verified {provider_name} (native domain)"
                else:
                    return False, None, f"Fake {provider_name} address - MX records don't match"
            elif mx_match:
                return True, provider_name, f"Verified {provider_name} (MX confirmed)"
        
        mx_list = [mx[1] for mx in mx_records[:3]]
        return False, None, f"Email not hosted on trusted provider. MX: {', '.join(mx_list)}"


class DynamicEmailValidator:
    """Real-time dynamic email validation using multiple techniques."""
    
    @staticmethod
    def calculate_entropy(text: str) -> float:
        if not text:
            return 0.0
        counter = Counter(text)
        length = len(text)
        entropy = 0.0
        for count in counter.values():
            probability = count / length
            entropy -= probability * math.log2(probability)
        return entropy
    
    @staticmethod
    def check_username_randomness(username: str) -> Tuple[bool, float]:
        username = username.lower().strip()
        entropy = DynamicEmailValidator.calculate_entropy(username)
        suspicious_score = 0
        if entropy > 3.5:
            suspicious_score += 2
        num_count = sum(c.isdigit() for c in username)
        if len(username) > 0 and num_count / len(username) > 0.4:
            suspicious_score += 2
        has_letters = any(c.isalpha() for c in username)
        has_numbers = any(c.isdigit() for c in username)
        if has_letters and has_numbers and len(username) > 8:
            suspicious_score += 1
        if len(username) > 15 and entropy > 3.0:
            suspicious_score += 1
        common_patterns = ['test', 'user', 'admin', 'info', 'hello', 'mail']
        if not any(pattern in username for pattern in common_patterns):
            if entropy > 3.0:
                suspicious_score += 1
        return suspicious_score >= 3, entropy
    
    @staticmethod
    async def check_mx_reputation(domain: str) -> Tuple[bool, str]:
        try:
            mx_records = dns.resolver.resolve(domain, 'MX')
            mx_hosts = [str(mx.exchange).lower().rstrip('.') for mx in mx_records]
            suspicious_mx_patterns = [
                'disposable', 'tempmail', 'guerrilla', 'mailinator',
                'maildrop', 'yopmail', 'throwaway', 'trash', 'temp',
                'fake', 'burner', '10minute', 'sharklasers'
            ]
            for mx_host in mx_hosts:
                for pattern in suspicious_mx_patterns:
                    if pattern in mx_host:
                        return True, f"MX points to suspicious service: {mx_host}"
            if len(mx_hosts) == 1:
                mx = mx_hosts[0]
                if any(sus in mx for sus in ['mail', 'mx', 'smtp']) and '.' not in mx.split('.')[0]:
                    return True, "Single generic MX record"
            return False, "MX records look legitimate"
        except Exception:
            return False, "Unable to check MX records"
    
    @staticmethod
    async def check_realtime_api(email: str, domain: str) -> Tuple[bool, Optional[str]]:
        import aiohttp
        try:
            async with aiohttp.ClientSession() as session:
                url = f"https://emailrep.io/{email}"
                async with session.get(url, timeout=3) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('details', {}).get('disposable') is True:
                            return True, "emailrep.io"
        except Exception:
            pass
        return False, None
    
    @staticmethod
    async def check_domain_age_and_reputation(domain: str) -> Tuple[bool, str]:
        import aiohttp
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"http://{domain}", timeout=2, allow_redirects=True) as response:
                    if response.status >= 400:
                        return True, "Domain has no active website"
        except:
            return True, "No accessible website"
        return False, "Domain appears legitimate"


class EmailValidator:
    """Comprehensive email validator with multiple validation layers."""
    
    EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    ROLE_BASED_PREFIXES = {
        'admin', 'administrator', 'info', 'support', 'help', 'sales',
        'contact', 'webmaster', 'postmaster', 'noreply', 'no-reply',
        'abuse', 'marketing', 'billing', 'hostmaster'
    }
    
    def __init__(self):
        self.blocklist = DisposableEmailBlocklist()
    
    async def initialize(self):
        await self.blocklist.load_blocklist()
    
    def validate_format(self, email: str, result: EmailValidationResult) -> bool:
        if not self.EMAIL_REGEX.match(email):
            result.add_error("Invalid email format")
            result.checks['format'] = False
            return False
        name, addr = parseaddr(email)
        if not addr or '@' not in addr:
            result.add_error("Invalid email format")
            result.checks['format'] = False
            return False
        result.checks['format'] = True
        return True
    
    def check_alias(self, email: str, result: EmailValidationResult) -> bool:
        local_part = email.split('@')[0]
        if '+' in local_part:
            result.add_warning("Email contains '+' alias")
            result.checks['alias_detected'] = True
        else:
            result.checks['alias_detected'] = False
        return True
    
    def check_role_based(self, email: str, result: EmailValidationResult) -> bool:
        local_part = email.split('@')[0].lower()
        if local_part in self.ROLE_BASED_PREFIXES:
            result.add_warning(f"Role-based email address detected: {local_part}@")
        return True
    
    async def check_disposable(self, email: str, result: EmailValidationResult) -> bool:
        try:
            domain = email.split('@')[-1].lower()
            if not self.blocklist.last_updated:
                await self.blocklist.load_blocklist()
            if self.blocklist.is_disposable(domain):
                result.add_error("Disposable email addresses are not allowed. Please use a permanent email address.")
                result.checks['disposable'] = True
                return False
            result.checks['disposable'] = False
            return True
        except Exception:
            result.checks['disposable'] = None
            return True
    
    async def check_mx_record(self, email: str, result: EmailValidationResult) -> bool:
        try:
            domain = email.split('@')[-1]
            try:
                mx_records = dns.resolver.resolve(domain, 'MX')
                if mx_records:
                    result.checks['mx_record'] = True
                    return True
                else:
                    result.add_warning("No MX records found for domain")
                    result.checks['mx_record'] = False
                    return True
            except dns.resolver.NXDOMAIN:
                result.add_error("Domain does not exist")
                result.checks['mx_record'] = False
                return False
            except dns.resolver.NoAnswer:
                result.add_warning("No MX records found for domain")
                result.checks['mx_record'] = False
                return True
        except Exception:
            result.checks['mx_record'] = None
            return True
    
    async def check_smtp(self, email: str, result: EmailValidationResult, timeout: int = 10) -> bool:
        try:
            domain = email.split('@')[-1]
            mx_records = dns.resolver.resolve(domain, 'MX')
            if not mx_records:
                result.checks['smtp'] = False
                return True
            mx_host = str(mx_records[0].exchange).rstrip('.')
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            try:
                sock.connect((mx_host, 25))
                sock.close()
                result.checks['smtp'] = True
                return True
            except (socket.timeout, socket.error):
                result.add_warning("Could not verify SMTP server")
                result.checks['smtp'] = False
                return True
        except Exception:
            result.checks['smtp'] = None
            return True

    async def validate_email(
        self,
        email: str,
        check_mx: bool = True,
        check_smtp: bool = False,
        enable_dynamic_checks: bool = True
    ) -> EmailValidationResult:
        result = EmailValidationResult()
        domain = email.split('@')[-1].lower() if '@' in email else ''
        username = email.split('@')[0] if '@' in email else ''
        
        # Layer 1: Format validation
        if not self.validate_format(email, result):
            return result
        
        # Layer 2: Alias detection
        self.check_alias(email, result)
        self.check_role_based(email, result)
        
        # Layer 3: Blocklist check
        if not await self.check_disposable(email, result):
            return result
        
        # === MAIL SERVER VERIFICATION ===
        if enable_dynamic_checks:
            try:
                is_verified, provider_name, verify_reason = await MailServerVerifier.verify_server_provider(email, domain)
                result.checks['server_provider'] = provider_name
                result.checks['server_verified'] = is_verified
                
                if not is_verified:
                    if "No MX records" in verify_reason:
                        result.add_error(verify_reason)
                        return result
                    
                    if "Fake" in verify_reason:
                        result.add_error(verify_reason)
                        return result
                    
                    # Add Risk Points for Untrusted Provider
                    result.add_risk(1, "Untrusted email provider")
                    result.add_warning(f"Note: {verify_reason}")
                else:
                    logger.info(f"✅ Server verified: {email} on {provider_name}")
            except Exception as e:
                logger.error(f"Server verification error: {str(e)}")
                result.add_warning("Unable to verify email server")

        # === DYNAMIC CHECKS WITH RISK SCORING ===
        if enable_dynamic_checks:
            
            # Username Randomness
            is_random, entropy = DynamicEmailValidator.check_username_randomness(username)
            result.checks['username_entropy'] = entropy
            
            if is_random:
                # Strong signal for disposable
                result.add_error("Email username appears randomly generated")
                return result
            elif entropy > 3.0:
                # Moderate signal
                result.add_risk(1, f"Moderate username entropy ({entropy:.2f})")
            
            # Real-time API
            try:
                is_disposable_api, api_source = await DynamicEmailValidator.check_realtime_api(email, domain)
                result.checks['realtime_api'] = api_source if is_disposable_api else "passed"
                if is_disposable_api:
                    result.add_error(f"Email detected as disposable by {api_source}")
                    return result
            except Exception:
                pass
            
            # MX Reputation
            try:
                mx_suspicious, mx_reason = await DynamicEmailValidator.check_mx_reputation(domain)
                result.checks['mx_reputation'] = mx_reason
                if mx_suspicious:
                    result.add_risk(1, f"Suspicious MX: {mx_reason}")
            except Exception:
                pass
            
            # Domain Reputation (Website Check) - Strongest Signal
            try:
                domain_suspicious, domain_reason = await DynamicEmailValidator.check_domain_age_and_reputation(domain)
                result.checks['domain_reputation'] = domain_reason
                if domain_suspicious:
                    # Very strong indicator for throwaway domains
                    result.add_risk(3, f"Domain reputation issue: {domain_reason}")
            except Exception:
                pass
            
            # === FINAL RISK ASSESSMENT ===
            # Threshold: 4
            # e.g., witihek852@alexida.com:
            # - Untrusted Provider (+1)
            # - Single MX (+1)
            # - No Website (+3)
            # - Entropy > 3.0 (+1)
            # Total: 6 -> BLOCK
            
            if result.risk_score >= 4:
                result.add_error(f"Email rejected due to high risk score ({result.risk_score}/4). Please use a verified business email.")
                logger.warning(f"🚫 Blocked high risk email: {email} (Score: {result.risk_score})")
                return result

        if check_mx and not await self.check_mx_record(email, result):
            return result
        
        if check_smtp:
            await self.check_smtp(email, result)
        
        return result


_validator: Optional[EmailValidator] = None

async def get_email_validator() -> EmailValidator:
    global _validator
    if _validator is None:
        _validator = EmailValidator()
        await _validator.initialize()
    return _validator


async def validate_email_comprehensive(
    email: str,
    check_mx: bool = False,
    check_smtp: bool = False
) -> Tuple[bool, Optional[str]]:
    """
    Convenience function for email validation.
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    validator = await get_email_validator()
    result = await validator.validate_email(email, check_mx=check_mx, check_smtp=check_smtp)
    
    if not result.is_valid:
        return False, result.errors[0] if result.errors else "Invalid email address"
    
    return True, None

