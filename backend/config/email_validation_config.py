"""
Email Validation Configuration

Centralized configuration for email validation settings.
Adjust these settings based on your requirements.
"""

class EmailValidationConfig:
    """Configuration for email validation layers."""
    
    # ============= LAYER CONTROLS =============
    
    # Layer 1: Format validation (always enabled)
    ENABLE_FORMAT_CHECK = True
    
    # Layer 2: Alias detection (+ signs)
    ENABLE_ALIAS_DETECTION = True
    WARN_ON_ALIAS = True  # Just warn, don't block
    
    # Layer 3: Disposable email detection (recommended)
    ENABLE_DISPOSABLE_CHECK = True
    BLOCK_DISPOSABLE = True  # Block if disposable detected
    
    # Layer 4: MX record verification (optional, adds latency)
    ENABLE_MX_CHECK = False  # Set to True for production
    BLOCK_NO_MX = False  # Just warn if MX not found
    
    # Layer 5: SMTP verification (optional, slower)
    ENABLE_SMTP_CHECK = False  # Usually not needed
    SMTP_TIMEOUT = 10  # seconds
    
    # Layer 6: Role-based email detection
    ENABLE_ROLE_CHECK = True
    WARN_ON_ROLE_BASED = True  # Just warn, don't block
    
    # ============= BLOCKLIST SETTINGS =============
    
    # Disposable email blocklist URL
    BLOCKLIST_URL = "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/refs/heads/main/disposable_email_blocklist.conf"
    
    # How often to refresh the blocklist (in hours)
    BLOCKLIST_CACHE_HOURS = 24
    
    # Load blocklist on startup
    PRELOAD_BLOCKLIST = True
    
    # ============= VALIDATION PRESETS =============
    
    @classmethod
    def get_registration_config(cls):
        """Configuration for user registration."""
        return {
            'check_mx': cls.ENABLE_MX_CHECK,
            'check_smtp': cls.ENABLE_SMTP_CHECK
        }
    
    @classmethod
    def get_login_config(cls):
        """Configuration for login (less strict)."""
        return {
            'check_mx': False,
            'check_smtp': False
        }
    
    @classmethod
    def get_strict_config(cls):
        """Strict configuration for sensitive operations."""
        return {
            'check_mx': True,
            'check_smtp': False  # SMTP is very slow
        }
    
    # ============= ERROR MESSAGES =============
    
    ERROR_INVALID_FORMAT = "Invalid email format. Please enter a valid email address."
    ERROR_DISPOSABLE = "Disposable email addresses are not allowed. Please use a permanent email address."
    ERROR_NO_MX = "Unable to verify email domain. Please check your email address."
    ERROR_DOMAIN_NOT_EXIST = "The email domain does not exist. Please check your email address."
    
    WARNING_ALIAS = "Email contains an alias (+). This may affect email delivery."
    WARNING_ROLE_BASED = "Role-based email addresses (admin@, info@) may have limited functionality."
    WARNING_NO_SMTP = "Could not verify email server connectivity."
    
    # ============= ALLOWLIST =============
    
    # Domains to always allow (bypass disposable check)
    ALLOWLIST_DOMAINS = {
        # Add trusted domains here if needed
        # 'example.com',
        # 'company.com'
    }
    
    # ============= LOGGING =============
    
    LOG_VALIDATION_ATTEMPTS = True
    LOG_BLOCKED_EMAILS = True
    LOG_DISPOSABLE_ATTEMPTS = True


# Convenience function to get config
def get_email_validation_config() -> EmailValidationConfig:
    """Get the email validation configuration."""
    return EmailValidationConfig
