from fastapi import APIRouter, Depends, HTTPException, Body
from database import get_db
from .dependencies import get_api_user
from services.totp_service import TOTPService
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/security", tags=["Security"])
totp_service = TOTPService()

@router.post("/2fa/setup")
async def setup_2fa(current_user: dict = Depends(get_api_user)):
    """Generate a TOTP secret and QR code URI."""
    try:
        db = get_db()
        user = await db.users.find_one({"id": current_user["id"]})
        email = user.get("email") if user else "user@scrapi.com"
        
        if user and user.get("temp_totp_secret"):
            secret = user["temp_totp_secret"]
            uri = totp_service.generate_uri(secret, email)
            return {"uri": uri, "secret": secret}
            
        secret_data = totp_service.generate_secret(email)
        
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"temp_totp_secret": secret_data["secret"]}}
        )
        return {"uri": secret_data["uri"], "secret": secret_data["secret"]}
    except Exception as e:
        logger.error(f"Error in 2FA setup: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize 2FA setup.")

@router.post("/2fa/verify")
async def verify_2fa(token: str = Body(..., embed=True), current_user: dict = Depends(get_api_user)):
    """Verify the 6-digit code to enable 2FA and generate recovery codes."""
    db = get_db()
    user = await db.users.find_one({"id": current_user["id"]})
    if not user or "temp_totp_secret" not in user:
        raise HTTPException(status_code=400, detail="2FA setup not initiated.")
        
    secret = user["temp_totp_secret"]
    if not totp_service.verify_token(secret, token):
        raise HTTPException(status_code=400, detail="Invalid 2FA token.")
        
    # Generate recovery codes
    recovery_data = totp_service.generate_recovery_codes()
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "totp_secret": secret,
                "totp_enabled": True,
                "recovery_codes": recovery_data["hashed_codes"]
            },
            "$unset": {"temp_totp_secret": ""}
        }
    )
    return {"message": "2FA enabled", "recovery_codes": recovery_data["raw_codes"]}

@router.post("/2fa/disable")
async def disable_2fa(password: str = Body(..., embed=True), current_user: dict = Depends(get_api_user)):
    """Disable 2FA after verifying the user's password."""
    db = get_db()
    user = await db.users.find_one({"id": current_user["id"]})
    
    from auth import verify_password
    if "hashed_password" in user and not verify_password(password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid password.")
        
    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {"totp_enabled": False},
            "$unset": {"totp_secret": "", "recovery_codes": ""}
        }
    )
    return {"message": "2FA disabled"}
