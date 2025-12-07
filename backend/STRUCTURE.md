# Backend Structure Documentation

## 📁 Organized Backend Architecture

The backend has been reorganized from a flat structure into a well-organized, modular architecture following Python best practices.

### 🎯 New Directory Structure

```
/app/backend/
├── server.py                    # Main FastAPI application entry point
├── .env                         # Environment variables
├── requirements.txt             # Python dependencies
├── Dockerfile                   # Docker configuration
│
├── models/                      # 📊 Database Models
│   ├── __init__.py             # Exports all models
│   ├── user.py                 # User, UserCreate, UserLogin, UserResponse
│   ├── actor.py                # Actor, ActorCreate, ActorUpdate, ActorPublish
│   ├── run.py                  # Run, RunCreate, RunInput
│   ├── dataset.py              # Dataset, DatasetItem
│   ├── proxy.py                # Proxy, ProxyCreate
│   └── chat.py                 # LeadChatMessage, GlobalChatMessage, etc.
│
├── auth/                        # 🔐 Authentication
│   ├── __init__.py             # Exports auth functions
│   └── auth.py                 # JWT auth, password hashing
│
├── routes/                      # 🛣️ API Routes
│   ├── __init__.py             # Exports router
│   └── routes.py               # All API endpoints
│
├── scrapers/                    # 🕷️ Scraping Engine & Scrapers
│   ├── __init__.py             # Exports scraper classes
│   ├── base_scraper.py         # BaseScraper abstract class
│   ├── scraper_engine.py       # Playwright scraping engine
│   ├── scraper_registry.py     # Dynamic scraper registration
│   │
│   ├── googlemap/              # Google Maps Scraper
│   │   ├── __init__.py
│   │   └── google_maps_scraper_v3.py
│   │
│   └── amazon/                 # Amazon Product Scraper
│       ├── __init__.py
│       └── amazon_scraper.py
│
└── services/                    # 🔧 Business Logic Services
    ├── __init__.py             # Exports service classes
    ├── proxy_manager.py        # Proxy rotation & health checks
    ├── task_manager.py         # Async task management
    ├── chat_service.py         # Lead AI chat service
    └── global_chat_service_v2.py # Global AI assistant
```

## 🔧 Import Patterns

### Before (Flat Structure)
```python
from models import User, Actor, Run
from auth import create_access_token
from scraper_engine import ScraperEngine
from google_maps_scraper_v3 import GoogleMapsScraperV3
from proxy_manager import get_proxy_manager
```

### After (Organized Structure)
```python
from models import User, Actor, Run
from auth import create_access_token
from scrapers import ScraperEngine, get_scraper_registry
from scrapers.googlemap import GoogleMapsScraperV3
from services import get_proxy_manager, get_task_manager
```

## 📦 Package Exports

Each directory contains an `__init__.py` file that exports the relevant classes/functions:

### models/__init__.py
Exports all model classes: User, Actor, Run, Dataset, Proxy, Chat models

### auth/__init__.py
Exports: create_access_token, get_current_user, hash_password, verify_password

### scrapers/__init__.py
Exports: BaseScraper, ScraperEngine, ScraperRegistry, get_scraper_registry

### scrapers/googlemap/__init__.py
Exports: GoogleMapsScraperV3

### scrapers/amazon/__init__.py
Exports: AmazonProductScraper

### services/__init__.py
Exports: ProxyManager, TaskManager, LeadChatService, EnhancedGlobalChatService

### routes/__init__.py
Exports: router, set_db

## ✅ Benefits

1. **Clear Separation of Concerns**
   - Models separate from business logic
   - Scrapers grouped by type
   - Services isolated from routes

2. **Easy Navigation**
   - Find Google Maps scraper: `scrapers/googlemap/`
   - Find user models: `models/user.py`
   - Find auth logic: `auth/auth.py`

3. **Scalable Architecture**
   - Add new scrapers: Create `scrapers/linkedin/`
   - Add new models: Create `models/subscription.py`
   - Add new services: Create `services/email_service.py`

4. **Maintainable Codebase**
   - Smaller, focused files
   - Logical grouping
   - Easy to test individual components

5. **Professional Structure**
   - Follows Python package best practices
   - Similar to Django, Flask, FastAPI conventions
   - Industry-standard organization

## 🚀 Adding New Scrapers

To add a new scraper (e.g., LinkedIn):

1. Create directory: `scrapers/linkedin/`
2. Create `__init__.py`: Export the scraper class
3. Create `linkedin_scraper.py`: Implement scraper
4. Register in `scrapers/scraper_registry.py`: Add to auto_register_scrapers()

Example:
```python
# scrapers/linkedin/__init__.py
from .linkedin_scraper import LinkedInScraper
__all__ = ['LinkedInScraper']

# scrapers/scraper_registry.py - add to auto_register_scrapers()
from .linkedin.linkedin_scraper import LinkedInScraper
_global_registry.register(LinkedInScraper)
```

## 🔄 Migration Notes

- Old flat structure files backed up in `_old_structure/`
- All imports updated throughout codebase
- Backward compatibility maintained
- API endpoints unchanged
- Frontend unaffected

## ✅ Verification

All services tested and working:
- ✅ Backend server running on port 8001
- ✅ Models importing correctly
- ✅ Auth system functional
- ✅ Scrapers registered and available
- ✅ Services (proxy, task, chat) operational
- ✅ API endpoints responding
- ✅ Database connections active

## 📚 Related Files

- `server.py` - Main application entry point
- `requirements.txt` - Python dependencies
- `.env` - Environment configuration
- `Dockerfile` - Container setup
