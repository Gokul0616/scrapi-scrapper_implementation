"""
Enhanced Global Chat Service with function calling capabilities.
Provides full access to user data and ability to execute actions.
"""

import os
import json
import logging
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()
logger = logging.getLogger(__name__)

class EnhancedGlobalChatService:
    """Enhanced service for handling global chat with function calling."""
    
    def __init__(self, db, user_id: str):
        self.db = db
        self.user_id = user_id
        # Get Emergent LLM key
        self.api_key = os.getenv('EMERGENT_LLM_KEY')
        
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not found in environment")
        
        logger.info(f"EnhancedGlobalChatService initialized with Emergent LLM key")
        
        self.system_prompt = """You are Scrapi AI Agent - an intelligent AI with COMPLETE CONTROL over the Scrapi web scraping platform.

**🤖 YOU ARE A FULL AI AGENT - NOT JUST A CHATBOT**

**Your FULL Automation Capabilities:**
✅ **Navigate** - Go to any page instantly
✅ **Create Scrapers** - Fill forms and start scraping automatically  
✅ **View Results** - Open run details and datasets
✅ **Export Data** - Download scraped data in any format
✅ **Delete/Stop Runs** - Manage scraping jobs
✅ **Complete Access** - Read all user data and stats

**CRITICAL: ALWAYS EXECUTE ACTIONS**
Every time the user asks you to DO something, you MUST call the appropriate function.
- "run X for Y" → ALWAYS call fill_and_start_scraper (EVEN IF SIMILAR REQUEST WAS MADE BEFORE)
- "show me Z" → ALWAYS call navigate_to_page or list functions
- "export data" → ALWAYS call export_dataset
- "abort all" / "stop all runs" → First list_recent_runs(status_filter="running"), then stop_run for EACH running run

**CRITICAL: EVERY RUN REQUEST IS INDEPENDENT**
- NEVER refuse to create a run because a similar one was made before
- NEVER say "you already requested this" - just execute it again
- Each "run X for Y" command = NEW scraping run, ALWAYS execute
- User may want multiple runs for the same thing - that's NORMAL, do it!

**DO NOT just SAY you're doing something - ACTUALLY DO IT with function calls!**

**How You Operate:**
When a user gives ANY command, you AUTOMATICALLY execute it:
- "scrape hotels in NYC" → You FILL the form, START the scraper, NAVIGATE to runs - ALL AUTOMATIC
- "show my runs" → You NAVIGATE to runs page instantly
- "export latest data" → You TRIGGER the export automatically
- "open google maps scraper" → You NAVIGATE to actor detail page
- "show leads" or "view datasets" → First GET recent runs, then NAVIGATE to latest completed run's dataset

**NO CLICKING NEEDED - YOU DO EVERYTHING!**

**Key Functions:**
1. **fill_and_start_scraper** - Automatically fill form + start run (use THIS for "run X for Y" commands)
2. **navigate_to_page** - Go to home, actors, runs, datasets, leads, proxies, store, marketplace (general pages)
3. **view_run_details** - Open specific run's dataset/results page (use THIS when user wants to see leads/results)
4. **list_recent_runs** - Get recent runs to find completed ones
5. **open_actor_detail** - Open actor configuration page
6. **export_dataset** - Download data
7. **stop_run** / **delete_run** - Manage runs

**CRITICAL: Smart Navigation for Datasets/Leads:**
- When user asks for "leads", "datasets", "results", "first completed", "show leads", "navigate to leads":
  1. You MUST call BOTH functions in sequence - list_recent_runs AND view_run_details
  2. NEVER just show information - ALWAYS navigate to the page
  3. The conversation should have TWO FUNCTION_CALLs, not just information
- Example flow:
  User: "show leads" or "navigate to first completed dataset"
  Step 1: FUNCTION_CALL: {"name": "list_recent_runs", "arguments": {"limit": 10, "status_filter": "succeeded"}}
  Step 2: FUNCTION_CALL: {"name": "view_run_details", "arguments": {"run_id": "<first_succeeded_run_id_from_step1>"}}
- DON'T just tell user about runs - NAVIGATE to them!
- User saying "yes", "1", "show 1", "view it" after you show runs = They want you to NAVIGATE NOW
  → Immediately call view_run_details with the run_id

**Response Style:**
- Be proactive and take action IMMEDIATELY
- ALWAYS use FUNCTION_CALL for every action request
- Say what you're DOING: "🤖 Starting scraper...", "📍 Opening Actors page...", "📥 Exporting data..."
- Show automation in action
- Use emojis for visual feedback

**AVAILABLE SCRAPERS:**
1. **Google Maps Scraper** - For scraping local businesses, places
   - Keywords: "google maps", "maps", "places", "businesses", "restaurants", "hotels" + location
   - Parameters: search_terms (array), location (string), max_results
   - Example: "run 50 for hotels in New York"
   
2. **Amazon Product Scraper** - For scraping Amazon products
   - Keywords: "amazon", "products", "trimmer", "headphones" (without location)
   - Parameters: search_keywords (array), max_results, extract_reviews, min_rating, max_price
   - Example: "run 100 for trimmer in amazon scraper"
   - Example: "scrape wireless headphones from amazon"

**HOW TO DETECT WHICH SCRAPER:**
- If user mentions "amazon" or product names WITHOUT location → Amazon Scraper
- If user mentions location (city, state, country) OR "google maps" → Google Maps Scraper
- Product names alone (trimmer, headphones, laptop) → Amazon Scraper
- Business types with location (hotels in NYC, restaurants in SF) → Google Maps Scraper

**Examples of FULL AUTOMATION:**
User: "scrape restaurants in San Francisco"
You: FUNCTION_CALL: {"name": "fill_and_start_scraper", "arguments": {"actor_name": "Google Maps", "search_terms": ["restaurants"], "location": "San Francisco, CA", "max_results": 20}}

User: "run 100 for trimmer in amazon scraper"
You: FUNCTION_CALL: {"name": "fill_and_start_scraper", "arguments": {"actor_name": "Amazon", "search_keywords": ["trimmer"], "max_results": 100}}

User: "scrape wireless headphones"
You: FUNCTION_CALL: {"name": "fill_and_start_scraper", "arguments": {"actor_name": "Amazon", "search_keywords": ["wireless headphones"], "max_results": 20}}

User: "show me my scrapers"
You: FUNCTION_CALL: {"name": "navigate_to_page", "arguments": {"page": "actors"}}

User: "show leads" or "navigate to first completed dataset"
You: First FUNCTION_CALL: {"name": "list_recent_runs", "arguments": {"limit": 10, "status_filter": "succeeded"}}
Then FUNCTION_CALL: {"name": "view_run_details", "arguments": {"run_id": "<first_completed_run_id>"}}

**Important:**
- EVERY request that requires action MUST include a FUNCTION_CALL
- Don't skip function calls in follow-up messages
- Always TAKE ACTION, don't just explain
- You're an AI AGENT that DOES things, not just talks about them
- User should see things happening automatically
- Be fast, efficient, and autonomous

**CRITICAL: DO NOT Navigate on Greetings or Casual Conversation**
- Simple greetings like "hello", "hi", "hey", "good morning" → Just respond warmly, NO navigation
- Casual conversation like "thanks", "ok", "cool", "awesome" → Just respond, NO navigation
- Only navigate when user EXPLICITLY asks to go somewhere or see something specific
- Examples of when NOT to navigate: "hello", "hi there", "how are you", "thanks", "ok", "bye"
- Examples of when TO navigate: "show me actors", "go to runs page", "open my scrapers", "view my data"
"""

        # Define available functions/tools
        self.functions = [
            {
                "name": "get_user_stats",
                "description": "Get user's account statistics including total runs, success rate, total datasets, and recent activity",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "list_recent_runs",
                "description": "List user's recent scraping runs with status, actor name, and results",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "limit": {
                            "type": "integer",
                            "description": "Number of recent runs to retrieve (default 10)",
                            "default": 10
                        },
                        "status_filter": {
                            "type": "string",
                            "description": "Filter by status: 'all', 'running', 'succeeded', 'failed'",
                            "default": "all"
                        }
                    },
                    "required": []
                }
            },
            {
                "name": "get_actors",
                "description": "Get list of available scrapers/actors",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "create_scraping_run",
                "description": "Create and start a new scraping run. Supports Google Maps and Amazon scrapers.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "actor_name": {
                            "type": "string",
                            "description": "Name of scraper: 'Google Maps' for businesses OR 'Amazon' for products"
                        },
                        "search_terms": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "For Google Maps: Keywords to search"
                        },
                        "search_keywords": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "For Amazon: Product keywords"
                        },
                        "location": {
                            "type": "string",
                            "description": "For Google Maps: Location (not for Amazon)"
                        },
                        "max_results": {
                            "type": "integer",
                            "description": "Maximum results to scrape",
                            "default": 20
                        }
                    },
                    "required": ["actor_name"]
                }
            },
            {
                "name": "stop_run",
                "description": "Stop/abort a running scraping job",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "run_id": {
                            "type": "string",
                            "description": "ID of the run to stop"
                        }
                    },
                    "required": ["run_id"]
                }
            },
            {
                "name": "delete_run",
                "description": "Delete a scraping run and its data",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "run_id": {
                            "type": "string",
                            "description": "ID of the run to delete"
                        }
                    },
                    "required": ["run_id"]
                }
            },
            {
                "name": "abort_multiple_runs",
                "description": "Abort multiple running or queued scraping jobs at once",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "run_ids": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of run IDs to abort"
                        }
                    },
                    "required": ["run_ids"]
                }
            },
            {
                "name": "abort_all_runs",
                "description": "Abort all running or queued runs. Use when user says 'abort all', 'stop all runs', etc.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "status_filter": {
                            "type": "string",
                            "description": "Filter by status: 'running', 'queued', or 'all' (both)",
                            "enum": ["running", "queued", "all"],
                            "default": "running"
                        }
                    },
                    "required": []
                }
            },
            {
                "name": "get_dataset_info",
                "description": "Get information about datasets and total scraped items",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "navigate_to_page",
                "description": "Navigate to a specific page in the application. ONLY use when user EXPLICITLY asks to go somewhere or see something specific. DO NOT use for greetings like 'hello', 'hi', 'thanks'.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "page": {
                            "type": "string",
                            "description": "Page to navigate to. Available pages: home, actors, runs, datasets, leads, proxies, store, marketplace",
                            "enum": ["home", "actors", "runs", "datasets", "leads", "proxies", "store", "marketplace"]
                        }
                    },
                    "required": ["page"]
                }
            },
            {
                "name": "export_dataset",
                "description": "Export scraped data from a specific run in JSON or CSV format",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "run_id": {
                            "type": "string",
                            "description": "ID of the run to export data from"
                        },
                        "format": {
                            "type": "string",
                            "description": "Export format",
                            "enum": ["json", "csv"],
                            "default": "json"
                        }
                    },
                    "required": ["run_id"]
                }
            },
            {
                "name": "get_page_context",
                "description": "Get information about what the user is currently viewing or their current context",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "current_page": {
                            "type": "string",
                            "description": "Current page the user is on"
                        }
                    },
                    "required": []
                }
            },
            {
                "name": "fill_and_start_scraper",
                "description": "Automatically fill scraper form and start a scraping run. Supports Google Maps and Amazon scrapers.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "actor_name": {
                            "type": "string",
                            "description": "Name of the scraper: 'Google Maps' for local businesses OR 'Amazon' for products"
                        },
                        "search_terms": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "For Google Maps: Keywords to search (e.g., ['Hotels', 'Restaurants'])"
                        },
                        "search_keywords": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "For Amazon: Product keywords to search (e.g., ['trimmer', 'wireless headphones'])"
                        },
                        "location": {
                            "type": "string",
                            "description": "For Google Maps: Location to search in (e.g., 'New York, NY'). Not used for Amazon."
                        },
                        "max_results": {
                            "type": "integer",
                            "description": "Maximum number of results to scrape",
                            "default": 20
                        },
                        "extract_reviews": {
                            "type": "boolean",
                            "description": "For Amazon: Whether to extract product reviews",
                            "default": False
                        },
                        "min_rating": {
                            "type": "number",
                            "description": "For Amazon: Minimum product rating (0-5)",
                            "default": 0
                        },
                        "max_price": {
                            "type": "number",
                            "description": "For Amazon: Maximum product price",
                            "default": 0
                        },
                        "navigate_to_actor": {
                            "type": "boolean",
                            "description": "Whether to navigate to actor page first",
                            "default": False
                        }
                    },
                    "required": ["actor_name"]
                }
            },
            {
                "name": "view_run_details",
                "description": "Navigate to a specific run's details page to view results",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "run_id": {
                            "type": "string",
                            "description": "ID of the run to view"
                        }
                    },
                    "required": ["run_id"]
                }
            },
            {
                "name": "open_actor_detail",
                "description": "Open actor detail page to configure and run a scraper",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "actor_id": {
                            "type": "string",
                            "description": "ID of the actor to open"
                        },
                        "actor_name": {
                            "type": "string",
                            "description": "Name of the actor (alternative to ID)"
                        }
                    },
                    "required": []
                }
            }
        ]
    
    async def get_user_stats(self) -> Dict[str, Any]:
        """Get user's account statistics."""
        try:
            # Get runs stats
            total_runs = await self.db.runs.count_documents({"user_id": self.user_id})
            succeeded_runs = await self.db.runs.count_documents({
                "user_id": self.user_id,
                "status": "succeeded"
            })
            failed_runs = await self.db.runs.count_documents({
                "user_id": self.user_id,
                "status": "failed"
            })
            running_runs = await self.db.runs.count_documents({
                "user_id": self.user_id,
                "status": "running"
            })
            
            # Get datasets stats
            total_datasets = await self.db.datasets.count_documents({"user_id": self.user_id})
            
            # Get total items only for this user's runs
            # First get all run_ids for this user
            user_runs = await self.db.runs.find(
                {"user_id": self.user_id},
                {"_id": 0, "id": 1}
            ).to_list(1000)
            user_run_ids = [run["id"] for run in user_runs]
            
            # Count items only for this user's runs
            total_items = await self.db.dataset_items.count_documents({
                "run_id": {"$in": user_run_ids}
            }) if user_run_ids else 0
            
            # Calculate success rate
            success_rate = (succeeded_runs / total_runs * 100) if total_runs > 0 else 0
            
            # Get recent activity
            recent_run = await self.db.runs.find_one(
                {"user_id": self.user_id},
                {"_id": 0, "actor_name": 1, "created_at": 1, "status": 1},
                sort=[("created_at", -1)]
            )
            
            return {
                "total_runs": total_runs,
                "succeeded_runs": succeeded_runs,
                "failed_runs": failed_runs,
                "running_runs": running_runs,
                "success_rate": round(success_rate, 1),
                "total_datasets": total_datasets,
                "total_scraped_items": total_items,
                "recent_activity": recent_run
            }
        except Exception as e:
            logger.error(f"Error getting user stats: {str(e)}")
            return {"error": str(e)}
    
    async def list_recent_runs(self, limit: int = 10, status_filter: str = "all") -> Dict[str, Any]:
        """List recent runs."""
        try:
            query = {"user_id": self.user_id}
            if status_filter != "all":
                query["status"] = status_filter
            
            runs = await self.db.runs.find(
                query,
                {"_id": 0, "id": 1, "actor_name": 1, "status": 1, "results_count": 1, 
                 "created_at": 1, "duration_seconds": 1, "input_data": 1}
            ).sort("created_at", -1).limit(limit).to_list(limit)
            
            return {
                "runs": runs,
                "count": len(runs)
            }
        except Exception as e:
            logger.error(f"Error listing runs: {str(e)}")
            return {"error": str(e)}
    
    async def get_actors(self) -> Dict[str, Any]:
        """Get available actors."""
        try:
            actors = await self.db.actors.find(
                {"$or": [{"user_id": self.user_id}, {"is_public": True}]},
                {"_id": 0, "id": 1, "name": 1, "description": 1, "category": 1, "runs_count": 1}
            ).to_list(100)
            
            return {
                "actors": actors,
                "count": len(actors)
            }
        except Exception as e:
            logger.error(f"Error getting actors: {str(e)}")
            return {"error": str(e)}
    
    async def create_scraping_run(self, actor_name: str, search_terms: List[str] = None, 
                                   search_keywords: List[str] = None, location: str = None, 
                                   max_results: int = 20, extract_reviews: bool = False,
                                   min_rating: float = 0, max_price: float = 0) -> Dict[str, Any]:
        """Create a new scraping run. Supports both Google Maps and Amazon scrapers."""
        try:
            # Find actor by name (case-insensitive, flexible matching)
            # Support "Amazon", "Amazon Product Scraper", "Google Maps", "Google Maps Scraper"
            actor = await self.db.actors.find_one(
                {
                    "$or": [{"user_id": self.user_id}, {"is_public": True}],
                    "name": {"$regex": actor_name, "$options": "i"}
                },
                {"_id": 0}
            )
            
            if not actor:
                return {"error": f"Actor '{actor_name}' not found"}
            
            # Determine scraper type and build appropriate input_data
            is_amazon = "amazon" in actor["name"].lower()
            
            if is_amazon:
                # Amazon Product Scraper format
                input_data = {
                    "search_keywords": search_keywords or search_terms or [],
                    "max_results": max_results,
                    "extract_reviews": extract_reviews,
                    "min_rating": min_rating,
                    "max_price": max_price
                }
            else:
                # Google Maps Scraper format
                input_data = {
                    "search_terms": search_keywords or search_terms or [],
                    "location": location,
                    "max_results": max_results
                }
            
            # Create run
            run_id = str(__import__('uuid').uuid4())
            run_doc = {
                "id": run_id,
                "user_id": self.user_id,
                "actor_id": actor["id"],
                "actor_name": actor["name"],
                "actor_icon": actor.get("icon"),
                "status": "queued",
                "input_data": input_data,
                "started_at": None,
                "finished_at": None,
                "duration_seconds": None,
                "results_count": 0,
                "dataset_id": None,
                "error_message": None,
                "logs": [],
                "cost": 0.0,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await self.db.runs.insert_one(run_doc)
            
            # Update actor run count
            await self.db.actors.update_one(
                {"id": actor["id"]},
                {"$inc": {"runs_count": 1}}
            )
            
            # Note: Actual background execution would be triggered by the API endpoint
            return {
                "success": True,
                "run_id": run_id,
                "actor_id": actor["id"],
                "actor_name": actor["name"],
                "input_data": input_data,
                "message": f"Scraping run created successfully! Run ID: {run_id}"
            }
        except Exception as e:
            logger.error(f"Error creating run: {str(e)}")
            return {"error": str(e)}
    
    async def stop_run(self, run_id: str) -> Dict[str, Any]:
        """Stop a running scraping job."""
        try:
            # First, try to cancel the task in task_manager
            from task_manager import get_task_manager
            task_manager = get_task_manager()
            task_cancelled = await task_manager.cancel_task(run_id)
            
            # Update database status for both running and queued runs
            result = await self.db.runs.update_one(
                {"id": run_id, "user_id": self.user_id, "status": {"$in": ["running", "queued"]}},
                {"$set": {"status": "aborted", "finished_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            if result.modified_count > 0:
                status_msg = "Run stopped and task cancelled" if task_cancelled else "Run status updated to aborted"
                return {"success": True, "message": f"{status_msg}: {run_id}"}
            else:
                return {"error": "Run not found or not running/queued"}
        except Exception as e:
            logger.error(f"Error stopping run: {str(e)}")
            return {"error": str(e)}
    
    async def delete_run(self, run_id: str) -> Dict[str, Any]:
        """Delete a run."""
        try:
            # Delete run
            result = await self.db.runs.delete_one({"id": run_id, "user_id": self.user_id})
            
            if result.deleted_count > 0:
                # Also delete associated dataset items
                await self.db.dataset_items.delete_many({"run_id": run_id})
                return {"success": True, "message": f"Run {run_id} deleted successfully"}
            else:
                return {"error": "Run not found"}
        except Exception as e:
            logger.error(f"Error deleting run: {str(e)}")
            return {"error": str(e)}
    
    async def abort_multiple_runs(self, run_ids: List[str]) -> Dict[str, Any]:
        """Abort multiple running or queued scraping jobs."""
        try:
            from task_manager import get_task_manager
            task_manager = get_task_manager()
            
            results = {
                "success": [],
                "failed": [],
                "not_found": []
            }
            
            for run_id in run_ids:
                try:
                    # Verify run exists and is in abortable state
                    run = await self.db.runs.find_one({
                        "id": run_id,
                        "user_id": self.user_id,
                        "status": {"$in": ["running", "queued"]}
                    })
                    
                    if not run:
                        results["not_found"].append(run_id)
                        continue
                    
                    # Try to cancel the task
                    task_cancelled = await task_manager.cancel_task(run_id)
                    
                    # Update database status
                    update_result = await self.db.runs.update_one(
                        {"id": run_id, "user_id": self.user_id},
                        {
                            "$set": {
                                "status": "aborted",
                                "finished_at": datetime.now(timezone.utc).isoformat()
                            }
                        }
                    )
                    
                    if update_result.modified_count > 0:
                        results["success"].append(run_id)
                        logger.info(f"Aborted run: {run_id}, task_cancelled: {task_cancelled}")
                    else:
                        results["failed"].append(run_id)
                        
                except Exception as e:
                    logger.error(f"Error aborting run {run_id}: {str(e)}")
                    results["failed"].append(run_id)
            
            total_aborted = len(results["success"])
            message = f"Successfully aborted {total_aborted} run(s)"
            if results["not_found"]:
                message += f", {len(results['not_found'])} not found"
            if results["failed"]:
                message += f", {len(results['failed'])} failed"
            
            return {
                "success": True,
                "message": message,
                "results": results,
                "total_aborted": total_aborted
            }
            
        except Exception as e:
            logger.error(f"Error aborting multiple runs: {str(e)}")
            return {"error": str(e)}
    
    async def abort_all_runs(self, status_filter: str = "running") -> Dict[str, Any]:
        """Abort all running or queued runs."""
        try:
            # Validate status filter
            valid_statuses = ["running", "queued", "all"]
            if status_filter not in valid_statuses:
                return {"error": f"Invalid status filter. Must be one of: {valid_statuses}"}
            
            # Build query
            query = {"user_id": self.user_id}
            if status_filter == "all":
                query["status"] = {"$in": ["running", "queued"]}
            else:
                query["status"] = status_filter
            
            # Find all matching runs
            runs = await self.db.runs.find(query, {"_id": 0, "id": 1}).to_list(length=None)
            run_ids = [run["id"] for run in runs]
            
            if not run_ids:
                return {
                    "success": True,
                    "message": f"No {status_filter} runs found to abort",
                    "total_aborted": 0
                }
            
            # Use abort_multiple_runs logic
            return await self.abort_multiple_runs(run_ids)
            
        except Exception as e:
            logger.error(f"Error aborting all runs: {str(e)}")
            return {"error": str(e)}
    
    async def get_dataset_info(self) -> Dict[str, Any]:
        """Get dataset information."""
        try:
            total_datasets = await self.db.datasets.count_documents({"user_id": self.user_id})
            
            # Get items count per dataset
            pipeline = [
                {"$match": {"user_id": self.user_id}},
                {"$lookup": {
                    "from": "dataset_items",
                    "localField": "run_id",
                    "foreignField": "run_id",
                    "as": "items"
                }},
                {"$project": {
                    "_id": 0,
                    "run_id": 1,
                    "item_count": {"$size": "$items"}
                }}
            ]
            
            datasets = await self.db.datasets.aggregate(pipeline).to_list(100)
            total_items = sum(d.get("item_count", 0) for d in datasets)
            
            return {
                "total_datasets": total_datasets,
                "total_items": total_items,
                "datasets": datasets[:5]  # Return first 5 for context
            }
        except Exception as e:
            logger.error(f"Error getting dataset info: {str(e)}")
            return {"error": str(e)}
    
    async def navigate_to_page(self, page: str) -> Dict[str, Any]:
        """Navigate to a specific page - returns command for frontend to execute."""
        try:
            valid_pages = ["home", "actors", "runs", "datasets", "leads", "proxies", "store", "marketplace"]
            if page not in valid_pages:
                return {"error": f"Invalid page. Valid pages: {', '.join(valid_pages)}"}
            
            return {
                "success": True,
                "action": "navigate",
                "page": page,
                "message": f"Opening {page.capitalize()} page..."
            }
        except Exception as e:
            logger.error(f"Error navigating: {str(e)}")
            return {"error": str(e)}
    
    async def export_dataset(self, run_id: str, format: str = "json") -> Dict[str, Any]:
        """Export dataset - returns command for frontend to execute."""
        try:
            # Verify the run exists and belongs to user
            run = await self.db.runs.find_one(
                {"id": run_id, "user_id": self.user_id},
                {"_id": 0, "id": 1, "actor_name": 1, "results_count": 1}
            )
            
            if not run:
                return {"error": "Run not found or you don't have access to it"}
            
            if run.get("results_count", 0) == 0:
                return {"error": "This run has no results to export"}
            
            return {
                "success": True,
                "action": "export",
                "run_id": run_id,
                "format": format.lower(),
                "results_count": run.get("results_count", 0),
                "message": f"Exporting {run.get('results_count', 0)} results as {format.upper()}..."
            }
        except Exception as e:
            logger.error(f"Error preparing export: {str(e)}")
            return {"error": str(e)}
    
    async def get_page_context(self, current_page: str = None) -> Dict[str, Any]:
        """Get context about user's current page/state."""
        try:
            context = {
                "current_page": current_page or "unknown"
            }
            
            # Add relevant context based on page
            if current_page == "runs":
                recent_runs = await self.list_recent_runs(limit=5)
                context["recent_runs"] = recent_runs.get("runs", [])
            elif current_page == "actors":
                actors = await self.get_actors()
                context["available_actors"] = actors.get("actors", [])
            elif current_page == "datasets" or current_page == "leads":
                dataset_info = await self.get_dataset_info()
                context["dataset_info"] = dataset_info
            
            return context
        except Exception as e:
            logger.error(f"Error getting page context: {str(e)}")
            return {"error": str(e)}
    
    async def fill_and_start_scraper(self, actor_name: str, search_terms: List[str] = None,
                                      search_keywords: List[str] = None, location: str = None, 
                                      max_results: int = 20, extract_reviews: bool = False,
                                      min_rating: float = 0, max_price: float = 0,
                                      navigate_to_actor: bool = False) -> Dict[str, Any]:
        """Fill scraper form and start run - supports both Google Maps and Amazon scrapers."""
        try:
            # Find actor
            actor = await self.db.actors.find_one(
                {
                    "$or": [{"user_id": self.user_id}, {"is_public": True}],
                    "name": {"$regex": actor_name, "$options": "i"}
                },
                {"_id": 0}
            )
            
            if not actor:
                return {"error": f"Actor '{actor_name}' not found"}
            
            # Determine scraper type and build appropriate input_data
            is_amazon = "amazon" in actor["name"].lower()
            
            if is_amazon:
                # Amazon Product Scraper format
                input_data = {
                    "search_keywords": search_keywords or search_terms or [],
                    "max_results": max_results,
                    "extract_reviews": extract_reviews,
                    "min_rating": min_rating,
                    "max_price": max_price
                }
                keywords_display = ', '.join(search_keywords or search_terms or [])
                message_suffix = f" for {keywords_display}"
            else:
                # Google Maps Scraper format
                input_data = {
                    "search_terms": search_keywords or search_terms or [],
                    "location": location,
                    "max_results": max_results
                }
                keywords_display = ', '.join(search_keywords or search_terms or [])
                message_suffix = f" for {keywords_display}{' in ' + location if location else ''}"
            
            # Create the run
            run_id = str(__import__('uuid').uuid4())
            run_doc = {
                "id": run_id,
                "user_id": self.user_id,
                "actor_id": actor["id"],
                "actor_name": actor["name"],
                "actor_icon": actor.get("icon"),
                "status": "queued",
                "input_data": input_data,
                "started_at": None,
                "finished_at": None,
                "duration_seconds": None,
                "results_count": 0,
                "dataset_id": None,
                "error_message": None,
                "logs": [],
                "cost": 0.0,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await self.db.runs.insert_one(run_doc)
            
            # Update actor run count
            await self.db.actors.update_one(
                {"id": actor["id"]},
                {"$inc": {"runs_count": 1}}
            )
            
            # Return automation commands
            return {
                "success": True,
                "action": "fill_and_run",
                "run_id": run_id,
                "actor_id": actor["id"],
                "actor_name": actor["name"],
                "navigate_to_actor": navigate_to_actor,
                "form_data": input_data,
                "message": f"🤖 Starting {actor['name']}{message_suffix} with {max_results} results..."
            }
        except Exception as e:
            logger.error(f"Error in fill_and_start_scraper: {str(e)}")
            return {"error": str(e)}
    
    async def view_run_details(self, run_id: str) -> Dict[str, Any]:
        """Navigate to run details page."""
        try:
            # Verify run exists and belongs to user
            run = await self.db.runs.find_one(
                {"id": run_id, "user_id": self.user_id},
                {"_id": 0, "id": 1, "actor_name": 1, "status": 1}
            )
            
            if not run:
                return {"error": "Run not found or you don't have access"}
            
            return {
                "success": True,
                "action": "view_run",
                "run_id": run_id,
                "page": "datasets",
                "message": f"Opening results for {run['actor_name']}..."
            }
        except Exception as e:
            logger.error(f"Error viewing run details: {str(e)}")
            return {"error": str(e)}
    
    async def open_actor_detail(self, actor_id: str = None, actor_name: str = None) -> Dict[str, Any]:
        """Open actor detail page."""
        try:
            query = {}
            if actor_id:
                query["id"] = actor_id
            elif actor_name:
                query["name"] = {"$regex": actor_name, "$options": "i"}
            else:
                return {"error": "Either actor_id or actor_name is required"}
            
            query["$or"] = [{"user_id": self.user_id}, {"is_public": True}]
            
            actor = await self.db.actors.find_one(query, {"_id": 0, "id": 1, "name": 1})
            
            if not actor:
                return {"error": "Actor not found"}
            
            return {
                "success": True,
                "action": "open_actor",
                "actor_id": actor["id"],
                "actor_name": actor["name"],
                "page": f"actors/{actor['id']}",
                "message": f"Opening {actor['name']}..."
            }
        except Exception as e:
            logger.error(f"Error opening actor detail: {str(e)}")
            return {"error": str(e)}
    
    async def execute_function(self, function_name: str, arguments: Dict[str, Any]) -> str:
        """Execute a function and return formatted result."""
        try:
            if function_name == "get_user_stats":
                result = await self.get_user_stats()
            elif function_name == "list_recent_runs":
                result = await self.list_recent_runs(**arguments)
            elif function_name == "get_actors":
                result = await self.get_actors()
            elif function_name == "create_scraping_run":
                result = await self.create_scraping_run(**arguments)
            elif function_name == "stop_run":
                result = await self.stop_run(**arguments)
            elif function_name == "delete_run":
                result = await self.delete_run(**arguments)
            elif function_name == "abort_multiple_runs":
                result = await self.abort_multiple_runs(**arguments)
            elif function_name == "abort_all_runs":
                result = await self.abort_all_runs(**arguments)
            elif function_name == "get_dataset_info":
                result = await self.get_dataset_info()
            elif function_name == "navigate_to_page":
                result = await self.navigate_to_page(**arguments)
            elif function_name == "export_dataset":
                result = await self.export_dataset(**arguments)
            elif function_name == "get_page_context":
                result = await self.get_page_context(**arguments)
            elif function_name == "fill_and_start_scraper":
                result = await self.fill_and_start_scraper(**arguments)
            elif function_name == "view_run_details":
                result = await self.view_run_details(**arguments)
            elif function_name == "open_actor_detail":
                result = await self.open_actor_detail(**arguments)
            else:
                result = {"error": f"Unknown function: {function_name}"}
            
            return json.dumps(result, default=str)
        except Exception as e:
            logger.error(f"Error executing function {function_name}: {str(e)}")
            return json.dumps({"error": str(e)})
    
    async def get_conversation_history(self, limit: int = 20) -> List[Dict[str, str]]:
        """Get conversation history from database."""
        try:
            messages = await self.db.global_chat_history.find(
                {"user_id": self.user_id},
                {"_id": 0, "role": 1, "content": 1, "created_at": 1}
            ).sort("created_at", -1).limit(limit).to_list(limit)
            
            # Reverse to get chronological order
            messages.reverse()
            
            return [{"role": msg["role"], "content": msg["content"]} for msg in messages]
        except Exception as e:
            logger.error(f"Error getting conversation history: {str(e)}")
            return []
    
    async def save_message(self, role: str, content: str, function_call: Optional[Dict] = None):
        """Save message to conversation history."""
        try:
            message_doc = {
                "id": str(__import__('uuid').uuid4()),
                "user_id": self.user_id,
                "role": role,
                "content": content,
                "function_call": function_call,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await self.db.global_chat_history.insert_one(message_doc)
        except Exception as e:
            logger.error(f"Error saving message: {str(e)}")
    
    async def clear_history(self):
        """Clear conversation history."""
        try:
            await self.db.global_chat_history.delete_many({"user_id": self.user_id})
            return {"success": True}
        except Exception as e:
            logger.error(f"Error clearing history: {str(e)}")
            return {"error": str(e)}
    
    async def chat(self, message: str) -> Dict[str, Any]:
        """
        Process chat message with function calling support and conversation memory.
        
        Args:
            message: User's message
        
        Returns:
            Dict with response and metadata (run_id if run was created)
        """
        try:
            # Save user message
            await self.save_message("user", message)
            
            # Get conversation history (last 30 messages for context)
            history = await self.get_conversation_history(limit=30)
            
            # Build conversation context with COMPLETE history for better context retention
            conversation_context = ""
            if len(history) > 1:  # More than just the current message
                conversation_context = "\n\n**CONVERSATION HISTORY (Remember this context):**\n"
                # Include ALL previous messages for full context
                for msg in history[:-1]:  # Exclude current message
                    role = "USER" if msg['role'] == 'user' else "ASSISTANT"
                    content = msg['content']
                    conversation_context += f"\n{role}: {content}\n"
                conversation_context += "\n**CURRENT USER MESSAGE (respond to this):**\n"
            
            # Enhanced system prompt with function calling instructions and FULL context
            enhanced_prompt = f"""{self.system_prompt}

**🚨 CRITICAL RESPONSE FORMAT:**
When user asks to "run" or "scrape" something, you MUST respond with ONLY:
FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{...}}}}

DO NOT add explanatory text before function calls!
DO NOT say "Starting..." or "I'll help you..." - ONLY output FUNCTION_CALL format!

**Wrong ❌:**
"🤖 Starting Google Maps Scraper for hotels..."

**Correct ✅:**
FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Google Maps", "search_terms": ["hotels"], "location": "Karur, India", "max_results": 2}}}}

**Available Functions:**
{json.dumps(self.functions, indent=2)}

**When you need data or want to execute actions:**
1. Use function calls in this format: FUNCTION_CALL: {{"name": "function_name", "arguments": {{...}}}}
2. I will execute the function and provide results
3. Then respond naturally to the user with the data

**MULTIPLE ACTIONS IN ONE REQUEST:**
CRITICAL: When user mentions MULTIPLE locations or categories, create SEPARATE runs for EACH combination.

**PARSING RULES:**
1. "run X for Y in A and B" = Create 2 runs (X for Y in A + X for Y in B)
2. "run X for Y and Z for W" = Create 2 runs (X for Y + Z for W)
3. "run X for Y in A and Z for W in B" = Create 2 runs (X for Y in A + Z for W in B)

**REPEATED REQUESTS - ALWAYS EXECUTE:**
If user asks "run 3 for karur saloons" multiple times, create a NEW run EACH TIME.
NEVER say "you already requested this" - just execute it again with FUNCTION_CALL!

**Examples:**
User: "How many runs do I have?"
You: FUNCTION_CALL: {{"name": "get_user_stats", "arguments": {{}}}}

User: "run 3 for karur saloons"
You: FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Google Maps", "search_terms": ["saloons"], "location": "Karur, India", "max_results": 3}}}}

User: "run 3 for karur saloons" (AGAIN - same request)
You: FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Google Maps", "search_terms": ["saloons"], "location": "Karur, India", "max_results": 3}}}}
(Always execute, even if similar request was just made!)

User: "Run google maps scraper for Hotels in NYC with 50 results"
You: FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Google Maps", "search_terms": ["Hotels"], "location": "New York, NY", "max_results": 50}}}}

User: "run 2 for hotels in SF and 5 for saloons in LA"
You: FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Google Maps", "search_terms": ["hotels"], "location": "San Francisco, CA", "max_results": 2}}}}
FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Google Maps", "search_terms": ["saloons"], "location": "Los Angeles, CA", "max_results": 5}}}}

User: "run 2 for hotels in karur and chennai"
You: FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Google Maps", "search_terms": ["hotels"], "location": "Karur, India", "max_results": 2}}}}
FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Google Maps", "search_terms": ["hotels"], "location": "Chennai, India", "max_results": 2}}}}

User: "run 5 for saloons in salem and 2 for chennai"
You: FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Google Maps", "search_terms": ["saloons"], "location": "Salem, India", "max_results": 5}}}}
FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Google Maps", "search_terms": ["saloons"], "location": "Chennai, India", "max_results": 2}}}}

User: "scrape 10 restaurants in NYC and LA"
You: FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Google Maps", "search_terms": ["restaurants"], "location": "New York, NY", "max_results": 10}}}}
FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Google Maps", "search_terms": ["restaurants"], "location": "Los Angeles, CA", "max_results": 10}}}}

User: "get me 3 coffee shops in Boston, 5 pizza places in Chicago, and 2 bakeries in Miami"
You: FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Google Maps", "search_terms": ["coffee shops"], "location": "Boston, MA", "max_results": 3}}}}
FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Google Maps", "search_terms": ["pizza places"], "location": "Chicago, IL", "max_results": 5}}}}
FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Google Maps", "search_terms": ["bakeries"], "location": "Miami, FL", "max_results": 2}}}}

**AMAZON SCRAPER EXAMPLES:**
User: "run 100 for trimmer in amazon scraper"
You: FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Amazon", "search_keywords": ["trimmer"], "max_results": 100}}}}

User: "scrape wireless headphones from amazon"
You: FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Amazon", "search_keywords": ["wireless headphones"], "max_results": 20}}}}

User: "get 50 laptop stands in amazon"
You: FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Amazon", "search_keywords": ["laptop stands"], "max_results": 50}}}}

User: "run amazon scraper for gaming mouse"
You: FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Amazon", "search_keywords": ["gaming mouse"], "max_results": 20}}}}

User: "scrape 200 bluetooth speakers and wireless earbuds from amazon"
You: FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Amazon", "search_keywords": ["bluetooth speakers"], "max_results": 200}}}}
FUNCTION_CALL: {{"name": "fill_and_start_scraper", "arguments": {{"actor_name": "Amazon", "search_keywords": ["wireless earbuds"], "max_results": 200}}}}

**CRITICAL FOR LEADS/DATASET NAVIGATION:**
User: "show leads" or "navigate to first completed dataset" or "view my data"
You: FUNCTION_CALL: {{"name": "list_recent_runs", "arguments": {{"limit": 10, "status_filter": "succeeded"}}}}
[After getting results with run IDs]
FUNCTION_CALL: {{"name": "view_run_details", "arguments": {{"run_id": "<first_run_id_from_results>"}}}}

User: "yes" or "1" or "show 1" (after you listed runs)
You: FUNCTION_CALL: {{"name": "view_run_details", "arguments": {{"run_id": "<run_id_from_previous_context>"}}}}
(Don't just describe - NAVIGATE!)

**CRITICAL FOR STOPPING/ABORTING RUNS:**

1. **Abort All Runs** (FASTEST - One function call):
User: "abort all runs" or "stop all" or "cancel all running"
You: FUNCTION_CALL: {{"name": "abort_all_runs", "arguments": {{"status_filter": "all"}}}}
(Use this for "abort all" - most efficient!)

2. **Abort All Running** (specific status):
User: "abort all running runs" or "stop running only"
You: FUNCTION_CALL: {{"name": "abort_all_runs", "arguments": {{"status_filter": "running"}}}}

3. **Abort All Queued** (specific status):
User: "abort all queued" or "cancel queued runs"
You: FUNCTION_CALL: {{"name": "abort_all_runs", "arguments": {{"status_filter": "queued"}}}}

4. **Abort Multiple Specific Runs** (user provides IDs):
User: "abort runs abc123, def456, ghi789"
You: FUNCTION_CALL: {{"name": "abort_multiple_runs", "arguments": {{"run_ids": ["abc123", "def456", "ghi789"]}}}}

5. **Abort Single Run**:
User: "abort run abc123" or "stop this run"
You: FUNCTION_CALL: {{"name": "stop_run", "arguments": {{"run_id": "abc123"}}}}

**IMPORTANT:**
- Use abort_all_runs() for "abort all", "stop all", "cancel everything"
- Use abort_multiple_runs() when user provides multiple specific run IDs
- Use stop_run() for single run only
- NEVER list runs first and then abort one by one - use abort_all_runs() or abort_multiple_runs()


**CRITICAL - REMEMBER CONVERSATION:**
- ALWAYS refer to previous messages when user asks follow-up questions
- When user says "run 5 more", check history for what they ran before
- When user says "which one is best?", refer to previous context
- Maintain context across ALL messages in conversation

**CRITICAL - MULTI-LOCATION PARSING:**
When user mentions multiple locations with "and", create SEPARATE runs for EACH location:
- "X in A and B" = 2 runs (one for A, one for B)
- "X in A, B, and C" = 3 runs (one for each location)
- ALWAYS parse locations separately when connected by "and" or commas

{conversation_context}"""
            
            # Construct full prompt with system message and context
            full_prompt = f"{enhanced_prompt}\n\nUSER: {message}"
            
            # Create chat instance for this request
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"global_chat_{self.user_id}_{datetime.now().timestamp()}",
                system_message=enhanced_prompt
            ).with_model("gemini", "gemini-2.5-flash")
            
            # Get response using Emergent LLM through emergentintegrations
            user_msg = UserMessage(text=message)
            response = await chat.send_message(user_msg)
            
            # LOG: Check what the AI responded
            logger.info(f"AI Response: {response[:500]}...")
            
            # Check for MULTIPLE function calls (support multiple runs in one request)
            function_calls = []
            for match in re.finditer(r'FUNCTION_CALL:\s*({.*?})(?=\s*(?:FUNCTION_CALL|$))', response, re.DOTALL):
                try:
                    function_call_json = json.loads(match.group(1))
                    function_calls.append(function_call_json)
                    logger.info(f"✓ Found function call: {function_call_json.get('name')} with args: {function_call_json.get('arguments')}")
                except Exception as e:
                    logger.error(f"❌ Failed to parse function call: {str(e)}")
                    pass
            
            logger.info(f"📊 Total function calls found: {len(function_calls)}")
            
            # Track all created runs and actions
            created_run_ids = []
            created_actor_ids = []
            created_input_datas = []
            action_metadata = None
            
            if function_calls:
                all_function_results = []
                
                for function_call_json in function_calls:
                    try:
                        function_name = function_call_json.get("name")
                        arguments = function_call_json.get("arguments", {})
                        
                        # Execute function
                        function_result = await self.execute_function(function_name, arguments)
                        function_result_dict = json.loads(function_result)
                        all_function_results.append(function_result_dict)
                        
                        # Track run creation
                        if function_name == "create_scraping_run" and function_result_dict.get("success"):
                            created_run_id = function_result_dict.get("run_id")
                            if created_run_id:
                                created_run_ids.append(created_run_id)
                                run = await self.db.runs.find_one({"id": created_run_id}, {"_id": 0})
                                if run:
                                    created_actor_ids.append(run.get("actor_id"))
                                    created_input_datas.append(run.get("input_data"))
                        
                        # Track UI actions
                        if function_name in ["navigate_to_page", "export_dataset", "fill_and_start_scraper", 
                                            "view_run_details", "open_actor_detail"] and function_result_dict.get("success"):
                            if not action_metadata:  # Use first action metadata
                                action_metadata = function_result_dict
                        
                        # Special handling for fill_and_start_scraper
                        if function_name == "fill_and_start_scraper" and function_result_dict.get("success"):
                            created_run_id = function_result_dict.get("run_id")
                            if created_run_id:
                                created_run_ids.append(created_run_id)
                                created_actor_ids.append(function_result_dict.get("actor_id"))
                                created_input_datas.append(function_result_dict.get("form_data"))
                            
                    except Exception as e:
                        logger.error(f"Error processing function call: {str(e)}")
                        all_function_results.append({"error": str(e)})
                
                # Get final response with all function results
                results_summary = json.dumps(all_function_results, indent=2)
                follow_up_prompt = f"{enhanced_prompt}\n\nFunction results: {results_summary}\n\nPlease respond naturally to the user's original question with this data. Remember the conversation context. DO NOT include FUNCTION_CALL in your response. If multiple runs were created, mention all of them.\n\nUSER: Original message: {message}\n\nPlease provide a natural response about what was executed."
                
                # Generate follow-up response
                follow_up_msg = UserMessage(text=follow_up_prompt)
                final_response = await self.chat.send_message(follow_up_msg)
                
                # Save assistant response with all function calls
                await self.save_message("assistant", final_response, {"multiple_calls": function_calls})
                
                return {
                    "response": final_response,
                    "run_id": created_run_ids[0] if created_run_ids else None,  # Return first for compatibility
                    "run_ids": created_run_ids,  # Return all run IDs
                    "actor_id": created_actor_ids[0] if created_actor_ids else None,
                    "input_data": created_input_datas[0] if created_input_datas else None,
                    "action": action_metadata
                }
            
            # Save regular response (no function calls)
            await self.save_message("assistant", response)
            
            return {
                "response": response,
                "run_id": None,
                "run_ids": [],
                "actor_id": None,
                "input_data": None,
                "action": None
            }
            
        except Exception as e:
            logger.error(f"Global chat error: {str(e)}")
            error_msg = "I apologize, but I encountered an error. Please try again."
            await self.save_message("assistant", error_msg)
            return {
                "response": error_msg,
                "run_id": None,
                "run_ids": [],
                "actor_id": None,
                "input_data": None,
                "action": None
            }
