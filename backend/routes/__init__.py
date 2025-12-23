# Routes package
from .routes import router, set_db
from .search_routes import router as search_router, set_search_db

__all__ = ['router', 'set_db', 'search_router', 'set_search_db']
