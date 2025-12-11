"""
Email Validation API Routes

Provides endpoints for email validation testing and diagnostics.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email-validation", tags=["Email Validation"])


class EmailValidationRequest(BaseModel):
    """Request model for email validation."""
    email: EmailStr
    check_mx: bool = False
    check_smtp: bool = False


class EmailValidationResponse(BaseModel):
    """Response model for email validation."""
    email: str
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    checks: Dict[str, Optional[bool]]


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
    Validate an email address with comprehensive checks.
    
    This endpoint performs multi-layered email validation including:
    - Format validation (RFC 5322)
    - Disposable email detection
    - Optional MX record verification
    - Optional SMTP verification
    """
    from services.email_validator import get_email_validator
    
    try:
        validator = await get_email_validator()
        result = await validator.validate_email(
            request.email,
            check_mx=request.check_mx,
            check_smtp=request.check_smtp
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
            "Trusted Provider Whitelist",
            "Multi-Source Blocklist (4 sources)",
            "Pattern Matching (20+ keywords)",
            "Suspicious TLD Detection",
            "Domain Structure Analysis"
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
    Check if a specific domain is in the disposable blocklist.
    
    Args:
        domain: The domain to check (e.g., 'tempmail.com')
    
    Returns:
        Whether the domain is considered disposable
    """
    from services.email_validator import get_email_validator
    
    try:
        validator = await get_email_validator()
        is_disposable = validator.blocklist.is_disposable(domain)
        
        return {
            "domain": domain,
            "is_disposable": is_disposable,
            "message": "This domain is blocked as disposable" if is_disposable else "This domain is allowed"
        }
        
    except Exception as e:
        logger.error(f"Domain check error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error checking domain: {str(e)}")
