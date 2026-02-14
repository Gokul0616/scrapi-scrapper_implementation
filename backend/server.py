from fastapi import FastAPI, APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from models import Actor


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Auto-update Emergent LLM key if running in Emergent environment
try:
    if os.environ.get('EMERGENT_UNIVERSAL_KEY'):
        from utils.update_emergent_key import main as update_key
        update_key()
        # Reload environment variables after update
        load_dotenv(ROOT_DIR / '.env', override=True)
except Exception as e:
    logging.warning(f"Could not auto-update Emergent key: {e}")

# Set Playwright browsers path for containerized environment
os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/pw-browsers'

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app with docs disabled (we'll add custom protected routes)
app = FastAPI(
    title="Scrapi - Web Scraping Platform",
    docs_url=None,  # Disable default docs
    redoc_url=None,  # Disable default redoc
    openapi_url="/api/openapi.json"
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Import and setup routes
from routes import router as api_routes, set_db, search_router, set_search_db, settings_router, set_settings_db
from routes.organization_routes import router as organization_router, set_db as set_org_db
from routes.notification_routes import router as notification_router, set_notification_db
from routes.terminal_routes import router as terminal_router
from routes.admin_users_routes import router as admin_users_router
from routes.routes_legacy import set_db as set_legacy_db
set_db(db)
set_search_db(db)
set_settings_db(db)
set_org_db(db)
set_notification_db(db)
set_legacy_db(db)

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Welcome to Scrapi API", "version": "1.0.0"}

# Include the API routes
api_router.include_router(api_routes)
api_router.include_router(search_router)
api_router.include_router(settings_router)
api_router.include_router(organization_router)
api_router.include_router(notification_router)
api_router.include_router(terminal_router)
api_router.include_router(admin_users_router)

# Include the router in the main app
app.include_router(api_router)

# Protected documentation endpoints - require admin authentication
from auth import get_current_user, decode_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

security_scheme = HTTPBearer(auto_error=False)

async def get_docs_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    token: Optional[str] = None
) -> dict:
    """Get user from Bearer token or query parameter for docs access"""
    from fastapi import HTTPException, status
    
    # Try to get token from Bearer auth first, then from query param
    auth_token = None
    if credentials:
        auth_token = credentials.credentials
    elif token:
        auth_token = token
    
    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    try:
        payload = decode_token(auth_token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
        return {
            "id": user_id,
            "username": payload.get("username"),
            "role": payload.get("role", "admin")
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

@app.get("/api/docs", include_in_schema=False)
async def custom_swagger_ui_html(current_user: dict = Depends(get_docs_user)):
    """Protected Swagger UI documentation - requires authentication"""
    # Check if user is admin or owner
    if current_user.get("role") not in ["admin", "owner"]:
        return JSONResponse(
            status_code=403,
            content={"detail": "Access denied. Admin or Owner privileges required."}
        )
    return get_swagger_ui_html(
        openapi_url="/api/openapi.json",
        title=f"{app.title} - Swagger UI",
        oauth2_redirect_url=None,
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css",
    )

@app.get("/api/redoc", include_in_schema=False)
async def redoc_html(current_user: dict = Depends(get_docs_user)):
    """Protected ReDoc documentation - requires authentication"""
    # Check if user is admin or owner
    if current_user.get("role") not in ["admin", "owner"]:
        return JSONResponse(
            status_code=403,
            content={"detail": "Access denied. Admin or Owner privileges required."}
        )
    return get_redoc_html(
        openapi_url="/api/openapi.json",
        title=f"{app.title} - ReDoc",
        redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@2.0.0/bundles/redoc.standalone.js",
    )

# Add a root health endpoint for Kubernetes ingress
@app.get("/")
async def health_check():
    return {"status": "healthy", "service": "scrapi-backend"}

@app.get("/health")
async def health():
    return {"status": "ok"}

# Add workspace middleware
from middleware import WorkspaceMiddleware
app.add_middleware(WorkspaceMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Initialize default actors and services on startup."""
    logger.info("🚀 Starting initialization...")
    
    # Initialize email validator (load disposable email blocklist)
    logger.info("📧 Initializing email validator...")
    try:
        from services.email_validator import get_email_validator
        validator = await get_email_validator()
        logger.info("✅ Email validator initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize email validator: {str(e)}")
    
    # Seed initial policy categories
    logger.info("📁 Initializing policy categories...")
    try:
        from services.category_seeder import seed_initial_categories
        await seed_initial_categories(db)
        logger.info("✅ Policy categories initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize policy categories: {str(e)}")
    
    # Seed initial policy documents
    logger.info("📜 Initializing policy documents...")
    try:
        from services.policy_seeder import seed_initial_policies
        await seed_initial_policies(db)
        logger.info("✅ Policy documents initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize policy documents: {str(e)}")
    
    # Seed initial general documentation (NEW)
    logger.info("📚 Initializing general documentation...")
    try:
        from services.docs_seeder import seed_initial_docs
        await seed_initial_docs(db)
        logger.info("✅ General documentation initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize general documentation: {str(e)}")
    
    logger.info("🚀 Starting actor initialization...")
    
    try:
        # Check if Google Maps Scraper V2 exists
        existing_v2 = await db.actors.find_one({"name": "Google Maps Scraper V2"})
        logger.info(f"Google Maps V2 actor exists: {existing_v2 is not None}")
        
        if not existing_v2:
            # Create default Google Maps scraper V2
            from datetime import datetime, timezone
            actor = Actor(
                user_id="system",
                name="Google Maps Scraper V2",
                description="Extract businesses, places, reviews from Google Maps with powerful scraping engine",
                icon="🗺️",
                category="Maps & Location",
                type="prebuilt",
                is_public=True,
                status="published",
                visibility="public",
                tags=["maps", "google", "business", "leads", "local"],
                author_name="Scrapi",
                author_id="system",
                is_verified=True,
                is_featured=True,
                readme="""# Google Maps Scraper V2

The most comprehensive Google Maps scraper for business data extraction.

## Features
- 🎯 **Accurate Data**: Extract business names, addresses, phone numbers, emails
- ⭐ **Ratings & Reviews**: Get ratings, review counts, and full review text
- 🔗 **Social Media**: Extract all social media links (Facebook, Instagram, Twitter, LinkedIn, YouTube, TikTok)
- 📍 **Location Data**: Precise city/state parsing and Google Maps URLs
- 🚀 **Fast & Reliable**: V3 engine with parallel extraction

## Use Cases
- Lead generation for B2B sales
- Local business directories
- Market research and competitor analysis
- Contact list building

## Output Fields
All results include: business name, address, phone (verified), email, rating, reviews count, category, opening hours, website, social media links, place ID, and more.""",
                input_schema={
                    "search_terms": {"type": "array", "description": "List of search terms"},
                    "location": {"type": "string", "description": "Location to search in"},
                    "max_results": {"type": "integer", "default": 100},
                    "extract_reviews": {"type": "boolean", "default": False},
                    "extract_images": {"type": "boolean", "default": False}
                }
            )
            doc = actor.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            await db.actors.insert_one(doc)
            logger.info("✅ Created default Google Maps Scraper V2 actor")
    except Exception as e:
        logger.error(f"❌ Error creating Google Maps actor: {e}", exc_info=True)
    
    try:
        # Check if Amazon Product Scraper exists
        existing_amazon = await db.actors.find_one({"name": "Amazon Product Scraper"})
        logger.info(f"Amazon actor exists: {existing_amazon is not None}")
        
        if not existing_amazon:
            from datetime import datetime, timezone
            actor = Actor(
                user_id="system",
                name="Amazon Product Scraper",
                description="Extract products, prices, reviews, ratings, and seller info from Amazon search results and product pages",
                icon="📦",
                category="E-commerce",
                type="prebuilt",
                is_public=True,
                status="published",
                visibility="public",
                tags=["amazon", "ecommerce", "products", "prices", "reviews", "shopping"],
                author_name="Scrapi",
                author_id="system",
                is_verified=True,
                is_featured=True,
                readme="""# Amazon Product Scraper

Complete Amazon product data extraction for e-commerce intelligence.

## Features
- 🛒 **Product Data**: Title, ASIN, pricing, discounts, availability
- ⭐ **Reviews & Ratings**: Average rating, review count, review text
- 📸 **Images**: High-resolution product images
- 🏪 **Seller Info**: Seller name, Prime eligibility, shipping details
- 📊 **Rankings**: Best Sellers Rank and category info
- 🔍 **Specifications**: Product features, technical specs

## Use Cases
- Price monitoring and comparison
- Product research for dropshipping
- Competitor analysis
- Review sentiment analysis
- Market trend identification

## Output Fields
Includes: ASIN, title, price, original price, discount %, rating, review count, availability, Prime status, images, description, features, specifications, seller info, BSR, and reviews (optional).""",
                input_schema={
                    "type": "object",
                    "required": ["search_keywords"],
                    "properties": {
                        "search_keywords": {
                            "type": "array",
                            "title": "Search Keywords",
                            "description": "Enter product keywords to search (e.g., 'wireless headphones', 'laptop stand')",
                            "editor": "stringList",
                            "example": ["wireless headphones", "bluetooth speaker"]
                        },
                        "max_results": {
                            "type": "integer",
                            "title": "Maximum Results",
                            "description": "Maximum number of products to scrape per keyword",
                            "editor": "number",
                            "default": 50,
                            "minimum": 1,
                            "maximum": 200
                        },
                        "extract_reviews": {
                            "type": "boolean",
                            "title": "Extract Reviews",
                            "description": "Extract review text from product pages (slower but more detailed)",
                            "editor": "checkbox",
                            "default": False
                        },
                        "min_rating": {
                            "type": "number",
                            "title": "Minimum Rating",
                            "description": "Filter products by minimum rating (0-5 stars)",
                            "editor": "number",
                            "default": 0,
                            "minimum": 0,
                            "maximum": 5
                        },
                        "max_price": {
                            "type": "number",
                            "title": "Maximum Price (USD)",
                            "description": "Filter products by maximum price in USD (optional)",
                            "editor": "number",
                            "minimum": 0
                        }
                    }
                }
            )
            doc = actor.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            await db.actors.insert_one(doc)
            logger.info("✅ Created Amazon Product Scraper actor")
    except Exception as e:
        logger.error(f"❌ Error creating Amazon actor: {e}", exc_info=True)
    
    try:
        # Check if SEO Metadata Scraper exists
        existing_seo = await db.actors.find_one({"name": "SEO Metadata Scraper"})
        logger.info(f"SEO Metadata Scraper actor exists: {existing_seo is not None}")
        
        if not existing_seo:
            from datetime import datetime, timezone
            actor = Actor(
                user_id="system",
                name="SEO Metadata Scraper",
                description="Extract comprehensive SEO metadata including meta tags, Open Graph, Twitter Cards, JSON-LD structured data, headings, and technical SEO elements from any website",
                icon="🔍",
                category="SEO & Analytics",
                type="prebuilt",
                is_public=True,
                status="published",
                visibility="public",
                tags=["seo", "metadata", "open-graph", "twitter-cards", "json-ld", "structured-data", "analytics"],
                author_name="Scrapi",
                author_id="system",
                is_verified=True,
                is_featured=True,
                readme="""# SEO Metadata Scraper

Extract comprehensive SEO metadata from websites for audits, analysis, and optimization.

## Features
- 📄 **Basic SEO Tags**: Title, meta description, keywords, canonical URL, robots directives
- 🌐 **Open Graph Tags**: Complete OG metadata for social sharing (title, description, image, type, etc.)
- 🐦 **Twitter Cards**: Full Twitter Card metadata (card type, title, description, image, creator)
- 📊 **JSON-LD Structured Data**: All schema.org structured data (Article, Product, FAQ, Organization, etc.)
- 🎯 **Headings**: Extract all H1-H6 tags for content structure analysis
- 🖼️ **Icons**: Favicon, Apple touch icons, and all icon formats
- 🌍 **Hreflang Tags**: Multi-language and regional targeting tags
- 🔗 **Technical SEO**: Charset, viewport, language, robots.txt, sitemap.xml URLs
- 📸 **Image Metadata**: Image count, alt text statistics, sample images
- 🔗 **Link Analysis**: Internal/external link counts and samples (optional)

## Use Cases
- SEO audits and website analysis
- Competitor SEO research
- Meta tag optimization verification
- Social media preview testing
- Structured data validation
- Technical SEO health checks
- Content strategy analysis

## Output Fields
Extracts: URL, status code, title, meta description, meta keywords, canonical URL, robots directives, viewport, charset, language, Open Graph metadata, Twitter Card metadata, JSON-LD structured data, all heading tags (H1-H6), icons (favicon, apple-touch-icon), hreflang tags, robots.txt URL, sitemap.xml URL, image statistics, link analysis, and additional meta tags (author, publisher, theme-color, generator).""",
                input_schema={
                    "type": "object",
                    "required": ["url"],
                    "properties": {
                        "url": {
                            "type": "string",
                            "title": "Target URL",
                            "description": "Enter the website URL to analyze (must include http:// or https://)",
                            "editor": "textfield",
                            "example": "https://example.com"
                        },
                        "extract_headings": {
                            "type": "boolean",
                            "title": "Extract Headings (H1-H6)",
                            "description": "Extract all heading tags for content structure analysis",
                            "editor": "checkbox",
                            "default": True
                        },
                        "extract_images": {
                            "type": "boolean",
                            "title": "Extract Image Metadata",
                            "description": "Extract image statistics and alt text analysis",
                            "editor": "checkbox",
                            "default": True
                        },
                        "extract_links": {
                            "type": "boolean",
                            "title": "Extract Links",
                            "description": "Analyze internal and external links (adds processing time)",
                            "editor": "checkbox",
                            "default": False
                        }
                    }
                }
            )
            doc = actor.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            await db.actors.insert_one(doc)
            logger.info("✅ Created SEO Metadata Scraper actor")
    except Exception as e:
        logger.error(f"❌ Error creating SEO Metadata Scraper actor: {e}", exc_info=True)
    
    logger.info("🎉 Actor initialization complete")
    
    # Initialize scheduler service
    try:
        logger.info("🔧 Initializing scheduler service...")
        from services.scheduler_service import init_scheduler
        await init_scheduler(db)
        logger.info("✅ Scheduler service initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize scheduler: {str(e)}", exc_info=True)
    
    # Initialize deletion scheduler
    try:
        logger.info("🔧 Initializing deletion scheduler...")
        from services.deletion_scheduler import init_deletion_scheduler
        await init_deletion_scheduler(db)
        logger.info("✅ Deletion scheduler initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize deletion scheduler: {str(e)}", exc_info=True)

@app.on_event("shutdown")
async def shutdown_db_client():
    """Cleanup on shutdown."""
    try:
        # Stop scheduler
        from services.scheduler_service import get_scheduler
        scheduler = get_scheduler()
        await scheduler.stop()
        logger.info("✅ Scheduler stopped")
    except Exception as e:
        logger.warning(f"Failed to stop scheduler: {str(e)}")
    
    try:
        # Stop deletion scheduler
        from services.deletion_scheduler import get_deletion_scheduler
        deletion_scheduler = get_deletion_scheduler()
        if deletion_scheduler:
            await deletion_scheduler.stop()
            logger.info("✅ Deletion scheduler stopped")
    except Exception as e:
        logger.warning(f"Failed to stop deletion scheduler: {str(e)}")
    
    # Close MongoDB client
    client.close()
    logger.info("✅ MongoDB connection closed")