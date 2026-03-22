import asyncio
import logging
from playwright.async_api import async_playwright, Browser

logger = logging.getLogger(__name__)

class BrowserPool:
    """
    Singleton service to manage shared browser instances across Celery tasks or requests.
    This prevents launching a new browser per job, saving 1-3s and ~100MB RAM per job.
    """
    _instance = None
    
    def __init__(self):
        self.pw = None
        self.browser = None
        self.context_count = 0
        self.max_contexts_per_browser = 500 # Rotate browser after 500 jobs to avoid memory leaks
        self._lock = asyncio.Lock()

    @classmethod
    async def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def get_context(self, **options):
        """Get an isolated browser context from the shared browser pool."""
        async with self._lock:
            if not self.browser:
                await self._launch_browser()
            
            self.context_count += 1
            if self.context_count > self.max_contexts_per_browser:
                logger.info("Browser pool reached max contexts, rotating browser...")
                await self.rotate_browser()
                
            return await self.browser.new_context(**options)

    async def _launch_browser(self):
        self.pw = await async_playwright().start()
        self.browser = await self.pw.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
            ]
        )
        logger.info("Shared browser launched in BrowserPool.")

    async def rotate_browser(self):
        """Close and restart browser periodically to clear leaked memory."""
        if self.browser:
            try:
                await self.browser.close()
            except Exception as e:
                logger.warning(f"Error closing browser during rotation: {e}")
        
        await self._launch_browser()
        self.context_count = 0

    async def cleanup(self):
        """Cleanup resources on shutdown."""
        if self.browser:
            await self.browser.close()
            self.browser = None
        if self.pw:
            await self.pw.stop()
            self.pw = None
        logger.info("BrowserPool cleaned up.")

# Helper to get the singleton instance easily
async def get_browser_pool():
    return await BrowserPool.get_instance()
