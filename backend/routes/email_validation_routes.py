"""
Email Validation API Routes

Provides endpoints for email validation testing and diagnostics.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Dict, List, Optional, Union
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email-validation", tags=["Email Validation"])


class EmailValidationRequest(BaseModel):
    """Request model for email validation."""
    email: EmailStr
    check_mx: bool = True  # Now enabled by default
    check_smtp: bool = False
    enable_dynamic_checks: bool = True  # Enable real-time validation


class EmailValidationResponse(BaseModel):
    """Response model for email validation."""
    email: str
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    checks: Dict[str, Optional[Union[bool, float, str]]]  # Can be bool, float, or string


class BlocklistStatsResponse(BaseModel):
    """Response model for blocklist statistics."""
    total_domains: int
    last_updated: Optional[str]
    cache_age_hours: Optional[float]
    sources_loaded: int
    sources_failed: int
    detection_layers: List[str]


@router.post("/validate", response_model=EmailValidationResponse)
async def validate_email_endpoint(request: EmailValidationRequest):
    """
    Validate an email address with comprehensive dynamic checks.
    
    This endpoint performs multi-layered email validation including:
    - Format validation (RFC 5322)
    - Static blocklist check (147,460+ domains)
    - Real-time API validation (emailrep.io, disify, kickbox)
    - Username entropy analysis (detect random usernames)
    - MX reputation checking
    - Domain reputation verification
    - Optional SMTP verification
    """
    from services.email_validator import get_email_validator
    
    try:
        validator = await get_email_validator()
        result = await validator.validate_email(
            request.email,
            check_mx=request.check_mx,
            check_smtp=request.check_smtp,
            enable_dynamic_checks=request.enable_dynamic_checks
        )
        
        return EmailValidationResponse(
            email=request.email,
            is_valid=result.is_valid,
            errors=result.errors,
            warnings=result.warnings,
            checks=result.checks
        )
        
    except Exception as e:
        logger.error(f"Email validation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")


@router.get("/blocklist/stats", response_model=BlocklistStatsResponse)
async def get_blocklist_stats():
    """
    Get statistics about the disposable email blocklist.
    
    Returns information about the loaded blocklist including:
    - Total number of blocked domains
    - Last update timestamp
    - Cache age
    - Number of sources loaded
    - Detection layers active
    """
    from services.email_validator import get_email_validator
    from datetime import datetime
    
    try:
        validator = await get_email_validator()
        blocklist = validator.blocklist
        
        cache_age_hours = None
        if blocklist.last_updated:
            cache_age = datetime.now() - blocklist.last_updated
            cache_age_hours = cache_age.total_seconds() / 3600
        
        detection_layers = [
            "Layer 1: Format Validation (RFC 5322)",
            "Layer 2: Trusted Provider Whitelist (23+ providers)",
            "Layer 3: Multi-Source Blocklist (147,460+ domains from 4 sources)",
            "Layer 4: Pattern Matching (20+ disposable keywords)",
            "Layer 5: Suspicious TLD Detection (8+ risky TLDs)",
            "Layer 6: Domain Structure Analysis",
            "Layer 7: Username Entropy Analysis (detect random usernames)",
            "Layer 8: Real-time API Validation (3 services)",
            "Layer 9: MX Record Reputation Check",
            "Layer 10: Domain Age & Reputation Verification"
        ]
        
        return BlocklistStatsResponse(
            total_domains=len(blocklist.blocklist),
            last_updated=blocklist.last_updated.isoformat() if blocklist.last_updated else None,
            cache_age_hours=round(cache_age_hours, 2) if cache_age_hours else None,
            sources_loaded=blocklist.load_stats.get('sources_loaded', 0),
            sources_failed=blocklist.load_stats.get('sources_failed', 0),
            detection_layers=detection_layers
        )
        
    except Exception as e:
        logger.error(f"Blocklist stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")


@router.post("/blocklist/refresh")
async def refresh_blocklist():
    """
    Manually refresh the disposable email blocklist.
    
    Forces a reload of the blocklist from the remote source.
    Use this if you want to ensure you have the latest list.
    """
    from services.email_validator import get_email_validator
    
    try:
        validator = await get_email_validator()
        success = await validator.blocklist.load_blocklist(force=True)
        
        if success:
            return {
                "success": True,
                "message": "Blocklist refreshed successfully",
                "total_domains": len(validator.blocklist.blocklist)
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to refresh blocklist")
            
    except Exception as e:
        logger.error(f"Blocklist refresh error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error refreshing blocklist: {str(e)}")


@router.get("/check-domain/{domain}")
async def check_if_disposable(domain: str):
    """
    Check if a specific domain is in the disposable blocklist with detailed detection info.
    
    Args:
        domain: The domain to check (e.g., 'tempmail.com')
    
    Returns:
        Whether the domain is considered disposable and which detection method caught it
    """
    from services.email_validator import get_email_validator
    
    try:
        validator = await get_email_validator()
        blocklist = validator.blocklist
        domain_lower = domain.lower().strip()
        
        # Check each layer
        detection_info = {
            "domain": domain,
            "is_disposable": False,
            "detection_method": None,
            "details": {}
        }
        
        # Check trusted provider
        if blocklist._is_trusted_provider(domain_lower):
            detection_info["details"]["trusted_provider"] = True
            detection_info["message"] = "This domain is a trusted email provider"
            return detection_info
        
        detection_info["details"]["trusted_provider"] = False
        
        # Check blocklist exact match
        if domain_lower in blocklist.blocklist:
            detection_info["is_disposable"] = True
            detection_info["detection_method"] = "Blocklist (Exact Match)"
            detection_info["message"] = "This domain is blocked as disposable"
            return detection_info
        
        # Check parent domains
        domain_parts = domain_lower.split(".")
        for i in range(len(domain_parts) - 1):
            parent_domain = ".".join(domain_parts[i:])
            if parent_domain in blocklist.blocklist:
                detection_info["is_disposable"] = True
                detection_info["detection_method"] = "Blocklist (Parent Domain Match)"
                detection_info["details"]["matched_parent"] = parent_domain
                detection_info["message"] = f"This domain is blocked (parent domain '{parent_domain}' is disposable)"
                return detection_info
        
        # Check pattern match
        if blocklist._check_pattern_match(domain_lower):
            detection_info["is_disposable"] = True
            detection_info["detection_method"] = "Pattern Matching"
            detection_info["message"] = "This domain matches disposable email patterns"
            return detection_info
        
        # Check suspicious TLD
        if blocklist._check_suspicious_tld(domain_lower):
            detection_info["is_disposable"] = True
            detection_info["detection_method"] = "Suspicious TLD"
            detection_info["message"] = "This domain uses a suspicious TLD commonly used for disposable emails"
            return detection_info
        
        # Check suspicious structure
        if blocklist._check_suspicious_structure(domain_lower):
            detection_info["is_disposable"] = True
            detection_info["detection_method"] = "Suspicious Structure"
            detection_info["message"] = "This domain has suspicious structural characteristics"
            return detection_info
        
        detection_info["message"] = "This domain is allowed"
        return detection_info
        
    except Exception as e:
        logger.error(f"Domain check error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error checking domain: {str(e)}")
