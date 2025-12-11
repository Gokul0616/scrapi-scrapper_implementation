"""
Email validation service to block temporary/disposable email addresses.
"""
import re
import logging
from disposable_email_domains import blocklist

logger = logging.getLogger(__name__)


class EmailValidator:
    """Validate email addresses and block temporary/disposable emails."""
    
    def __init__(self):
        # Load the blocklist of disposable email domains
        self.blocked_domains = set(blocklist)
        logger.info(f"Email validator initialized with {len(self.blocked_domains)} blocked domains")
    
    def is_valid_format(self, email: str) -> bool:
        """Check if email has valid format."""
        if not email:
            return False
        
        # Basic email format validation
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    def is_disposable(self, email: str) -> bool:
        """Check if email domain is a known disposable/temporary email provider."""
        if not email:
            return False
        
        # Extract domain from email
        try:
            domain = email.split('@')[1].lower()
        except (IndexError, AttributeError):
            return False
        
        # Check if domain is in blocklist
        is_blocked = domain in self.blocked_domains
        
        if is_blocked:
            logger.warning(f"Blocked temporary email domain: {domain}")
        
        return is_blocked
    
    def validate(self, email: str) -> tuple[bool, str]:
        """
        Validate email address.
        
        Returns:
            tuple: (is_valid, error_message)
                - is_valid: True if email is valid and not disposable
                - error_message: Error message if invalid, empty string if valid
        """
        # Check format
        if not self.is_valid_format(email):
            return False, "Invalid email format"
        
        # Check if disposable
        if self.is_disposable(email):
            return False, "Temporary or disposable email addresses are not allowed. Please use a valid email address."
        
        return True, ""


# Singleton instance
_email_validator = None


def get_email_validator() -> EmailValidator:
    """Get the singleton email validator instance."""
    global _email_validator
    if _email_validator is None:
        _email_validator = EmailValidator()
    return _email_validator
