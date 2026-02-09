import React, { useEffect } from 'react';
import DocsNavigation from './DocsNavigation';
import DocsFooter from './DocsFooter';
import { GraduationCap, Layout, Code, Shield, Cloud, Terminal, ArrowRight, Bot, Users, Globe } from 'lucide-react';

const DocsLandingPage: React.FC = () => {
    // Set document title on mount
    useEffect(() => {
        document.title = 'Scrapi Documentation';
        return () => {
            // Reset to default title on unmount
            document.title = 'Scrapi: The Web Scraping Platform';
        };
    }, []);

    return (
        <div className="min-h-screen bg-white dark:bg-black font-sans text-gray-900 dark:text-gray-100">
            <DocsNavigation />

            <main>
                {/* Hero Section */}
                <section className="pt-32 pb-16 px-6 text-center max-w-[1400px] mx-auto">
                    {/* <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-blue-700 text-sm font-medium mb-8 hover:bg-blue-100 transition-colors cursor-pointer">
                        <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">Build</span>
                        <span>Win big in $1M Challenge</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </div> */}

                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
                        Scrapi Documentation
                    </h1>
                    <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-12">
                        Learn how to extract value from the web with the Scrapi platform.
                        Go from beginner to expert, all in one place.
                    </p>
                </section>

                {/* Getting Started / Academy Grid */}
                <section className="bg-gray-50/50 dark:bg-zinc-900/50 py-16">
                    <div className="max-w-[1400px] mx-auto px-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                            {/* Left: Intro */}
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Getting started</h2>
                                <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed mb-8">
                                    Scrapi is all about Actors—a new way to package your code to make it easy to share, integrate, and build upon.
                                </p>

                                <div className="bg-white dark:bg-black rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                                    <h3 className="text-lg font-semibold dark:text-white mb-6 flex items-center gap-2">
                                        <GraduationCap className="w-5 h-5 text-blue-600" />
                                        Scrapi Academy
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Card
                                            icon={<GraduationCap className="w-5 h-5 text-blue-600" />}
                                            title="Web scraping for beginners"
                                            desc="Learn the basics of web scraping."
                                            href="/academy/basics"
                                        />
                                        <Card
                                            icon={<Layout className="w-5 h-5 text-blue-600" />}
                                            title="Intro to Scrapi platform"
                                            desc="Learn how to use Scrapi."
                                            href="/academy/platform"
                                        />
                                        <Card
                                            icon={<Code className="w-5 h-5 text-blue-600" />}
                                            title="API scraping"
                                            desc="Extract data from APIs."
                                            href="/academy/api"
                                        />
                                        <Card
                                            icon={<Shield className="w-5 h-5 text-blue-600" />}
                                            title="Anti-scraping protections"
                                            desc="Avoid bans and blocks."
                                            href="/academy/anti-scraping"
                                        />
                                    </div>
                                    <div className="mt-6">
                                        <a href="/academy" className="text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 group">
                                            Go to Academy <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Quick Links */}
                            <div className="space-y-4">
                                <LinkCard title="What is an Actor" href="#" />
                                <LinkCard title="Run an existing Actor" href="#" />
                                <LinkCard title="Develop your own Actor" href="#" />
                                <LinkCard title="Publish and monetize your Actor" href="#" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Platform Section */}
                <section className="py-20 bg-white dark:bg-black">
                    <div className="max-w-[1400px] mx-auto px-6">
                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Platform</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-base">The full reference of the Scrapi platform.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <FeatureCard
                                icon={<Terminal className="w-6 h-6 text-blue-500" />}
                                title="Actors"
                                desc="Develop, run, and share web scraping and automation tools in the cloud."
                            />
                            <FeatureCard
                                icon={<Cloud className="w-6 h-6 text-blue-500" />}
                                title="Storage"
                                desc="Store files and results of your web scraping jobs, and export it to various formats."
                            />
                            <FeatureCard
                                icon={<Globe className="w-6 h-6 text-blue-500" />}
                                title="Proxy"
                                desc="Avoid blocking by smartly rotating datacenter and residential IP addresses."
                            />
                            {/* Row 2 */}
                            <FeatureCard
                                icon={<Layout className="w-6 h-6 text-blue-500" />}
                                title="Schedules"
                                desc="Automatically start Actors and saved tasks at specific times."
                            />
                            <FeatureCard
                                icon={<Code className="w-6 h-6 text-blue-500" />}
                                title="Integrations"
                                desc="Connect Actors with your favorite web apps and cloud services."
                            />
                            <FeatureCard
                                icon={<Shield className="w-6 h-6 text-blue-500" />}
                                title="Security"
                                desc="Learn about Scrapi platform security and data protection."
                            />
                            {/* Row 3 */}
                            <FeatureCard
                                icon={<Users className="w-6 h-6 text-blue-500" />}
                                title="Collaboration"
                                desc="Share Actors with other people, manage your organizations."
                            />
                            <FeatureCard
                                icon={<Bot className="w-6 h-6 text-blue-500" />}
                                title="MCP"
                                desc="Discover and use Actors with AI agents and LLMs via Scrapi MCP server."
                            />
                        </div>
                    </div>
                </section>

                {/* Actor Templates */}
                <section className="py-20 bg-gray-50 dark:bg-zinc-900">
                    <div className="max-w-[1400px] mx-auto px-6">
                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Actor templates</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-base">Create new web scraping projects using ready-made templates for various programming languages.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <TemplateCard
                                lang="js"
                                title="One-Page HTML Scraper with Cheerio"
                                desc="Scrape single page with provided URL with Axios and extract data from page's HTML with Cheerio."
                            />
                            <TemplateCard
                                lang="ts"
                                title="One-Page HTML Scraper with Cheerio"
                                desc="Scrape single page with provided URL with Axios and extract data from page's HTML with Cheerio."
                            />
                            <TemplateCard
                                lang="py"
                                title="One-Page HTML Scraper with BeautifulSoup"
                                desc="Scrape single page with provided URL with HTTPX and extract data from page's HTML with BeautifulSoup."
                            />
                        </div>

                        <div className="mt-8">
                            <a href="#" className="inline-flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                Browse all templates <ArrowRight className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                </section>

                {/* SDK / API / CLI Columns */}
                <section className="py-20 bg-white dark:bg-black">
                    <div className="max-w-[1400px] mx-auto px-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            <div>
                                <div className="mb-6 rounded-lg bg-gray-50 dark:bg-zinc-900 p-8 flex items-center justify-center">
                                    {/* Visual Placeholder for SDK */}
                                    <div className="flex gap-4 items-center">
                                        <div className="w-12 h-12 bg-yellow-400 rounded flex items-center justify-center font-bold text-black">JS</div>
                                        <div className="w-12 h-12 bg-blue-500 rounded flex items-center justify-center font-bold text-white">PY</div>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">SDK</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Software toolkits for developing new Actors.</p>
                                <ul className="space-y-2 text-sm">
                                    <li><a href="#" className="text-blue-600 hover:underline">SDK for JavaScript</a></li>
                                    <li><a href="#" className="text-blue-600 hover:underline">SDK for Python</a></li>
                                </ul>
                            </div>

                            <div>
                                <div className="mb-6 rounded-lg bg-gray-50 dark:bg-zinc-900 p-8 flex items-center justify-center">
                                    {/* Visual Placeholder for API */}
                                    <div className="w-24 h-24 bg-white dark:bg-black shadow-lg rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-center">
                                        <Code className="w-10 h-10 text-gray-400" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">API</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Interact with the Scrapi platform from your applications.</p>
                                <ul className="space-y-2 text-sm">
                                    <li><a href="#" className="text-blue-600 hover:underline">API client for JavaScript</a></li>
                                    <li><a href="#" className="text-blue-600 hover:underline">API client for Python</a></li>
                                    <li><a href="#" className="text-blue-600 hover:underline">API Reference</a></li>
                                </ul>
                            </div>

                            <div>
                                <div className="mb-6 rounded-lg bg-gray-50 dark:bg-zinc-900 p-8 flex items-center justify-center">
                                    {/* Visual Placeholder for CLI */}
                                    <div className="w-full h-24 bg-gray-900 rounded-lg p-2 font-mono text-xs text-green-400 flex flex-col justify-center">
                                        <p>$ scrapi push</p>
                                        <p>...</p>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">CLI</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Control the Scrapi platform from terminal or shell scripts.</p>
                                <ul className="space-y-2 text-sm">
                                    <li><a href="#" className="text-blue-600 hover:underline">CLI Reference</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Community & Help */}
                <section className="py-20 bg-white dark:bg-black border-t border-gray-100 dark:border-gray-800">
                    <div className="max-w-[1400px] mx-auto px-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-12">Community & Help</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-8 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-center">
                                <div className="w-16 h-16 mx-auto bg-[#5865F2] rounded-xl flex items-center justify-center mb-6">
                                    <Users className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Discord</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Join our community to get news and connect with other Scrapi developers.</p>
                            </div>

                            <div className="p-8 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-center">
                                <div className="w-16 h-16 mx-auto bg-black border border-gray-800 rounded-xl flex items-center justify-center mb-6">
                                    <Bot className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Help & Support</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Find answers to common questions or get help from our support team.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Monetize CTA */}
                <section className="py-20 bg-white dark:bg-black">
                    <div className="max-w-[1400px] mx-auto px-6">
                        <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl p-12 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Monetize your code</h2>
                                <p className="text-gray-600 dark:text-gray-400 max-w-xl text-base">
                                    Publish your Actors on Scrapi Store and earn regular passive income.
                                </p>
                            </div>
                            <button className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap">
                                Get started
                            </button>
                        </div>
                    </div>
                </section>

            </main>

            <DocsFooter />
        </div>
    );
};

// Subcomponents
interface CardProps {
    icon: React.ReactNode;
    title: string;
    desc: string;
    href: string;
}

const Card: React.FC<CardProps> = ({ icon, title, desc, href }) => (
    <a href={href} className="block p-4 rounded-lg bg-gray-50 dark:bg-zinc-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group">
        <div className="mb-3">{icon}</div>
        <h4 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-700 dark:group-hover:text-blue-400">{title}</h4>
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{desc}</p>
    </a>
);

interface LinkCardProps {
    title: string;
    href: string;
}

const LinkCard: React.FC<LinkCardProps> = ({ title, href }) => (
    <a href={href} className="flex items-center justify-between p-5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all bg-white dark:bg-black group">
        <span className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">{title}</span>
        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
    </a>
)

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    desc: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, desc }) => (
    <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all bg-white dark:bg-black group cursor-pointer">
        <div className="mb-4">{icon}</div>
        <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
);

interface TemplateCardProps {
    lang: 'js' | 'ts' | 'py';
    title: string;
    desc: string;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ lang, title, desc }) => (
    <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <div className="flex gap-2 mb-4">
            {/* Tech Icons Placeholder */}
            <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs ${lang === 'js' ? 'bg-yellow-400 text-black' : lang === 'ts' ? 'bg-blue-600 text-white' : 'bg-yellow-200 text-blue-800'}`}>
                {lang.toUpperCase()}
            </div>
            <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs">C</div>
        </div>
        <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-lg">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6">{desc}</p>
    </div>
);

export default DocsLandingPage;
