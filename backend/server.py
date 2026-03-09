from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from models import Actor


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Set Playwright browsers path for containerized environment
os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/pw-browsers'

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Scrapi - Web Scraping Platform")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Import and setup routes
from routes import router as api_routes, set_db
set_db(db)

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Welcome to Scrapi API", "version": "1.0.0"}

# Include the API routes
api_router.include_router(api_routes)

# Include the router in the main app
app.include_router(api_router)

# Add a root health endpoint for Kubernetes ingress
@app.get("/")
async def health_check():
    return {"status": "healthy", "service": "scrapi-backend"}

@app.get("/health")
async def health():
    return {"status": "ok"}

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
    """Initialize default actors on startup."""
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
    
    # Log Celery status
    try:
        from celery_app import celery_app
        logger.info("✅ Celery app available - tasks will be processed by workers")
    except Exception as e:
        logger.warning(f"⚠️ Celery not available: {e}")

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
    
    # Shutdown task manager
    try:
        from services import get_task_manager
        task_manager = get_task_manager()
        task_manager.shutdown()
        logger.info("✅ Task manager shutdown")
    except Exception as e:
        logger.warning(f"Failed to shutdown task manager: {str(e)}")
    
    # Close MongoDB client
    client.close()
    logger.info("✅ MongoDB connection closed")