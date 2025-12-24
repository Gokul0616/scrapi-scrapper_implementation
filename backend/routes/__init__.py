# Routes package
from .routes import router, set_db
from .search_routes import router as search_router, set_search_db
from .settings_routes import router as settings_router, set_settings_db

__all__ = ['router', 'set_db', 'search_router', 'set_search_db', 'settings_router', 'set_settings_db']
