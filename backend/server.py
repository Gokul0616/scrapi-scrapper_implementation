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
    # Check if Google Maps Scraper V2 exists
    existing_v2 = await db.actors.find_one({"name": "Google Maps Scraper V2"})
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
        logger.info("Created default Google Maps Scraper V2 actor")
    
    # Check if Amazon Product Scraper exists
    existing_amazon = await db.actors.find_one({"name": "Amazon Product Scraper"})
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
        logger.info("Created Amazon Product Scraper actor")
    
    # Check if Indeed Jobs Scraper V2 exists
    existing_indeed = await db.actors.find_one({"name": "Indeed Jobs Scraper V2"})
    if not existing_indeed:
        from datetime import datetime, timezone
        actor = Actor(
            user_id="system",
            name="Indeed Jobs Scraper V2",
            description="Advanced job scraper with Cloudflare bypass - Extract job listings from Indeed.com",
            icon="💼",
            category="Jobs & Careers",
            type="prebuilt",
            is_public=True,
            status="published",
            visibility="public",
            tags=["indeed", "jobs", "careers", "employment", "hiring", "salary", "cloudflare-bypass"],
            author_name="Scrapi",
            author_id="system",
            is_verified=True,
            is_featured=True,
            readme="""# Indeed Jobs Scraper V2 - With Anti-Bot Bypass

Extract comprehensive job data from Indeed.com with advanced Cloudflare Turnstile bypass.

## Features
- 💼 **Job Listings**: Title, company, location, salary information
- 🛡️ **Anti-Bot Protection**: Advanced Cloudflare Turnstile bypass
- 📝 **Full Descriptions**: Complete job requirements and responsibilities
- 📅 **Posting Dates**: Track when jobs were posted
- ⭐ **Company Ratings**: Company reviews and ratings
- 🎯 **Job Types**: Full-time, Part-time, Contract, Remote
- 💰 **Salary Data**: Hourly/yearly compensation ranges
- 🏢 **Benefits**: Extracted benefit information

## Anti-Detection Features
- Advanced stealth mode with browser fingerprint randomization
- Human-like behavior simulation (mouse movements, scrolling)
- Automatic Cloudflare challenge bypass
- Smart retry mechanisms

## Use Cases
- Job market research and trends
- Salary benchmarking
- Recruitment lead generation
- Competitive intelligence
- Employment data analysis
- Career planning and research

## Output Fields
Includes: job ID, title, company name, location, salary, job URL, posted date, full description, job type, benefits list, company rating.""",
            input_schema={
                "type": "object",
                "required": ["keyword"],
                "properties": {
                    "keyword": {
                        "type": "string",
                        "title": "Job Search Keyword",
                        "description": "Enter job title or keyword (e.g., 'python developer', 'sales manager', 'data analyst')",
                        "editor": "textfield",
                        "example": "software engineer"
                    },
                    "location": {
                        "type": "string",
                        "title": "Location",
                        "description": "City, state or 'Remote' (leave empty for all locations). Examples: 'New York, NY', 'Chennai, Tamil Nadu', 'London, UK'",
                        "editor": "textfield",
                        "default": "",
                        "example": "Chennai, Tamil Nadu"
                    },
                    "max_pages": {
                        "type": "integer",
                        "title": "Maximum Pages",
                        "description": "Number of pages to scrape (each page ~15 jobs, max 50 to avoid detection)",
                        "editor": "number",
                        "default": 3,
                        "minimum": 1,
                        "maximum": 50
                    }
                }
            }
        )
        doc = actor.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.actors.insert_one(doc)
        logger.info("Created Indeed Jobs Scraper V2 actor")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()