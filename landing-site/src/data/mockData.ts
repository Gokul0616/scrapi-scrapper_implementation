import { Actor, CompanyLogo, Integration, Testimonial, CodeTemplate } from '../types';

export const actors: Actor[] = [
    {
        id: '1',
        name: 'Google Maps Scraper V2',
        slug: 'scrapi/google-maps-scraper-v2',
        description: 'Extract businesses, places, reviews from Google Maps with powerful scraping engine. Get business names, addresses, phone numbers, emails, ratings, and social media links.',
        icon: '/logo.png',
        author: 'Scrapi',
        authorAvatar: '/logo.png',
        users: '15K',
        rating: 4.8,
    },
    {
        id: '2',
        name: 'Amazon Product Scraper',
        slug: 'scrapi/amazon-product-scraper',
        description: 'Extract products, prices, reviews, ratings, and seller info from Amazon search results and product pages. Complete e-commerce intelligence solution.',
        icon: '/logo.png',
        author: 'Scrapi',
        authorAvatar: '/logo.png',
        users: '8.5K',
        rating: 4.9,
    },
    {
        id: '3',
        name: 'SEO Metadata Scraper',
        slug: 'scrapi/seo-metadata-scraper',
        description: 'Extract comprehensive SEO metadata including meta tags, Open Graph, Twitter Cards, JSON-LD structured data, headings, and technical SEO elements.',
        icon: '/logo.png',
        author: 'Scrapi',
        authorAvatar: '/logo.png',
        users: '6.2K',
        rating: 4.7,
    },
];

export const companyLogos: CompanyLogo[] = [
    { name: 'Tech Startup A', logo: '/logo.png' },
    { name: 'E-commerce B', logo: '/logo.png' },
    { name: 'Agency C', logo: '/logo.png' },
    { name: 'Enterprise D', logo: '/logo.png' },
    { name: 'Platform E', logo: '/logo.png' },
    { name: 'Research F', logo: '/logo.png' },
];

export const integrations: Integration[] = [
    { name: 'GitHub', icon: '/logo.png' },
    { name: 'Google Sheets', icon: '/logo.png' },
    { name: 'Webhooks', icon: '/logo.png' },
    { name: 'Slack', icon: '/logo.png' },
    { name: 'Zapier', icon: '/logo.png' },
    { name: 'Google Drive', icon: '/logo.png' },
];

export const testimonials: Testimonial[] = [
    {
        quote: "Scrapi provided exactly what we needed - reliable web scraping with an intuitive interface. The Google Maps scraper saved us weeks of manual work.",
        author: "Alex Thompson",
        role: "Lead Developer at DataFlow",
        avatar: "/logo.png",
        link: "#"
    },
    {
        quote: "The platform is straightforward and powerful. We use Scrapi daily for competitive intelligence and it has become essential to our operations.",
        author: "Sarah Chen",
        role: "Product Manager at TechVision",
        avatar: "/logo.png",
        link: "#"
    },
    {
        quote: "Great value for money. The API is well-documented and their support team is responsive. Highly recommended for any scraping needs.",
        author: "Mike Rodriguez",
        role: "CTO at MarketInsights",
        avatar: "/logo.png",
        link: "#"
    }
];

export const codeTemplates: CodeTemplate[] = [
    { name: 'Playwright', icon: '/logo.png' },
    { name: 'Puppeteer', icon: '/logo.png' },
    { name: 'Cheerio', icon: '/logo.png' },
    { name: 'Selenium', icon: '/logo.png' },
    { name: 'Scrapy', icon: '/logo.png' },
    { name: 'BeautifulSoup', icon: '/logo.png' },
];
