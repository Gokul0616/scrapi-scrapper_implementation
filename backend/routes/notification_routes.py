from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from typing import List, Optional
from datetime import datetime
import json
import asyncio
import logging
from auth import get_current_user
from models.notification import Notification, NotificationResponse, MarkAsReadRequest

# Setup logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])

# Store active WebSocket connections
active_connections: dict[str, List[WebSocket]] = {}

_db = None

def set_notification_db(database):
    global _db
    _db = database

# WebSocket endpoint for real-time notifications
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = None):
    user_id = None
    
    # Always accept the connection first (required by WebSocket protocol)
    await websocket.accept()
    
    try:
        # Authenticate user via token
        if not token:
            logger.info("WebSocket: No token provided")
            await websocket.close(code=1008, reason="Authentication required")
            return
            
        from auth import decode_token
        try:
            payload = decode_token(token)
            user_id = payload.get("sub")
            
            if not user_id:
                logger.info("WebSocket: No user_id in token payload")
                await websocket.close(code=1008, reason="Invalid token")
                return
                
        except Exception as e:
            logger.info(f"WebSocket: Token decode error: {e}")
            await websocket.close(code=1008, reason="Invalid token")
            return
        
        logger.info(f"WebSocket: Connection authenticated for user {user_id}")
        
        # Add connection to active connections
        if user_id not in active_connections:
            active_connections[user_id] = []
        active_connections[user_id].append(websocket)
        
        # Check if this is user's first login
        user = await _db.users.find_one({"user_id": user_id})
        if user:
            # Check if welcome notification already sent
            existing_welcome = await _db.notifications.find_one({
                "user_id": user_id,
                "type": "welcome"
            })
            
            if not existing_welcome:
                # Send welcome notification
                welcome_notification = Notification(
                    user_id=user_id,
                    title="Welcome to Scrapi! 👋",
                    message="Get started by creating your first actor and exploring our marketplace.",
                    type="welcome",
                    icon="👋",
                    link="/actors"
                )
                
                # Save to database
                await _db.notifications.insert_one(welcome_notification.model_dump())
                
                # Send to client
                await websocket.send_json({
                    "type": "new_notification",
                    "notification": {
                        "notification_id": welcome_notification.notification_id,
                        "title": welcome_notification.title,
                        "message": welcome_notification.message,
                        "type": welcome_notification.type,
                        "read": welcome_notification.read,
                        "created_at": welcome_notification.created_at.isoformat(),
                        "link": welcome_notification.link,
                        "icon": welcome_notification.icon
                    }
                })
        
        # Keep connection alive
        logger.info(f"WebSocket: Starting message loop for user {user_id}")
        while True:
            try:
                data = await websocket.receive_text()
                # Handle ping/pong
                if data == "ping":
                    await websocket.send_text("pong")
            except WebSocketDisconnect:
                logger.info(f"WebSocket: Client disconnected for user {user_id}")
                break
            except Exception as e:
                logger.info(f"WebSocket: Error in message loop for user {user_id}: {e}")
                break
                        
    except WebSocketDisconnect:
        logger.info(f"WebSocket: Disconnected for user {user_id}")
    except Exception as e:
        logger.info(f"WebSocket error for user {user_id}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Remove connection from active connections
        if user_id and user_id in active_connections:
            if websocket in active_connections[user_id]:
                active_connections[user_id].remove(websocket)
            if not active_connections[user_id]:
                del active_connections[user_id]
        logger.info(f"WebSocket: Cleanup complete for user {user_id}")

# Get all notifications for current user
@router.get("", response_model=List[NotificationResponse])
async def get_notifications(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    notifications = await _db.notifications.find(
        {"user_id": user_id}
    ).sort("created_at", -1).to_list(length=100)
    
    return [
        NotificationResponse(
            notification_id=n["notification_id"],
            title=n["title"],
            message=n["message"],
            type=n["type"],
            read=n["read"],
            created_at=n["created_at"],
            link=n.get("link"),
            icon=n.get("icon")
        )
        for n in notifications
    ]

# Mark notifications as read
@router.post("/mark-as-read")
async def mark_notifications_as_read(
    request: MarkAsReadRequest,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    
    result = await _db.notifications.update_many(
        {
            "user_id": user_id,
            "notification_id": {"$in": request.notification_ids}
        },
        {"$set": {"read": True}}
    )
    
    return {"success": True, "modified_count": result.modified_count}

# Mark all notifications as read
@router.post("/mark-all-as-read")
async def mark_all_notifications_as_read(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    result = await _db.notifications.update_many(
        {"user_id": user_id, "read": False},
        {"$set": {"read": True}}
    )
    
    return {"success": True, "modified_count": result.modified_count}

# Get unread count
@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    count = await _db.notifications.count_documents(
        {"user_id": user_id, "read": False}
    )
    
    return {"count": count}

# Send notification to user (utility function for internal use)
async def send_notification_to_user(user_id: str, notification: Notification):
    """Send notification to user via WebSocket and save to database"""
    # Save to database
    await _db.notifications.insert_one(notification.model_dump())
    
    # Send via WebSocket if user is connected
    if user_id in active_connections:
        notification_data = {
            "type": "new_notification",
            "notification": {
                "notification_id": notification.notification_id,
                "title": notification.title,
                "message": notification.message,
                "type": notification.type,
                "read": notification.read,
                "created_at": notification.created_at.isoformat(),
                "link": notification.link,
                "icon": notification.icon
            }
        }
        
        # Send to all active connections for this user
        for websocket in active_connections[user_id]:
            try:
                await websocket.send_json(notification_data)
            except Exception as e:
                logger.info(f"Failed to send notification to user {user_id}: {e}")
