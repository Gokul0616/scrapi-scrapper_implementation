/**
 * Actor Template - JavaScript/Node.js Web Scraper
 * 
 * This template provides a basic structure for creating web scrapers in JavaScript.
 * Required functions: start(), parse(), paginate() (optional)
 */

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Entry point: Return list of URLs to scrape
 * 
 * @param {Object} inputData - User provided inputs
 * @param {string} inputData.url - Target URL to scrape
 * @param {number} inputData.maxPages - Maximum number of pages
 * @returns {Promise<string[]>} - URLs to process
 */
async function start(inputData) {
    const url = inputData.url || 'https://example.com';
    console.log(`🚀 Starting scraper for: ${url}`);
    
    // Return list of URLs to scrape
    return [url];
}

/**
 * Parse HTML and extract data
 * 
 * @param {string} url - Current URL being scraped
 * @param {string} html - Page HTML content
 * @returns {Promise<Object[]>} - List of extracted items
 */
async function parse(url, html) {
    console.log(`📄 Parsing: ${url}`);
    const $ = cheerio.load(html);
    const results = [];
    
    // Example: Extract all article items
    $('article, .product, .item').each((i, element) => {
        const $elem = $(element);
        const title = $elem.find('h1, h2, h3, .title').text().trim();
        const link = $elem.find('a').attr('href') || '';
        
        if (title) {
            const data = {
                title: title,
                url: link,
                sourceUrl: url
            };
            
            // Extract price if available
            const price = $elem.find('.price, [class*="price"]').text().trim();
            if (price) {
                data.price = price;
            }
            
            // Extract image if available
            const image = $elem.find('img').attr('src');
            if (image) {
                data.image = image;
            }
            
            results.push(data);
        }
    });
    
    console.log(`✅ Extracted ${results.length} items from ${url}`);
    return results;
}

/**
 * Optional: Return next page URL for pagination
 * 
 * @param {string} url - Current URL
 * @param {string} html - Page HTML content
 * @returns {Promise<string|null>} - Next page URL or null to stop
 */
async function paginate(url, html) {
    const $ = cheerio.load(html);
    
    // Look for common pagination patterns
    const nextButton = $('a.next, a[rel="next"], .pagination-next').first();
    
    if (nextButton.length > 0) {
        let nextUrl = nextButton.attr('href');
        
        if (nextUrl) {
            // Handle relative URLs
            if (!nextUrl.startsWith('http')) {
                const urlObj = new URL(url);
                nextUrl = new URL(nextUrl, urlObj.origin).href;
            }
            
            console.log(`➡️  Next page found: ${nextUrl}`);
            return nextUrl;
        }
    }
    
    console.log('🏁 No more pages to scrape');
    return null;
}

// ============= Helper Functions =============

/**
 * Make HTTP request with custom headers
 */
async function makeRequest(url, options = {}) {
    const defaultHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    
    const response = await axios({
        url,
        method: options.method || 'GET',
        headers: { ...defaultHeaders, ...options.headers },
        data: options.data,
        timeout: 30000
    });
    
    return response.data;
}

/**
 * Clean and normalize text
 */
function cleanText(text) {
    return text.replace(/\s+/g, ' ').trim();
}

// ============= Export Functions =============
module.exports = {
    start,
    parse,
    paginate,
    makeRequest,
    cleanText
};

// ============= Example Usage =============
if (require.main === module) {
    (async () => {
        const testInput = {
            url: 'https://example.com'
        };
        
        // Get URLs to scrape
        const urls = await start(testInput);
        
        // Scrape each URL
        for (const url of urls) {
            const html = await makeRequest(url);
            const items = await parse(url, html);
            
            console.log(`\n📊 Results: ${items.length} items`);
            items.slice(0, 3).forEach(item => {
                console.log(JSON.stringify(item, null, 2));
            });
            
            // Check for next page
            const nextUrl = await paginate(url, html);
            if (nextUrl) {
                console.log(`Next: ${nextUrl}`);
            }
        }
    })();
}
