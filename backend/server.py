from fastapi import FastAPI, APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

# --- Mock Playwright to run backend without it ---
import sys
from unittest.mock import MagicMock
class DummyType: pass
sys.modules['playwright'] = MagicMock()
playwright_async = MagicMock()
playwright_async.Page = DummyType
playwright_async.Browser = DummyType
playwright_async.BrowserContext = DummyType
playwright_async.TimeoutError = Exception
sys.modules['playwright.async_api'] = playwright_async
sys.modules['playwright_stealth'] = MagicMock()
# -----------------------------------------------

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
    openapi_url=None  # Disable default openapi.json to protect it
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Import and setup routes
from routes import router as api_routes, set_db, search_router, set_search_db, settings_router, set_settings_db
from routes.organization_routes import router as organization_router, set_db as set_org_db
from routes.notification_routes import router as notification_router, set_notification_db
from routes.terminal_routes import router as terminal_router
from routes.admin_users_routes import router as admin_users_router
from routes.billing_routes import router as billing_router
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
api_router.include_router(billing_router)

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

def _swagger_dark_css() -> str:
    return """
        html, body { margin: 0; padding: 0; background: #0b0d11; color: #f1f5f9; }
        .swagger-ui { background: #0b0d11; filter: invert(0); }
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin: 20px 0; background: transparent; }
        .swagger-ui .info .title { color: #f1f5f9; font-family: 'Inter', sans-serif; }
        .swagger-ui .info .description { color: #94a3b8; }
        .swagger-ui .info a { color: #82aaff; text-decoration: none; }
        .swagger-ui .info a:hover { text-decoration: underline; }
        
        /* Operation groups */
        .swagger-ui .opblock-tag { color: #f1f5f9 !important; border-bottom: 1px solid #1e293b; padding: 10px 20px; }
        .swagger-ui .opblock-tag:hover { background: #1e293b; }
        .swagger-ui .opblock-tag small { color: #64748b !important; }
        
        /* Operation blocks */
        .swagger-ui .opblock { background: #161a22; border: 1px solid #334155; border-radius: 8px; margin: 8px 0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .swagger-ui .opblock .opblock-summary { border-bottom: 1px solid rgba(51, 65, 85, 0.5); padding: 10px 20px; }
        
        /* PATH VISIBILITY FIX */
        .swagger-ui .opblock-summary .opblock-summary-path,
        .swagger-ui .opblock-summary .opblock-summary-path span,
        .swagger-ui .opblock-summary-path__deprecated { 
            color: #82aaff !important; 
            font-weight: 600 !important;
            font-family: 'JetBrains Mono', monospace;
            text-shadow: 0 0 1px rgba(0,0,0,0.5);
        }
        .swagger-ui .opblock-description-wrapper p,
        .swagger-ui .opblock-external-docs-wrapper p,
        .swagger-ui .opblock-title_normal p,
        .swagger-ui .opblock-summary-description,
        .swagger-ui .parameter__empty,
        .swagger-ui .parameter__extension,
        .swagger-ui .parameter__in { 
            color: #cbd5e1 !important; 
            font-size: 14px; 
        }
        
        .swagger-ui .opblock-body { background: #0f172a; padding: 20px; }
        
        /* Section Headers (Parameters, Request Body) */
        .swagger-ui .opblock-section-header {
            background: #1e293b !important;
            box-shadow: none !important;
            border-bottom: 1px solid #334155 !important;
            padding: 8px 20px !important;
            min-height: 40px !important;
            display: flex !important;
            align-items: center !important;
        }
        .swagger-ui .opblock-section-header h4 {
            color: #f1f5f9 !important;
            margin: 0 !important;
        }
        .swagger-ui .opblock-section-header label {
            color: #cbd5e1 !important;
            margin: 0 !important;
        }
        
        /* Media Type Selectors and labels */
        .swagger-ui .opblock-control-container select,
        .swagger-ui .opblock-section-header select {
            background: #0f172a !important;
            color: #f1f5f9 !important;
            border: 1px solid #334155 !important;
            border-radius: 4px;
            padding: 4px 8px !important;
        }
        
        /* Method badges */
        .swagger-ui .opblock .opblock-summary-method { border-radius: 4px; font-weight: bold; min-width: 80px; }
        
        /* Models / Schema section */
        .swagger-ui section.models { background: #161a22; border: 1px solid #334155; border-radius: 8px; margin-top: 30px; }
        .swagger-ui section.models h4 { color: #f1f5f9 !important; padding: 15px 20px; border-bottom: 1px solid #334155; margin: 0; }
        .swagger-ui section.models h4 svg { fill: #f1f5f9 !important; }
        .swagger-ui .model-box { background: #0f172a; border-radius: 4px; padding: 10px; margin: 10px 0; }
        .swagger-ui .model { color: #f1f5f9; }
        .swagger-ui .model-title { color: #f1f5f9 !important; opacity: 0.9; }
        .swagger-ui .prop-type { color: #c084fc; }
        .swagger-ui .prop-format { color: #64748b; font-size: 12px; }
        .swagger-ui .property { color: #f1f5f9; }
        .swagger-ui .model .property.primitive { color: #82aaff; }
        
        /* Tables */
        .swagger-ui table thead tr td, .swagger-ui table thead tr th { color: #f1f5f9; border-bottom: 2px solid #334155; padding: 12px; }
        .swagger-ui table tbody tr td { border-bottom: 1px solid #1e293b; color: #cbd5e1; padding: 12px; }
        
        /* Parameters */
        .swagger-ui .parameter__name { color: #f1f5f9 !important; font-weight: 600 !important; }
        .swagger-ui .parameter__type { color: #94a3b8; font-style: italic; }
        .swagger-ui .parameter__in { color: #fbbf24; font-weight: bold; opacity: 0.8; }
        .swagger-ui .parameter__extension, .swagger-ui .parameter__in { font-family: monospace; }
        
        /* Responses */
        .swagger-ui .response-col_status { color: #f1f5f9; font-weight: bold; }
        .swagger-ui .response-col_description .markdown p { color: #cbd5e1; }
        
        /* Tabs and code blocks */
        .swagger-ui .tab { border-bottom: 1px solid #334155; }
        .swagger-ui .tab li { color: #94a3b8; padding: 8px 16px; transition: all 0.2s; }
        .swagger-ui .tab li:hover { color: #f1f5f9; }
        .swagger-ui .tab li.active { color: #82aaff; border-bottom: 2px solid #82aaff; }
        .swagger-ui .microlight { background: #020617 !important; color: #f1f5f9 !important; border-radius: 4px; padding: 15px !important; }
        .swagger-ui .highlight-code { background: #020617; border-radius: 4px; }
        
        /* Inputs and Buttons */
        .swagger-ui textarea, .swagger-ui input[type=text], .swagger-ui select {
            background: #1e293b !important;
            color: #f1f5f9 !important;
            border: 1px solid #334155 !important;
            border-radius: 4px !important;
            padding: 8px 12px !important;
        }
        .swagger-ui .btn { 
            background: #1e293b; 
            color: #f1f5f9; 
            border: 1px solid #334155; 
            border-radius: 4px;
            padding: 6px 20px;
            transition: all 0.2s;
        }
        .swagger-ui .btn:hover { background: #334155; border-color: #475569; }
        .swagger-ui .btn.authorize { border-color: #10b981; color: #10b981; }
        .swagger-ui .btn.authorize svg { fill: #10b981; }
        .swagger-ui .btn.execute { background: #3b82f6; border-color: #2563eb; color: #ffffff; font-weight: bold; }
        .swagger-ui .btn.execute:hover { background: #2563eb; }
        
        /* Dialogs / Modals */
        .swagger-ui .dialog-ux .modal-ux { background: #161a22; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
        .swagger-ui .dialog-ux .modal-ux-header { background: #0f172a; border-bottom: 1px solid #334155; padding: 15px 20px; }
        .swagger-ui .dialog-ux .modal-ux-header h3 { color: #f1f5f9; }
        .swagger-ui .dialog-ux .modal-ux-content { padding: 20px; }
        .swagger-ui .dialog-ux .modal-ux-inside label { color: #94a3b8; margin-bottom: 8px; display: block; }
        
        /* Specific method colors on dark */
        .swagger-ui .opblock.opblock-get { border-color: #1d4ed8; }
        .swagger-ui .opblock.opblock-get .opblock-summary { background: rgba(29, 78, 216, 0.1); }
        .swagger-ui .opblock.opblock-post { border-color: #047857; }
        .swagger-ui .opblock.opblock-post .opblock-summary { background: rgba(4, 120, 87, 0.1); }
        .swagger-ui .opblock.opblock-put { border-color: #b45309; }
        .swagger-ui .opblock.opblock-put .opblock-summary { background: rgba(180, 83, 9, 0.1); }
        .swagger-ui .opblock.opblock-delete { border-color: #b91c1c; }
        .swagger-ui .opblock.opblock-delete .opblock-summary { background: rgba(185, 28, 28, 0.1); }
        
        /* Various fixes */
        .swagger-ui .renderedMarkdown code { background: #1e293b; color: #fbbf24; padding: 2px 4px; border-radius: 4px; }
        .swagger-ui .scheme-container { background: #0f172a; border-top: 1px solid #334155; border-bottom: 1px solid #334155; padding: 20px 0; margin-bottom: 20px; }
        .swagger-ui .servers-title { color: #94a3b8; }
        .swagger-ui .arrow { fill: #94a3b8; }
        .swagger-ui .model-toggle:after { filter: invert(1); }
    """

def _swagger_light_css() -> str:
    return """
        html, body { margin: 0; padding: 0; background: #ffffff; color: #1a1a2e; }
        .swagger-ui { background: #ffffff; }
        .swagger-ui .topbar { display: none; }
    """

def _redoc_dark_theme() -> str:
    return '''{
        "colors": {
            "primary": {"main": "#82aaff"},
            "text": {"primary": "#f1f5f9", "secondary": "#94a3b8"},
            "border": {"light": "#334155", "dark": "#1e293b"},
            "responses": {
                "success": {"color": "#10b981", "backgroundColor": "rgba(16, 185, 129, 0.1)"},
                "error": {"color": "#ef4444", "backgroundColor": "rgba(239, 68, 68, 0.1)"}
            },
            "http": {
                "get": "#3b82f6",
                "post": "#10b981",
                "put": "#f59e0b",
                "delete": "#ef4444"
            }
        },
        "sidebar": {
            "backgroundColor": "#0b0d11",
            "textColor": "#cbd5e1",
            "activeTextColor": "#82aaff",
            "groupItems": {"verticalSpacing": "10"}
        },
        "rightPanel": {
            "backgroundColor": "#0f172a",
            "textColor": "#cbd5e1",
            "width": "40%"
        },
        "schema": {
            "nestedBackground": "#161a22",
            "typeNameColor": "#c084fc",
            "typeTitleColor": "#82aaff"
        },
        "typography": {
            "fontSize": "15px",
            "fontFamily": "Inter, sans-serif",
            "headings": {"fontFamily": "Inter, sans-serif", "fontWeight": "600"},
            "code": {
                "backgroundColor": "#020617",
                "color": "#f1f5f9",
                "fontFamily": "JetBrains Mono, monospace"
            }
        }
    }'''

def _redoc_light_theme() -> str:
    return '''{
        "colors": {"primary": {"main": "#3b82f6"}},
        "sidebar": {"backgroundColor": "#f8fafc", "textColor": "#1e293b"},
        "rightPanel": {"backgroundColor": "#f1f5f9", "textColor": "#1e293b"}
    }'''

@app.get("/api/openapi.json", include_in_schema=False)
async def get_openapi(current_user: dict = Depends(get_docs_user)):
    """Protected OpenAPI JSON - requires authentication"""
    if current_user.get("role") not in ["admin", "owner"]:
        return JSONResponse(
            status_code=403,
            content={"detail": "Access denied. Admin or Owner privileges required."}
        )
    return app.openapi()

@app.get("/api/docs", include_in_schema=False)
async def custom_swagger_ui_html(current_user: dict = Depends(get_docs_user), theme: Optional[str] = "dark"):
    """Protected Swagger UI documentation - requires authentication"""
    if current_user.get("role") not in ["admin", "owner"]:
        return JSONResponse(
            status_code=403,
            content={"detail": "Access denied. Admin or Owner privileges required."}
        )
    
    is_dark = (theme or "dark") == "dark"
    extra_css = _swagger_dark_css() if is_dark else _swagger_light_css()
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{app.title} - Swagger UI</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css" >
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
        <style>{extra_css}</style>
    </head>
    <body>
        <div id="swagger-ui"></div>
        <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"> </script>
        <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"> </script>
        <script>
        window.onload = function() {{
            window.ui = SwaggerUIBundle({{
                url: "/api/openapi.json" + window.location.search,
                dom_id: '#swagger-ui',
                presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
                layout: "StandaloneLayout",
                deepLinking: true,
                showExtensions: true,
                showCommonExtensions: true,
                requestInterceptor: function(request) {{
                    const params = new URLSearchParams(window.location.search);
                    const token = params.get('token');
                    if (token) request.headers['Authorization'] = 'Bearer ' + token;
                    return request;
                }}
            }})

            // CLEANUP: Hide the token from the OpenAPI JSON link text in the UI
            const observer = new MutationObserver(() => {{
                const urlLink = document.querySelector('.info .url');
                if (urlLink && urlLink.innerText.includes('token=')) {{
                    urlLink.innerText = "/api/openapi.json";
                }}
            }});
            observer.observe(document.getElementById('swagger-ui'), {{ childList: true, subtree: true }});
        }}
        </script>
    </body>
    </html>
    """
    return HTMLResponse(html)

@app.get("/api/redoc", include_in_schema=False)
async def redoc_html(current_user: dict = Depends(get_docs_user), theme: Optional[str] = "dark"):
    """Protected ReDoc documentation - requires authentication"""
    if current_user.get("role") not in ["admin", "owner"]:
        return JSONResponse(
            status_code=403,
            content={"detail": "Access denied. Admin or Owner privileges required."}
        )

    is_dark = (theme or "dark") == "dark"
    redoc_theme = _redoc_dark_theme() if is_dark else _redoc_light_theme()
    bg = "#0b0d11" if is_dark else "#ffffff"
    text_color = "#f1f5f9" if is_dark else "#1e293b"
    
    extra_css = f"""
        body {{ margin: 0; padding: 0; background: {bg}; color: {text_color}; font-family: 'Inter', sans-serif; }}
        [data-role="search-input"] {{ 
            background: {"#1e293b" if is_dark else "#f1f5f9"} !important; 
            color: {text_color} !important; 
            border: 1px solid {"#334155" if is_dark else "#e2e8f0"} !important;
            border-radius: 4px !important;
        }}
        
        /* Fix Inputs and Dropdowns */
        input, textarea {{
            background: {"#1e293b" if is_dark else "#ffffff"} !important;
            color: {text_color} !important;
            border-color: {"#334155" if is_dark else "#e2e8f0"} !important;
        }}
        
        select {{
            background: {"#0f172a" if is_dark else "#ffffff"} !important;
            color: {"#f8fafc" if is_dark else "#1e293b"} !important;
            border: 1px solid {"#334155" if is_dark else "#e2e8f0"} !important;
        }}

        option {{
            background: {"#0f172a" if is_dark else "#ffffff"} !important;
            color: {"#f8fafc" if is_dark else "#1e293b"} !important;
        }}
        
        /* Select dropdown wrapper specific fix */
        div[class*="Dropdown"] select,
        .sc-bOikfv, .sc-dIouRR,
        /* React tabs and generic white wrappers */
        .react-tabs__tab-panel div,
        div[class*="Operation"] div[style*="background"],
        div[class*="Server"] div {{
            background-color: {"transparent" if is_dark else "inherit"} !important;
            color: {"#f8fafc" if is_dark else "inherit"} !important;
        }}
        
        /* Explicit Server Input Box & Response tabs */
        .react-tabs__tab-list, .react-tabs__tab {{
            background: {"#0f172a" if is_dark else "inherit"} !important;
            color: {text_color} !important;
        }}
        
        /* Any container with a hardcoded white background */
        div[style*="background: white"],
        div[style*="background-color: white"],
        div[style*="background: #ffffff"],
        div[style*="background-color: #ffffff"],
        div[style*="background-color: rgb(255, 255, 255)"] {{
            background-color: {"#1e293b" if is_dark else "#ffffff"} !important;
        }}
        .api-content {{ background: {bg} !important; }}
        
        /* Fix ReDoc Dim Labels (Authorizations, Schema titles, etc) */
        h5 {{ color: {"#82aaff" if is_dark else "inherit"} !important; opacity: 1 !important; }}
        label {{ color: {text_color} !important; opacity: 1 !important; }}
        
        /* Targeting ReDoc specifically for Headers and Titles */
        .sc-gxOMlj, .sc-dlnjwi, .sc-hKgILg {{ color: {"#82aaff" if is_dark else "inherit"} !important; opacity: 1 !important; text-transform: uppercase; font-weight: 600; font-size: 12px; }}
        
        /* Response Schema and Authorization Labels */
        div[role="tabpanel"] h5, 
        div[role="tabpanel"] span,
        .sc-jMhqS {{ 
            color: {"#f1f5f9" if is_dark else "inherit"} !important; 
            opacity: 1 !important; 
        }}
        
        /* Response Schema Title */
        .sc-hLBpMG {{ color: {"#94a3b8" if is_dark else "inherit"} !important; opacity: 1 !important; }}
        
        /* Schema 'any', 'string' labels */
        .sc-eCImPb {{ color: {"#c084fc" if is_dark else "inherit"} !important; }}

        .redoc-wrap {{ background: {bg}; }}
        /* Custom scrollbar for ReDoc */
        ::-webkit-scrollbar {{ width: 8px; height: 8px; }}
        ::-webkit-scrollbar-track {{ background: {bg}; }}
        ::-webkit-scrollbar-thumb {{ background: {"#334155" if is_dark else "#cbd5e1"}; border-radius: 10px; }}
        ::-webkit-scrollbar-thumb:hover {{ background: {"#475569" if is_dark else "#94a3b8"}; }}
    """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{app.title} - ReDoc</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
        <style>{extra_css}</style>
    </head>
    <body>
        <div id="redoc-container"></div>
        <script src="https://cdn.jsdelivr.net/npm/redoc@2.0.0/bundles/redoc.standalone.js"> </script>
        <script>
            const specUrl = "/api/openapi.json" + window.location.search;
            const themeOptions = {redoc_theme};
            
            Redoc.init(
                specUrl,
                {{
                    scrollYOffset: 0,
                    hideDownloadButton: false,
                    expandResponses: "200,201",
                    theme: themeOptions,
                    nativeScrollbars: false
                }},
                document.getElementById('redoc-container')
            );
        </script>
    </body>
    </html>
    """
    return HTMLResponse(html)

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