
# Routes package
from fastapi import APIRouter
from database import set_globals

# Import sub-routers
from .auth import router as auth_router
from .admin import router as admin_router
from .actors import router as actors_router
from .runs import router as runs_router
from .schedules import router as schedules_router
from .chat import router as chat_router
from .email_validation_routes import router as email_validation_router
from .routes_legacy import router as legacy_router

# Import legacy routers (if they still exist and are needed)
from .search_routes import router as search_router, set_search_db
from .settings_routes import router as settings_router, set_settings_db
from .organization_routes import router as organization_router, set_db as set_org_db
from .notification_routes import router as notification_router, set_notification_db

# Create main router and include sub-routers
# We use tags to group them in Swagger UI if enabled
router = APIRouter()

router.include_router(auth_router, tags=["Authentication"])
router.include_router(admin_router, tags=["Admin"])
router.include_router(actors_router, tags=["Actors"])
router.include_router(runs_router, tags=["Runs"])
router.include_router(schedules_router, tags=["Schedules"])
router.include_router(chat_router, tags=["Chat"])
router.include_router(email_validation_router)


def set_db(db):
    """
    Initialize database and global services.
    This function is called by server.py on startup.
    """
    try:
        # Initialize Proxy Manager
        from services.proxy_manager import get_proxy_manager
        proxy_mgr = get_proxy_manager(db)
        
        # Get Task Manager
        from services.task_manager import task_manager
        
        # Set globals in the singleton module
        set_globals(db, proxy_mgr, task_manager)
        
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error initializing route globals: {str(e)}")
        # Raise to fail fast if critical globals fail
        raise

__all__ = [
    'router', 
    'set_db', 
    'search_router', 
    'set_search_db', 
    'settings_router', 
    'set_settings_db',
    'organization_router',
    'set_org_db',
    'notification_router', 
    'set_notification_db'
]
