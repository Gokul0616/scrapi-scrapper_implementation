"""
Scraper Registry - Dynamic scraper management system.
Handles registration, discovery, and instantiation of all scrapers.
"""

from typing import Dict, Type, List, Optional
from .base_scraper import BaseScraper
from .scraper_engine import ScraperEngine
import logging

logger = logging.getLogger(__name__)


class ScraperRegistry:
    """
    Central registry for all available scrapers.
    Provides dynamic scraper discovery and instantiation.
    """
    
    def __init__(self):
        self._scrapers: Dict[str, Type[BaseScraper]] = {}
        
    def register(self, scraper_class: Type[BaseScraper]):
        """
        Register a scraper class.
        
        Args:
            scraper_class: Class that inherits from BaseScraper
        """
        name = scraper_class.get_name()
        if name in self._scrapers:
            logger.warning(f"Scraper '{name}' already registered. Overwriting.")
        
        self._scrapers[name] = scraper_class
        logger.info(f"Registered scraper: {name}")
    
    def unregister(self, name: str):
        """Unregister a scraper by name."""
        if name in self._scrapers:
            del self._scrapers[name]
            logger.info(f"Unregistered scraper: {name}")
    
    def get_scraper(self, name: str, engine: ScraperEngine) -> Optional[BaseScraper]:
        """
        Get an instantiated scraper by name.
        
        Args:
            name: Scraper name
            engine: ScraperEngine instance to pass to scraper
            
        Returns:
            Instantiated scraper or None if not found
        """
        scraper_class = self._scrapers.get(name)
        if not scraper_class:
            logger.error(f"Scraper '{name}' not found in registry")
            return None
        
        try:
            return scraper_class(engine)
        except Exception as e:
            logger.error(f"Error instantiating scraper '{name}': {e}")
            return None
    
    def list_scrapers(self) -> List[Dict[str, any]]:
        """
        Get list of all registered scrapers with metadata.
        
        Returns:
            List of dictionaries with scraper information
        """
        scrapers = []
        
        for name, scraper_class in self._scrapers.items():
            scrapers.append({
                'name': name,
                'description': scraper_class.get_description(),
                'category': scraper_class.get_category(),
                'icon': scraper_class.get_icon(),
                'tags': scraper_class.get_tags(),
                'is_premium': scraper_class.is_premium(),
                'class': scraper_class.__name__
            })
        
        return scrapers
    
    def get_scraper_info(self, name: str) -> Optional[Dict[str, any]]:
        """Get detailed information about a specific scraper."""
        scraper_class = self._scrapers.get(name)
        if not scraper_class:
            return None
        
        # Create temporary instance to get schemas
        try:
            from .scraper_engine import ScraperEngine
            temp_engine = ScraperEngine()
            temp_scraper = scraper_class(temp_engine)
            
            return {
                'name': name,
                'description': scraper_class.get_description(),
                'category': scraper_class.get_category(),
                'icon': scraper_class.get_icon(),
                'tags': scraper_class.get_tags(),
                'is_premium': scraper_class.is_premium(),
                'input_schema': temp_scraper.get_input_schema(),
                'output_schema': temp_scraper.get_output_schema()
            }
        except Exception as e:
            logger.error(f"Error getting scraper info for '{name}': {e}")
            return None
    
    def is_registered(self, name: str) -> bool:
        """Check if a scraper is registered."""
        return name in self._scrapers
    
    def get_categories(self) -> List[str]:
        """Get all unique scraper categories."""
        categories = set()
        for scraper_class in self._scrapers.values():
            categories.add(scraper_class.get_category())
        return sorted(list(categories))


# Global registry instance
_global_registry = ScraperRegistry()


def get_scraper_registry() -> ScraperRegistry:
    """Get the global scraper registry instance."""
    return _global_registry


def register_scraper(scraper_class: Type[BaseScraper]):
    """
    Decorator to automatically register a scraper.
    
    Usage:
        @register_scraper
        class MyScaper(BaseScraper):
            ...
    """
    _global_registry.register(scraper_class)
    return scraper_class


# Auto-register all scrapers on import
def auto_register_scrapers():
    """Automatically discover and register all scraper classes."""
    try:
        # Import all scraper modules
        from .googlemap.google_maps_scraper_v3 import GoogleMapsScraperV3
        from .amazon.amazon_scraper import AmazonProductScraper
        from .seo.seo_metadata_scraper import SEOMetadataScraper
        
        # Register each scraper
        _global_registry.register(GoogleMapsScraperV3)
        _global_registry.register(AmazonProductScraper)
        _global_registry.register(SEOMetadataScraper)
        
        logger.info(f"Auto-registered {len(_global_registry._scrapers)} scrapers")
        
    except Exception as e:
        logger.error(f"Error auto-registering scrapers: {e}")


# Run auto-registration on module import
auto_register_scrapers()
