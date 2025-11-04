"""
Actor Template - Python Web Scraper

This template provides a basic structure for creating web scrapers.
Required functions: start(), parse(), paginate() (optional)
"""

import requests
from bs4 import BeautifulSoup
import json
from typing import List, Dict, Optional


def start(input_data: dict) -> List[str]:
    """
    Entry point: Return list of URLs to scrape
    
    Args:
        input_data (dict): User provided inputs
            - url: Target URL to scrape
            - max_pages: Maximum number of pages to scrape (optional)
            - search_query: Search term (optional)
    
    Returns:
        list[str]: URLs to process
    
    Example:
        input_data = {"url": "https://example.com/products"}
        return ["https://example.com/products?page=1"]
    """
    url = input_data.get('url', 'https://example.com')
    print(f"🚀 Starting scraper for: {url}")
    
    # Return list of URLs to scrape
    return [url]


def parse(url: str, html: str) -> List[Dict]:
    """
    Parse HTML and extract data
    
    Args:
        url (str): Current URL being scraped
        html (str): Page HTML content
    
    Returns:
        list[dict]: List of extracted items
        
    Example:
        return [
            {"title": "Product 1", "price": "$99"},
            {"title": "Product 2", "price": "$149"}
        ]
    """
    print(f"📄 Parsing: {url}")
    soup = BeautifulSoup(html, 'lxml')
    results = []
    
    # Example: Extract all article links
    for item in soup.select('article, .product, .item'):
        title_elem = item.select_one('h1, h2, h3, .title')
        link_elem = item.select_one('a')
        
        if title_elem:
            data = {
                'title': title_elem.get_text(strip=True),
                'url': link_elem.get('href', '') if link_elem else '',
                'source_url': url
            }
            
            # Extract price if available
            price_elem = item.select_one('.price, [class*="price"]')
            if price_elem:
                data['price'] = price_elem.get_text(strip=True)
            
            # Extract image if available
            img_elem = item.select_one('img')
            if img_elem:
                data['image'] = img_elem.get('src', '')
            
            results.append(data)
    
    print(f"✅ Extracted {len(results)} items from {url}")
    return results


def paginate(url: str, html: str) -> Optional[str]:
    """
    Optional: Return next page URL for pagination
    
    Args:
        url (str): Current URL
        html (str): Page HTML content
    
    Returns:
        str or None: Next page URL or None to stop pagination
        
    Example:
        return "https://example.com/products?page=2"
        return None  # Stop pagination
    """
    soup = BeautifulSoup(html, 'lxml')
    
    # Look for common pagination patterns
    next_button = soup.select_one(
        'a.next, a[rel="next"], .pagination-next, '
        'a:contains("Next"), a:contains("→")'  
    )
    
    if next_button:
        next_url = next_button.get('href')
        if next_url:
            # Handle relative URLs
            if not next_url.startswith('http'):
                from urllib.parse import urljoin
                next_url = urljoin(url, next_url)
            
            print(f"➡️  Next page found: {next_url}")
            return next_url
    
    print("🏁 No more pages to scrape")
    return None


# ============= Helper Functions (Available to use) =============

def make_request(url: str, method: str = 'GET', headers: dict = None, data: dict = None) -> str:
    """
    Make HTTP request with custom headers/data
    
    Args:
        url: Target URL
        method: HTTP method (GET, POST, etc.)
        headers: Custom headers dict
        data: POST data dict
    
    Returns:
        str: Response HTML content
    """
    if headers is None:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    
    response = requests.request(method, url, headers=headers, data=data, timeout=30)
    response.raise_for_status()
    return response.text


def extract_json_from_script(html: str, variable_name: str) -> dict:
    """
    Extract JSON data from <script> tags
    
    Args:
        html: Page HTML
        variable_name: JavaScript variable name containing JSON
    
    Returns:
        dict: Extracted JSON data
    """
    import re
    pattern = rf'{variable_name}\s*=\s*({{.*?}});'
    match = re.search(pattern, html, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    return {}


def clean_text(text: str) -> str:
    """
    Clean and normalize text
    """
    import re
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove special characters
    text = text.strip()
    return text


# ============= Example Usage =============
if __name__ == '__main__':
    # Test the scraper locally
    test_input = {
        'url': 'https://example.com'
    }
    
    # Get URLs to scrape
    urls = start(test_input)
    
    # Scrape each URL
    for url in urls:
        html = make_request(url)
        items = parse(url, html)
        
        print(f"\n📊 Results: {len(items)} items")
        for item in items[:3]:  # Show first 3 items
            print(json.dumps(item, indent=2))
        
        # Check for next page
        next_url = paginate(url, html)
        if next_url:
            print(f"Next: {next_url}")
