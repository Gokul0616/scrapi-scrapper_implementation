from fastapi import APIRouter, Depends, HTTPException, Request
from database import get_db
from .dependencies import get_api_user
from services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["Sessions"])

def get_session_service() -> SessionService:
    db = get_db()
    return SessionService(db.sessions)

@router.get("")
async def get_sessions(current_user: dict = Depends(get_api_user), session_service: SessionService = Depends(get_session_service)):
    sessions = await session_service.get_active_sessions(current_user["id"])
    return {
        "sessions": sessions,
        "current_jti": current_user.get("jti")
    }

@router.delete("/{session_id}")
async def revoke_session(session_id: str, current_user: dict = Depends(get_api_user), session_service: SessionService = Depends(get_session_service)):
    success = await session_service.revoke_session(session_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Session not found or already revoked.")
    return {"message": "Session revoked"}
