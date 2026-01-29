
from fastapi import APIRouter, Depends, HTTPException, Optional
from datetime import datetime, timezone
import logging

from backend.database import get_db, get_task_manager
from backend.routes.runs import execute_scraping_job
from auth import get_current_user
from models import (
    LeadChatRequest, LeadChatMessage
)
from services import LeadChatService, EnhancedGlobalChatService

logger = logging.getLogger(__name__)

router = APIRouter()

# ============= Lead Chat Routes (AI Engagement Advice) =============
@router.post("/leads/{lead_id}/chat")
async def chat_with_lead(
    lead_id: str,
    chat_request: LeadChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Get AI-powered engagement advice for a lead."""
    db = get_db()
    try:
        # Get lead data from dataset_items
        lead = await db.dataset_items.find_one({"id": lead_id}, {"_id": 0})
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Verify user has access to this lead
        run = await db.runs.find_one({"id": lead['run_id'], "user_id": current_user['id']})
        if not run:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Initialize chat service
        chat_service = LeadChatService()
        
        # Get previous chat history
        chat_history = await db.lead_chats.find(
            {"lead_id": lead_id, "user_id": current_user['id']},
            {"_id": 0}
        ).sort("created_at", 1).to_list(100)
        
        # Get AI response
        ai_response = await chat_service.get_engagement_advice(
            lead_data={**chat_request.lead_data, 'id': lead_id},
            user_message=chat_request.message,
            chat_history=chat_history
        )
        
        # Save user message
        user_message = LeadChatMessage(
            lead_id=lead_id,
            user_id=current_user['id'],
            role='user',
            content=chat_request.message
        )
        user_doc = user_message.model_dump()
        user_doc['created_at'] = user_doc['created_at'].isoformat()
        await db.lead_chats.insert_one(user_doc)
        
        # Save AI response
        ai_message = LeadChatMessage(
            lead_id=lead_id,
            user_id=current_user['id'],
            role='assistant',
            content=ai_response
        )
        ai_doc = ai_message.model_dump()
        ai_doc['created_at'] = ai_doc['created_at'].isoformat()
        await db.lead_chats.insert_one(ai_doc)
        
        return {
            "response": ai_response,
            "message_id": ai_message.id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/leads/{lead_id}/chat")
async def get_lead_chat_history(
    lead_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get chat history for a lead."""
    db = get_db()
    # Verify access
    lead = await db.dataset_items.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    run = await db.runs.find_one({"id": lead['run_id'], "user_id": current_user['id']})
    if not run:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get chat history
    messages = await db.lead_chats.find(
        {"lead_id": lead_id, "user_id": current_user['id']},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    # Convert datetime strings
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
    
    return messages

@router.post("/leads/{lead_id}/outreach-template")
async def generate_outreach_template(
    lead_id: str,
    channel: str = "email",
    current_user: dict = Depends(get_current_user)
):
    """Generate a personalized outreach template for a lead."""
    db = get_db()
    try:
        # Get lead data
        lead = await db.dataset_items.find_one({"id": lead_id}, {"_id": 0})
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Verify access
        run = await db.runs.find_one({"id": lead['run_id'], "user_id": current_user['id']})
        if not run:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Generate template
        chat_service = LeadChatService()
        template = await chat_service.generate_outreach_template(
            lead_data={**lead['data'], 'id': lead_id},
            channel=channel
        )
        
        return {"template": template}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Template generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate template: {str(e)}")

# ============= Global Chat Routes =============
@router.post("/chat/global")
async def global_chat(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Enhanced global chat assistant with COMPLETE automation control - full AI agent."""
    db = get_db()
    task_manager = get_task_manager()
    try:
        message = request.get('message')
        
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        # Use enhanced global chat service with user context
        chat_service = EnhancedGlobalChatService(db, current_user['id'])
        result = await chat_service.chat(message)
        
        # Handle MULTIPLE runs if created (supports multiple commands in one request)
        if result.get("run_ids") and len(result["run_ids"]) > 0:
            logger.info(f"🔄 Processing {len(result['run_ids'])} runs from chat command")
            
            # Start ALL runs in parallel
            for idx, run_id in enumerate(result["run_ids"]):
                logger.info(f"📋 Processing run {idx+1}/{len(result['run_ids'])}: {run_id}")
                
                actor_id = result.get("actor_id") if not result.get("run_ids") else (
                    result.get("actor_id") if idx == 0 else None
                )
                input_data = result.get("input_data") if not result.get("run_ids") else (
                    result.get("input_data") if idx == 0 else None
                )
                
                # Fetch run details if not provided
                if not actor_id or not input_data:
                    logger.info(f"🔍 Fetching run details from database for {run_id}")
                    run = await db.runs.find_one({"id": run_id}, {"_id": 0})
                    if run:
                        actor_id = run.get("actor_id")
                        input_data = run.get("input_data")
                        logger.info(f"✓ Found actor: {run.get('actor_name')}, input: {input_data}")
                    else:
                        logger.error(f"❌ Run {run_id} not found in database!")
                        continue
                
                if actor_id and input_data:
                    logger.info(f"🤖 AI Agent starting run {run_id} ({idx+1}/{len(result['run_ids'])}) from chat...")
                    
                    # Use task manager for parallel execution
                    if task_manager:
                        await task_manager.start_task(
                            run.id,
                            execute_scraping_job(
                                run_id,
                                actor_id,
                                current_user['id'],
                                input_data,
                                None # Global chat runs default to personal for now
                            )
                        )
                        logger.info(f"✓ Run {run_id} started by AI Agent. Active tasks: {task_manager.get_running_count()}")
                    else:
                        logger.warning(f"Task manager not initialized, AI Agent could not start run {run_id}")
                else:
                    logger.error(f"❌ Missing actor_id or input_data for run {run_id}")
        # Backwards compatibility: handle single run_id
        elif result.get("run_id") and result.get("actor_id"):
            run_id = result["run_id"]
            actor_id = result["actor_id"]
            input_data = result["input_data"]
            
            logger.info(f"🤖 AI Agent starting run {run_id} from chat...")
            
            # Use task manager for parallel execution
            if task_manager:
                await task_manager.start_task(
                    run_id,
                    execute_scraping_job(
                        run_id,
                        actor_id,
                        current_user['id'],
                        input_data
                    )
                )
                logger.info(f"✓ Run {run_id} started by AI Agent. Active tasks: {task_manager.get_running_count()}")
            else:
                 logger.warning(f"Task manager not initialized, AI Agent could not start run {run_id}")
        
        # Return response with action metadata for UI automation
        response_data = {
            "response": result["response"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Include action metadata if present (navigate, export, fill_and_run, etc.)
        if result.get("action"):
            response_data.update(result["action"])
        
        return response_data
    
    except Exception as e:
        logger.error(f"Global chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/global/history")
async def get_chat_history(
    current_user: dict = Depends(get_current_user),
    limit: int = 50
):
    """Get user's global chat conversation history."""
    db = get_db()
    try:
        chat_service = EnhancedGlobalChatService(db, current_user['id'])
        history = await chat_service.get_conversation_history(limit=limit)
        return {"history": history}
    except Exception as e:
        logger.error(f"Error getting chat history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/chat/global/history")
async def clear_chat_history(
    current_user: dict = Depends(get_current_user)
):
    """Clear user's global chat conversation history."""
    db = get_db()
    try:
        chat_service = EnhancedGlobalChatService(db, current_user['id'])
        result = await chat_service.clear_history()
        return result
    except Exception as e:
        logger.error(f"Error clearing chat history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
