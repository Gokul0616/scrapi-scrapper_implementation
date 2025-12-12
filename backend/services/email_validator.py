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
        self.checks = {
            'format': None,
            'disposable': None,
            'mx_record': None,
            'smtp': None,
            'alias_detected': None,
            'username_entropy': None,
            'realtime_api': None,
            'mx_reputation': None,
            'domain_reputation': None
        }
    
    def add_error(self, message: str):
        """Add an error and mark validation as failed."""
        self.is_valid = False
        self.errors.append(message)
    
    def add_warning(self, message: str):
        """Add a warning (doesn't fail validation)."""
        self.warnings.append(message)
    
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
            # Check if we need to refresh
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
                                
                                # Handle JSON format (ivolo repo)
                                if url.endswith('.json'):
                                    import json
                                    try:
                                        domains = json.loads(content)
                                        if isinstance(domains, list):
                                            new_blocklist.update(d.strip().lower() for d in domains if d.strip())
                                        sources_loaded += 1
                                        logger.info(f"✅ Loaded JSON blocklist from {url.split('/')[-2]}")
                                    except json.JSONDecodeError:
                                        logger.error(f"Failed to parse JSON from {url}")
                                        sources_failed += 1
                                else:
                                    # Handle text format
                                    lines = content.splitlines()
                                    domains = set()
                                    for line in lines:
                                        line = line.strip().lower()
                                        # Skip comments and empty lines
                                        if line and not line.startswith('#') and not line.startswith('//'):
                                            domains.add(line)
                                    new_blocklist.update(domains)
                                    sources_loaded += 1
                                    logger.info(f"✅ Loaded {len(domains)} domains from {url.split('/')[-2]}")
                            else:
                                logger.error(f"Failed to load blocklist from {url}: HTTP {response.status}")
                                sources_failed += 1
                    except Exception as e:
                        logger.error(f"Error loading blocklist from {url}: {str(e)}")
                        sources_failed += 1
            
            # Only update if we loaded at least one source
            if sources_loaded > 0:
                self.blocklist = new_blocklist
                self.last_updated = datetime.now()
                self.load_stats = {
                    'total_domains': len(self.blocklist),
                    'sources_loaded': sources_loaded,
                    'sources_failed': sources_failed
                }
                logger.info(f"✅ Loaded {len(self.blocklist)} total disposable domains from {sources_loaded} sources")
                return True
            else:
                logger.error(f"❌ Failed to load any blocklists")
                return False
    
    def _check_pattern_match(self, domain: str) -> bool:
        """Check if domain matches known disposable patterns."""
        domain_lower = domain.lower()
        
        # Check for disposable keywords
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
        
        # Check for very short domains (< 4 chars before TLD)
        parts = domain_lower.split('.')
        if len(parts) >= 2:
            domain_name = parts[-2]
            if len(domain_name) < 4:
                # Too short, likely suspicious
                return True
        
        # Check for excessive numbers (more than 50% of domain is numbers)
        domain_name_only = domain_lower.split('.')[0]
        if len(domain_name_only) > 0:
            num_count = sum(c.isdigit() for c in domain_name_only)
            if num_count / len(domain_name_only) > 0.5:
                return True
        
        return False
    
    def is_disposable(self, domain: str) -> bool:
        """
        Comprehensive check if a domain is disposable.
        Uses multiple detection methods:
        1. Trusted provider whitelist (skip if trusted)
        2. Blocklist lookup (exact and parent domains)
        3. Pattern matching (common disposable keywords)
        4. Suspicious TLD detection
        5. Suspicious structure analysis
        """
        domain = domain.lower().strip()
        
        # LAYER 1: Check if it's a trusted provider (whitelist)
        if self._is_trusted_provider(domain):
            return False
        
        # LAYER 2: Check exact domain match in blocklist
        if domain in self.blocklist:
            logger.info(f"🚫 Blocked (blocklist exact): {domain}")
            return True
        
        # LAYER 3: Check parent domains (for subdomains)
        domain_parts = domain.split(".")
        for i in range(len(domain_parts) - 1):
            parent_domain = ".".join(domain_parts[i:])
            if parent_domain in self.blocklist:
                logger.info(f"🚫 Blocked (blocklist parent): {domain} -> {parent_domain}")
                return True
        
        # LAYER 4: Pattern matching
        if self._check_pattern_match(domain):
            logger.info(f"🚫 Blocked (pattern match): {domain}")
            return True
        
        # LAYER 5: Suspicious TLD
        if self._check_suspicious_tld(domain):
            logger.info(f"🚫 Blocked (suspicious TLD): {domain}")
            return True
        
        # LAYER 6: Suspicious structure
        if self._check_suspicious_structure(domain):
            logger.info(f"🚫 Blocked (suspicious structure): {domain}")
            return True
        
        return False


class DynamicEmailValidator:
    """Real-time dynamic email validation using multiple techniques."""
    
    @staticmethod
    def calculate_entropy(text: str) -> float:
        """Calculate Shannon entropy of a string (randomness measure)."""
        if not text:
            return 0.0
        
        # Count character frequencies
        counter = Counter(text)
        length = len(text)
        
        # Calculate entropy
        entropy = 0.0
        for count in counter.values():
            probability = count / length
            entropy -= probability * math.log2(probability)
        
        return entropy
    
    @staticmethod
    def check_username_randomness(username: str) -> Tuple[bool, float]:
        """
        Detect if email username looks randomly generated.
        Returns (is_suspicious, entropy_score)
        """
        # Remove common patterns
        username = username.lower().strip()
        
        # Calculate entropy (random strings have high entropy)
        entropy = DynamicEmailValidator.calculate_entropy(username)
        
        # High entropy + specific patterns = likely disposable
        suspicious_score = 0
        
        # High entropy (> 3.5 is quite random)
        if entropy > 3.5:
            suspicious_score += 2
        
        # Contains many numbers
        num_count = sum(c.isdigit() for c in username)
        if len(username) > 0 and num_count / len(username) > 0.4:
            suspicious_score += 2
        
        # Mix of random letters and numbers (like mokab46709)
        has_letters = any(c.isalpha() for c in username)
        has_numbers = any(c.isdigit() for c in username)
        if has_letters and has_numbers and len(username) > 8:
            suspicious_score += 1
        
        # Very long username (> 15 chars) with high entropy
        if len(username) > 15 and entropy > 3.0:
            suspicious_score += 1
        
        # No common words or patterns
        common_patterns = ['test', 'user', 'admin', 'info', 'hello', 'mail']
        if not any(pattern in username for pattern in common_patterns):
            if entropy > 3.0:
                suspicious_score += 1
        
        return suspicious_score >= 3, entropy
    
    @staticmethod
    async def check_mx_reputation(domain: str) -> Tuple[bool, str]:
        """
        Check if MX records point to known disposable email services.
        Returns (is_suspicious, reason)
        """
        try:
            # Get MX records
            mx_records = dns.resolver.resolve(domain, 'MX')
            mx_hosts = [str(mx.exchange).lower().rstrip('.') for mx in mx_records]
            
            # Known disposable email MX patterns
            suspicious_mx_patterns = [
                'disposable', 'tempmail', 'guerrilla', 'mailinator',
                'maildrop', 'yopmail', 'throwaway', 'trash', 'temp',
                'fake', 'burner', '10minute', 'sharklasers'
            ]
            
            for mx_host in mx_hosts:
                for pattern in suspicious_mx_patterns:
                    if pattern in mx_host:
                        return True, f"MX points to suspicious service: {mx_host}"
            
            # Check if only one MX record (suspicious for real businesses)
            if len(mx_hosts) == 1:
                # Very generic or suspicious MX server names
                mx = mx_hosts[0]
                if any(sus in mx for sus in ['mail', 'mx', 'smtp']) and '.' not in mx.split('.')[0]:
                    return True, "Single generic MX record"
            
            return False, "MX records look legitimate"
            
        except Exception as e:
            logger.debug(f"MX reputation check failed for {domain}: {str(e)}")
            return False, "Unable to check MX records"
    
    @staticmethod
    async def check_realtime_api(email: str, domain: str) -> Tuple[bool, Optional[str]]:
        """
        Check against real-time disposable email APIs.
        Uses multiple free API services.
        Returns (is_disposable, api_source)
        """
        import aiohttp
        
        # API 1: emailrep.io (free, no key needed)
        try:
            async with aiohttp.ClientSession() as session:
                url = f"https://emailrep.io/{email}"
                async with session.get(url, timeout=3) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('details', {}).get('disposable') is True:
                            logger.info(f"🚫 Detected disposable via emailrep.io: {email}")
                            return True, "emailrep.io"
        except Exception as e:
            logger.debug(f"emailrep.io check failed: {str(e)}")
        
        # API 2: disify.com (free disposable email checker)
        try:
            async with aiohttp.ClientSession() as session:
                url = f"https://disify.com/api/email/{email}"
                async with session.get(url, timeout=3) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('disposable') is True or data.get('format') is False:
                            logger.info(f"🚫 Detected disposable via disify.com: {email}")
                            return True, "disify.com"
        except Exception as e:
            logger.debug(f"disify.com check failed: {str(e)}")
        
        # API 3: Check via open-source validator API
        try:
            async with aiohttp.ClientSession() as session:
                url = f"https://open.kickbox.com/v1/disposable/{domain}"
                async with session.get(url, timeout=3) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('disposable') is True:
                            logger.info(f"🚫 Detected disposable via kickbox: {domain}")
                            return True, "kickbox"
        except Exception as e:
            logger.debug(f"kickbox check failed: {str(e)}")
        
        return False, None
    
    @staticmethod
    async def check_domain_age_and_reputation(domain: str) -> Tuple[bool, str]:
        """
        Check domain age and online reputation.
        Very new domains are often used for disposable emails.
        Returns (is_suspicious, reason)
        """
        try:
            # Check if domain has a website (HTTP/HTTPS)
            import aiohttp
            
            try:
                async with aiohttp.ClientSession() as session:
                    # Try to access domain website with short timeout
                    async with session.get(f"http://{domain}", timeout=2, allow_redirects=True) as response:
                        # If domain has no website or returns error, suspicious
                        if response.status >= 400:
                            return True, "Domain has no active website"
            except:
                # If can't connect to website, it might be email-only domain (suspicious)
                logger.debug(f"Domain {domain} has no accessible website")
                return True, "No accessible website"
            
            return False, "Domain appears legitimate"
            
        except Exception as e:
            logger.debug(f"Domain reputation check failed for {domain}: {str(e)}")
            return False, "Unable to verify domain reputation"


class EmailValidator:
    """Comprehensive email validator with multiple validation layers."""
    
    # RFC 5322 compliant email regex (simplified)
    EMAIL_REGEX = re.compile(
        r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    )
    
    # Common role-based email prefixes to warn about
    ROLE_BASED_PREFIXES = {
        'admin', 'administrator', 'info', 'support', 'help', 'sales',
        'contact', 'webmaster', 'postmaster', 'noreply', 'no-reply',
        'abuse', 'marketing', 'billing', 'hostmaster'
    }
    
    def __init__(self):
        self.blocklist = DisposableEmailBlocklist()
    
    async def initialize(self):
        """Initialize the validator (load blocklist)."""
        await self.blocklist.load_blocklist()
    
    def validate_format(self, email: str, result: EmailValidationResult) -> bool:
        """Layer 1: Validate email format (RFC 5322)."""
        try:
            # Basic format check
            if not self.EMAIL_REGEX.match(email):
                result.add_error("Invalid email format")
                result.checks['format'] = False
                return False
            
            # Additional validation using email.utils
            name, addr = parseaddr(email)
            if not addr or '@' not in addr:
                result.add_error("Invalid email format")
                result.checks['format'] = False
                return False
            
            result.checks['format'] = True
            return True
            
        except Exception as e:
            logger.error(f"Format validation error: {str(e)}")
            result.add_error("Email format validation failed")
            result.checks['format'] = False
            return False
    
    def check_alias(self, email: str, result: EmailValidationResult) -> bool:
        """Layer 2: Check for + aliases (often used for disposable purposes)."""
        local_part = email.split('@')[0]
        if '+' in local_part:
            result.add_warning("Email contains '+' alias")
            result.checks['alias_detected'] = True
        else:
            result.checks['alias_detected'] = False
        return True
    
    def check_role_based(self, email: str, result: EmailValidationResult) -> bool:
        """Check for role-based email addresses."""
        local_part = email.split('@')[0].lower()
        if local_part in self.ROLE_BASED_PREFIXES:
            result.add_warning(f"Role-based email address detected: {local_part}@")
        return True
    
    async def check_disposable(self, email: str, result: EmailValidationResult) -> bool:
        """Layer 3: Check if email domain is disposable."""
        try:
            domain = email.split('@')[-1].lower()
            
            # Ensure blocklist is loaded
            if not self.blocklist.last_updated:
                await self.blocklist.load_blocklist()
            
            if self.blocklist.is_disposable(domain):
                result.add_error("Disposable email addresses are not allowed. Please use a permanent email address.")
                result.checks['disposable'] = True
                return False
            
            result.checks['disposable'] = False
            return True
            
        except Exception as e:
            logger.error(f"Disposable check error: {str(e)}")
            # Don't fail validation if check fails
            result.checks['disposable'] = None
            return True
    
    async def check_mx_record(self, email: str, result: EmailValidationResult) -> bool:
        """Layer 4: Verify domain has valid MX records."""
        try:
            domain = email.split('@')[-1]
            
            # Check for MX records
            try:
                mx_records = dns.resolver.resolve(domain, 'MX')
                if mx_records:
                    result.checks['mx_record'] = True
                    return True
                else:
                    result.add_warning("No MX records found for domain")
                    result.checks['mx_record'] = False
                    return True  # Warning only, don't fail
            except dns.resolver.NXDOMAIN:
                result.add_error("Domain does not exist")
                result.checks['mx_record'] = False
                return False
            except dns.resolver.NoAnswer:
                result.add_warning("No MX records found for domain")
                result.checks['mx_record'] = False
                return True
            
        except Exception as e:
            logger.error(f"MX record check error: {str(e)}")
            result.checks['mx_record'] = None
            return True  # Don't fail if check can't be performed
    
    async def check_smtp(self, email: str, result: EmailValidationResult, timeout: int = 10) -> bool:
        """Layer 5: SMTP verification (optional, can be slow)."""
        try:
            domain = email.split('@')[-1]
            
            # Get MX records
            mx_records = dns.resolver.resolve(domain, 'MX')
            if not mx_records:
                result.checks['smtp'] = False
                return True
            
            # Try to connect to the first MX server
            mx_host = str(mx_records[0].exchange).rstrip('.')
            
            # Create socket with timeout
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            
            try:
                # Connect to SMTP server
                sock.connect((mx_host, 25))
                sock.close()
                result.checks['smtp'] = True
                return True
            except (socket.timeout, socket.error):
                result.add_warning("Could not verify SMTP server")
                result.checks['smtp'] = False
                return True
            
        except Exception as e:
            logger.error(f"SMTP check error: {str(e)}")
            result.checks['smtp'] = None
            return True  # Don't fail if check can't be performed
    
    async def validate_email(
        self,
        email: str,
        check_mx: bool = True,  # Now enabled by default
        check_smtp: bool = False,
        enable_dynamic_checks: bool = True  # New parameter for dynamic validation
    ) -> EmailValidationResult:
        """
        Perform comprehensive email validation with dynamic real-time checks.
        
        Args:
            email: Email address to validate
            check_mx: Whether to perform MX record verification (default: True)
            check_smtp: Whether to perform SMTP verification (slower)
            enable_dynamic_checks: Enable real-time API and advanced checks (default: True)
        
        Returns:
            EmailValidationResult object with validation details
        """
        result = EmailValidationResult()
        domain = email.split('@')[-1].lower() if '@' in email else ''
        username = email.split('@')[0] if '@' in email else ''
        
        # Layer 1: Format validation
        if not self.validate_format(email, result):
            return result
        
        # Layer 2: Alias detection
        self.check_alias(email, result)
        
        # Layer 2.5: Role-based detection
        self.check_role_based(email, result)
        
        # Layer 3: Static disposable email check (blocklist)
        if not await self.check_disposable(email, result):
            return result
        
        # === NEW DYNAMIC VALIDATION LAYERS ===
        if enable_dynamic_checks:
            
            # Layer 3.5: Username entropy/randomness check
            is_random, entropy = DynamicEmailValidator.check_username_randomness(username)
            result.checks['username_entropy'] = entropy
            if is_random:
                result.add_error("Please use a valid personal or business email address.")
                logger.info(f"🚫 Blocked (random username): {email} (entropy: {entropy:.2f})")
                return result
            
            # Layer 3.6: Real-time API validation (parallel check)
            try:
                is_disposable_api, api_source = await DynamicEmailValidator.check_realtime_api(email, domain)
                result.checks['realtime_api'] = api_source if is_disposable_api else "passed"
                if is_disposable_api:
                    result.add_error(f"Email detected as disposable by {api_source}")
                    logger.info(f"🚫 Blocked (API {api_source}): {email}")
                    return result
            except Exception as e:
                logger.debug(f"Real-time API check failed: {str(e)}")
                result.checks['realtime_api'] = "error"
            
            # Layer 3.7: MX reputation check
            try:
                mx_suspicious, mx_reason = await DynamicEmailValidator.check_mx_reputation(domain)
                result.checks['mx_reputation'] = mx_reason
                if mx_suspicious:
                    result.add_error(f"Suspicious mail server: {mx_reason}")
                    logger.info(f"🚫 Blocked (MX reputation): {email} - {mx_reason}")
                    return result
            except Exception as e:
                logger.debug(f"MX reputation check failed: {str(e)}")
                result.checks['mx_reputation'] = "error"
            
            # Layer 3.8: Domain reputation and website check
            try:
                domain_suspicious, domain_reason = await DynamicEmailValidator.check_domain_age_and_reputation(domain)
                result.checks['domain_reputation'] = domain_reason
                if domain_suspicious:
                    # This is a warning, not a hard block (some legitimate services are email-only)
                    result.add_warning(f"Domain reputation concern: {domain_reason}")
                    logger.info(f"⚠️  Warning (domain reputation): {email} - {domain_reason}")
            except Exception as e:
                logger.debug(f"Domain reputation check failed: {str(e)}")
                result.checks['domain_reputation'] = "error"
        
        # Layer 4: MX record check (now enabled by default)
        if check_mx:
            if not await self.check_mx_record(email, result):
                return result
        
        # Layer 5: SMTP check (optional, slower)
        if check_smtp:
            await self.check_smtp(email, result)
        
        return result


# Global validator instance
_validator: Optional[EmailValidator] = None


async def get_email_validator() -> EmailValidator:
    """Get or create the global email validator instance."""
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
