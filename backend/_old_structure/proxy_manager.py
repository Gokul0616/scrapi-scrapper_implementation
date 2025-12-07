import asyncio
import aiohttp
import random
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
import logging
from models import Proxy

logger = logging.getLogger(__name__)

class ProxyManager:
    """Powerful proxy rotation system with health checking and auto-rotation."""
    
    def __init__(self, db):
        self.db = db
        self.proxy_cache: List[Dict] = []
        self.cache_ttl = 300  # 5 minutes
        self.last_cache_update = None
        self.check_url = "http://httpbin.org/ip"
        self.timeout = 10
        
    async def get_active_proxies(self) -> List[Dict]:
        """Get list of active proxies from database."""
        # Check if cache is still valid
        if (self.proxy_cache and self.last_cache_update and 
            (datetime.now(timezone.utc) - self.last_cache_update).seconds < self.cache_ttl):
            return self.proxy_cache
        
        # Refresh cache from database
        proxies = await self.db.proxies.find({"is_active": True}, {"_id": 0}).to_list(1000)
        
        # Convert datetime strings back to datetime objects if needed
        for proxy in proxies:
            if isinstance(proxy.get('created_at'), str):
                proxy['created_at'] = datetime.fromisoformat(proxy['created_at'])
            if isinstance(proxy.get('last_used'), str):
                proxy['last_used'] = datetime.fromisoformat(proxy['last_used'])
            if isinstance(proxy.get('last_check'), str):
                proxy['last_check'] = datetime.fromisoformat(proxy['last_check'])
        
        self.proxy_cache = proxies
        self.last_cache_update = datetime.now(timezone.utc)
        return proxies
    
    async def get_best_proxy(self) -> Optional[Dict]:
        """Get the best performing proxy based on success rate and response time."""
        proxies = await self.get_active_proxies()
        
        if not proxies:
            logger.warning("No active proxies available")
            return None
        
        # Score proxies based on success rate and response time
        scored_proxies = []
        for proxy in proxies:
            total_requests = proxy['success_count'] + proxy['failure_count']
            success_rate = proxy['success_count'] / total_requests if total_requests > 0 else 0.5
            response_time = proxy.get('response_time', 5.0) or 5.0
            
            # Score: higher success rate and lower response time is better
            score = (success_rate * 100) - (response_time * 2)
            scored_proxies.append((score, proxy))
        
        # Sort by score and get top proxy
        scored_proxies.sort(reverse=True, key=lambda x: x[0])
        return scored_proxies[0][1] if scored_proxies else proxies[0]
    
    async def get_random_proxy(self) -> Optional[Dict]:
        """Get a random active proxy for load distribution."""
        proxies = await self.get_active_proxies()
        return random.choice(proxies) if proxies else None
    
    async def get_rotating_proxy(self, strategy: str = "best") -> Optional[Dict]:
        """Get a proxy based on rotation strategy.
        
        Args:
            strategy: 'best' (best performing), 'random' (random selection), 'round-robin'
        """
        if strategy == "random":
            return await self.get_random_proxy()
        else:
            return await self.get_best_proxy()
    
    def format_proxy_url(self, proxy: Dict) -> str:
        """Format proxy dictionary into URL string for Playwright."""
        protocol = proxy.get('protocol', 'http')
        host = proxy['host']
        port = proxy['port']
        username = proxy.get('username')
        password = proxy.get('password')
        
        if username and password:
            return f"{protocol}://{username}:{password}@{host}:{port}"
        return f"{protocol}://{host}:{port}"
    
    async def check_proxy_health(self, proxy: Dict) -> bool:
        """Check if a proxy is working and measure response time."""
        proxy_url = self.format_proxy_url(proxy)
        
        try:
            start_time = datetime.now()
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.check_url,
                    proxy=proxy_url,
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    if response.status == 200:
                        response_time = (datetime.now() - start_time).total_seconds()
                        
                        # Update proxy stats in database
                        await self.db.proxies.update_one(
                            {"id": proxy['id']},
                            {
                                "$set": {
                                    "is_active": True,
                                    "response_time": response_time,
                                    "last_check": datetime.now(timezone.utc).isoformat()
                                },
                                "$inc": {"success_count": 1}
                            }
                        )
                        logger.info(f"Proxy {proxy['host']}:{proxy['port']} is healthy (response: {response_time:.2f}s)")
                        return True
        except Exception as e:
            logger.warning(f"Proxy {proxy['host']}:{proxy['port']} check failed: {str(e)}")
            
            # Update failure count
            await self.db.proxies.update_one(
                {"id": proxy['id']},
                {
                    "$set": {
                        "last_check": datetime.now(timezone.utc).isoformat()
                    },
                    "$inc": {"failure_count": 1}
                }
            )
            
            # Deactivate proxy if too many failures
            failure_count = proxy['failure_count'] + 1
            if failure_count >= 5:
                await self.deactivate_proxy(proxy['id'])
            
            return False
    
    async def mark_proxy_used(self, proxy_id: str, success: bool = True):
        """Mark proxy as used and update statistics."""
        update_data = {
            "$set": {"last_used": datetime.now(timezone.utc).isoformat()}
        }
        
        if success:
            update_data["$inc"] = {"success_count": 1}
        else:
            update_data["$inc"] = {"failure_count": 1}
        
        await self.db.proxies.update_one({"id": proxy_id}, update_data)
        
        # Clear cache to force refresh
        self.proxy_cache = []
    
    async def deactivate_proxy(self, proxy_id: str):
        """Deactivate a proxy that's not working."""
        await self.db.proxies.update_one(
            {"id": proxy_id},
            {"$set": {"is_active": False}}
        )
        logger.info(f"Deactivated proxy {proxy_id}")
        
        # Clear cache
        self.proxy_cache = []
    
    async def add_free_proxies(self):
        """Fetch and add free proxies from public sources."""
        # List of free proxy URLs
        free_proxy_apis = [
            "https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all",
        ]
        
        added_count = 0
        for api_url in free_proxy_apis:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(api_url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                        if response.status == 200:
                            text = await response.text()
                            proxy_lines = text.strip().split('\n')
                            
                            for line in proxy_lines[:20]:  # Limit to 20 proxies per source
                                if ':' in line:
                                    try:
                                        host, port = line.strip().split(':')
                                        
                                        # Check if proxy already exists
                                        existing = await self.db.proxies.find_one({"host": host, "port": int(port)})
                                        if not existing:
                                            proxy = Proxy(
                                                host=host,
                                                port=int(port),
                                                protocol="http"
                                            )
                                            doc = proxy.model_dump()
                                            doc['created_at'] = doc['created_at'].isoformat()
                                            await self.db.proxies.insert_one(doc)
                                            added_count += 1
                                    except Exception as e:
                                        logger.debug(f"Failed to parse proxy line {line}: {e}")
                                        continue
            except Exception as e:
                logger.error(f"Failed to fetch proxies from {api_url}: {e}")
        
        logger.info(f"Added {added_count} new free proxies")
        self.proxy_cache = []  # Clear cache
        return added_count
    
    async def health_check_all(self):
        """Run health check on all proxies."""
        proxies = await self.db.proxies.find({}, {"_id": 0}).to_list(1000)
        
        # Convert datetime strings
        for proxy in proxies:
            if isinstance(proxy.get('created_at'), str):
                proxy['created_at'] = datetime.fromisoformat(proxy['created_at'])
        
        tasks = [self.check_proxy_health(proxy) for proxy in proxies]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        healthy = sum(1 for r in results if r is True)
        logger.info(f"Health check complete: {healthy}/{len(proxies)} proxies healthy")
        return healthy

# Global proxy manager instance
proxy_manager = None

def get_proxy_manager(db):
    global proxy_manager
    if proxy_manager is None:
        proxy_manager = ProxyManager(db)
    return proxy_manager
