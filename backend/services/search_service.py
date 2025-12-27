"""
Global Search Service for Scrapi
Implements fuzzy search across multiple collections with ranking
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import re


def calculate_similarity(query: str, text: str) -> float:
    """
    Calculate similarity score between query and text.
    Uses simple fuzzy matching algorithm.
    """
    if not text:
        return 0.0
    
    query = query.lower()
    text = text.lower()
    
    # Exact match
    if query == text:
        return 1.0
    
    # Starts with query
    if text.startswith(query):
        return 0.9
    
    # Contains query
    if query in text:
        return 0.7
    
    # Fuzzy match - check if all characters appear in order
    query_idx = 0
    for char in text:
        if query_idx < len(query) and char == query[query_idx]:
            query_idx += 1
    
    if query_idx == len(query):
        return 0.5
    
    # Word boundary match
    words = text.split()
    for word in words:
        if word.startswith(query):
            return 0.6
    
    return 0.0


def rank_results(results: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
    """Rank search results by relevance."""
    for result in results:
        title = result.get('title', '')
        subtitle = result.get('subtitle', '')
        
        # Calculate scores
        title_score = calculate_similarity(query, title)
        subtitle_score = calculate_similarity(query, subtitle) * 0.5
        
        # Boost by type (actors and runs are more important)
        type_boost = {
            'actor': 1.2,
            'run': 1.1,
            'dataset': 1.0,
            'doc': 0.9,
            'legal': 0.8,
            'action': 1.5  # Quick actions should be prioritized
        }.get(result.get('type'), 1.0)
        
        result['_score'] = (title_score + subtitle_score) * type_boost
    
    # Sort by score descending
    results.sort(key=lambda x: x.get('_score', 0), reverse=True)
    return results


async def search_actors(db, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search in actors collection."""
    query_regex = {"$regex": query, "$options": "i"}
    
    cursor = db.actors.find({
        "$or": [
            {"name": query_regex},
            {"description": query_regex},
            {"category": query_regex},
            {"tags": query_regex}
        ]
    }).limit(limit)
    
    results = []
    async for actor in cursor:
        results.append({
            "type": "actor",
            "title": actor.get("name", "Untitled Actor"),
            "subtitle": actor.get("description", "")[:100],
            "url": f"/actor/{actor.get('id')}",
            "category": actor.get("category", "Actor"),
            "metadata": {
                "actor_id": actor.get("id"),
                "is_verified": actor.get("is_verified", False),
                "is_featured": actor.get("is_featured", False)
            }
        })
    
    return results


async def search_runs(db, query: str, user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search in runs collection."""
    query_regex = {"$regex": query, "$options": "i"}
    
    # Search by run ID or actor name
    cursor = db.runs.find({
        "user_id": user_id,
        "$or": [
            {"id": query_regex},
            {"actor_name": query_regex},
            {"status": query_regex}
        ]
    }).sort("created_at", -1).limit(limit)
    
    results = []
    async for run in cursor:
        status = run.get("status", "unknown")
        
        results.append({
            "type": "run",
            "title": f"{run.get('actor_name', 'Unknown Actor')} - Run",
            "subtitle": f"Status: {status} • {run.get('created_at', 'Unknown date')}",
            "url": f"/runs/{run.get('id')}",
            "category": f"Run ({status})",
            "metadata": {
                "run_id": run.get("id"),
                "status": status,
                "actor_id": run.get("actor_id")
            }
        })
    
    return results


async def search_datasets(db, query: str, user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search in datasets collection."""
    query_regex = {"$regex": query, "$options": "i"}
    
    cursor = db.datasets.find({
        "user_id": user_id,
        "$or": [
            {"run_id": query_regex},
            {"actor_name": query_regex}
        ]
    }).sort("created_at", -1).limit(limit)
    
    results = []
    async for dataset in cursor:
        item_count = len(dataset.get("items", []))
        
        results.append({
            "type": "dataset",
            "title": f"Dataset - {dataset.get('actor_name', 'Unknown')}",
            "subtitle": f"{item_count} items • {dataset.get('created_at', 'Unknown date')}",
            "url": f"/datasets/{dataset.get('run_id')}",
            "category": "Dataset",
            "metadata": {
                "run_id": dataset.get("run_id"),
                "item_count": item_count
            }
        })
    
    return results


async def search_docs(db, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search in documentation collection."""
    query_regex = {"$regex": query, "$options": "i"}
    
    cursor = db.docs.find({
        "$or": [
            {"title": query_regex},
            {"content": query_regex},
            {"tags": query_regex}
        ]
    }).limit(limit)
    
    results = []
    async for doc in cursor:
        results.append({
            "type": "doc",
            "title": doc.get("title", "Untitled"),
            "subtitle": doc.get("content", "")[:100] + "...",
            "url": doc.get("url_path", "/docs"),
            "category": doc.get("category", "Docs")
        })
    
    return results


async def search_policies(db, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search in legal policies collection."""
    query_regex = {"$regex": query, "$options": "i"}
    
    cursor = db.policies.find({
        "$or": [
            {"title": query_regex},
            {"label": query_regex},
            {"intro": query_regex}
        ]
    }).limit(limit)
    
    results = []
    async for policy in cursor:
        title = policy.get("label") or policy.get("title", "Untitled")
        
        results.append({
            "type": "legal",
            "title": title,
            "subtitle": policy.get("intro", "")[:100],
            "url": f"/legal/{policy.get('doc_id', '')}",
            "category": policy.get("category", "Legal")
        })
    
    return results


def get_quick_actions(query: str) -> List[Dict[str, Any]]:
    """Get quick action commands."""
    actions = [
        {
            "type": "action",
            "title": "Create New Run",
            "subtitle": "Start a new scraping run",
            "url": "/actors",
            "category": "Action",
            "command": "create_run"
        },
        {
            "type": "action",
            "title": "View All Actors",
            "subtitle": "Browse available scrapers",
            "url": "/actors",
            "category": "Action",
            "command": "view_actors"
        },
        {
            "type": "action",
            "title": "View All Runs",
            "subtitle": "See your scraping history",
            "url": "/runs",
            "category": "Action",
            "command": "view_runs"
        },
        {
            "type": "action",
            "title": "Open Store",
            "subtitle": "Explore the marketplace",
            "url": "/store",
            "category": "Action",
            "command": "open_store"
        },
        {
            "type": "action",
            "title": "View Schedules",
            "subtitle": "Manage scheduled runs",
            "url": "/schedules",
            "category": "Action",
            "command": "view_schedules"
        }
    ]
    
    # Filter actions by query
    if query:
        filtered = []
        for action in actions:
            if (query.lower() in action['title'].lower() or 
                query.lower() in action['subtitle'].lower()):
                filtered.append(action)
        return filtered
    
    return actions[:3]  # Return top 3 by default


async def save_recent_search(db, user_id: str, query: str, result_type: str, result_id: str):
    """Save a search to recent searches."""
    try:
        await db.recent_searches.insert_one({
            "user_id": user_id,
            "query": query,
            "result_type": result_type,
            "result_id": result_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Keep only last 20 searches per user
        all_searches = await db.recent_searches.find(
            {"user_id": user_id}
        ).sort("timestamp", -1).to_list(100)
        
        if len(all_searches) > 20:
            to_delete = all_searches[20:]
            delete_ids = [s.get("_id") for s in to_delete]
            await db.recent_searches.delete_many({"_id": {"$in": delete_ids}})
    
    except Exception as e:
        print(f"Error saving recent search: {e}")


async def get_recent_searches(db, user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Get recent searches for a user."""
    cursor = db.recent_searches.find(
        {"user_id": user_id}
    ).sort("timestamp", -1).limit(limit)
    
    results = []
    async for search in cursor:
        results.append({
            "type": "recent",
            "title": search.get("query", ""),
            "subtitle": f"Recent search • {search.get('result_type', 'unknown')}",
            "category": "Recent",
            "query": search.get("query"),
            "timestamp": search.get("timestamp")
        })
    
    return results


async def global_search(
    db, 
    query: str, 
    user_id: Optional[str] = None,
    search_scope: Optional[str] = None
) -> Dict[str, Any]:
    """
    Perform global search across all collections.
    
    Args:
        db: Database instance
        query: Search query
        user_id: User ID for personalized results
        search_scope: Optional scope filter (@actors, #runs, /docs)
    """
    if not query or len(query.strip()) < 1:
        # Return empty state with quick actions
        return {
            "results": [],
            "recent": await get_recent_searches(db, user_id) if user_id else [],
            "quick_actions": get_quick_actions(""),
            "total": 0
        }
    
    query = query.strip()
    
    # Check for command prefix
    if query.startswith(">"):
        # Quick actions mode
        action_query = query[1:].strip()
        actions = get_quick_actions(action_query)
        return {
            "results": actions,
            "recent": [],
            "quick_actions": [],
            "total": len(actions),
            "mode": "actions"
        }
    
    # Check for scope prefix
    if search_scope or query.startswith("@") or query.startswith("#") or query.startswith("/"):
        if query.startswith("@"):
            search_scope = "actors"
            query = query[1:].strip()
        elif query.startswith("#"):
            search_scope = "runs"
            query = query[1:].strip()
        elif query.startswith("/"):
            search_scope = "docs"
            query = query[1:].strip()
    
    # Perform searches based on scope
    all_results = []
    
    if not search_scope or search_scope == "actors":
        all_results.extend(await search_actors(db, query))
    
    if user_id and (not search_scope or search_scope == "runs"):
        all_results.extend(await search_runs(db, query, user_id))
    
    if user_id and (not search_scope or search_scope == "datasets"):
        all_results.extend(await search_datasets(db, query, user_id))
    
    if not search_scope or search_scope == "docs":
        all_results.extend(await search_docs(db, query))
    
    if not search_scope or search_scope == "policies":
        all_results.extend(await search_policies(db, query))
    
    # Rank results
    ranked_results = rank_results(all_results, query)
    
    # Get recent searches if available
    recent = []
    if user_id and not query:
        recent = await get_recent_searches(db, user_id)
    
    return {
        "results": ranked_results[:15],  # Limit to top 15
        "recent": recent,
        "quick_actions": get_quick_actions(query) if len(query) < 3 else [],
        "total": len(ranked_results),
        "query": query,
        "scope": search_scope
    }
