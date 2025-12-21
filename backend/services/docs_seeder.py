"""Service to seed initial general documentation data."""
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

async def seed_initial_docs(db) -> None:
    """Seed initial general documentation documents if they don't exist."""
    logger.info("🔍 Checking for existing docs...")
    
    existing_count = await db.docs.count_documents({})
    if existing_count > 0:
        logger.info(f"✅ General docs already seeded ({existing_count} documents found)")
        return
    
    logger.info("📝 Seeding initial general documentation...")
    
    docs = [
        # Academy Section
        {
            "id": "web-scraping-beginners",
            "title": "Web scraping for beginners",
            "content": "Learn the basics of web scraping and how to develop your own scraper. Understand HTML, CSS selectors, and HTTP requests.",
            "category": "Academy",
            "url_path": "/academy/web-scraping-for-beginners",
            "icon": "graduation-cap",
            "tags": ["scraping", "beginners", "tutorial", "basics"]
        },
        {
            "id": "platform-intro",
            "title": "Introduction to the Scrapi platform",
            "content": "Learn the basics of the Scrapi platform and how to use it for your scraping projects. Actors, Storage, and Proxy.",
            "category": "Academy",
            "url_path": "/academy/platform-introduction",
            "icon": "layout",
            "tags": ["platform", "intro", "guide"]
        },
        {
            "id": "api-scraping",
            "title": "API scraping",
            "content": "Learn how to efficiently extract data from web pages' APIs. Reverse engineer private APIs and use them directly.",
            "category": "Academy",
            "url_path": "/academy/api-scraping",
            "icon": "code",
            "tags": ["api", "advanced", "json"]
        },
        {
            "id": "anti-scraping",
            "title": "Anti-scraping protections",
            "content": "Understand the various anti-scraping measures and how to avoid them. Fingerprinting, captchas, and IP blocking.",
            "category": "Academy",
            "url_path": "/academy/anti-scraping",
            "icon": "shield-alert",
            "tags": ["blocking", "firewall", "protection"]
        },
        {
            "id": "advanced-scraping",
            "title": "Advanced web scraping",
            "content": "Learn how to extract data from more complicated websites using browser automation (Playwright/Puppeteer) and handling dynamic content.",
            "category": "Academy",
            "url_path": "/academy/advanced-scraping",
            "icon": "bot",
            "tags": ["playwright", "puppeteer", "dynamic", "spa"]
        },
        {
            "id": "deploying-code",
            "title": "Deploying your code to Scrapi",
            "content": "Learn how to easily move your existing projects to the Scrapi platform. Dockerize your scrapers and run them in the cloud.",
            "category": "Academy",
            "url_path": "/academy/deploying",
            "icon": "cloud-upload",
            "tags": ["deploy", "cloud", "docker"]
        },

        # Platform Section
        {
            "id": "actors",
            "title": "Actors",
            "content": "Develop, run, and share web scraping and automation tools in the cloud. Serverless computing for scrapers.",
            "category": "Platform",
            "url_path": "/platform/actors",
            "icon": "box"
        },
        {
            "id": "storage",
            "title": "Storage",
            "content": "Store files and results of your web scraping jobs, and export it to various formats (JSON, CSV, Excel, XML).",
            "category": "Platform",
            "url_path": "/platform/storage",
            "icon": "database"
        },
        {
            "id": "proxy",
            "title": "Proxy",
            "content": "Avoid blocking by smartly rotating datacenter and residential IP addresses. Intelligent session management.",
            "category": "Platform",
            "url_path": "/platform/proxy",
            "icon": "globe"
        },
        {
            "id": "schedules",
            "title": "Schedules",
            "content": "Automatically start Actors and saved tasks at specific times. Cron-style scheduling for your workflows.",
            "category": "Platform",
            "url_path": "/platform/schedules",
            "icon": "clock"
        },
        {
            "id": "integrations",
            "title": "Integrations",
            "content": "Connect Actors with your favorite web apps and cloud services. Zapier, Slack, Google Drive, and more.",
            "category": "Platform",
            "url_path": "/platform/integrations",
            "icon": "plug"
        },
        {
            "id": "monitoring",
            "title": "Monitoring",
            "content": "Check the performance of your Actors, validate data quality, and receive alerts via email or Slack.",
            "category": "Platform",
            "url_path": "/platform/monitoring",
            "icon": "bar-chart"
        },
        {
            "id": "collaboration",
            "title": "Collaboration",
            "content": "Share Actors with other people, manage your organizations and permissions. Team management features.",
            "category": "Platform",
            "url_path": "/platform/collaboration",
            "icon": "users"
        },
        {
            "id": "security",
            "title": "Security",
            "content": "Learn about Scrapi platform security and data protection. SOC2 compliance and encryption standards.",
            "category": "Platform",
            "url_path": "/platform/security",
            "icon": "lock"
        },
        {
            "id": "mcp",
            "title": "MCP",
            "content": "Discover and use Actors with AI agents and LLMs via Scrapi MCP server. Context for your AI assistants.",
            "category": "Platform",
            "url_path": "/platform/mcp",
            "icon": "cpu"
        },

        # SDK & Tools
        {
            "id": "sdk-js",
            "title": "SDK for JavaScript",
            "content": "Official JavaScript client for the Scrapi API. Node.js bindings.",
            "category": "SDK",
            "url_path": "/sdk/js",
            "tags": ["javascript", "node", "npm"]
        },
        {
            "id": "sdk-python",
            "title": "SDK for Python",
            "content": "Official Python client for the Scrapi API. PyPI package.",
            "category": "SDK",
            "url_path": "/sdk/python",
            "tags": ["python", "pip"]
        },
        {
            "id": "crawlee",
            "title": "Crawlee",
            "content": "A popular web scraping and browser automation library. Open source, built by Apify.",
            "category": "Open Source",
            "url_path": "https://crawlee.dev",
            "tags": ["crawler", "open-source", "library"]
        },
        {
            "id": "cli",
            "title": "CLI Reference",
            "content": "Control the Scrapi platform from terminal or shell scripts. Scrapi CLI documentation.",
            "category": "CLI",
            "url_path": "/cli",
            "tags": ["command-line", "terminal"]
        }
    ]
    
    # Add timestamps
    for doc in docs:
        doc["created_at"] = datetime.now(timezone.utc)
        doc["updated_at"] = datetime.now(timezone.utc)
    
    # Insert all docs
    try:
        result = await db.docs.insert_many(docs)
        logger.info(f"✅ Successfully seeded {len(result.inserted_ids)} general documentation pages")
    except Exception as e:
        logger.error(f"❌ Failed to seed docs: {str(e)}")
