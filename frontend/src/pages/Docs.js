import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Key, Play, Database, FileJson, Copy, ArrowRight } from 'lucide-react';

const Docs = () => {
    const navigate = useNavigate();
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
                        <p className="text-gray-600 mt-2">Complete reference for the Scrapi API.</p>
                    </div>
                    <Button onClick={() => navigate('/api-access')} size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg">
                        <Key className="w-4 h-4 mr-2" />
                        Get API Token
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>

                <div className="grid grid-cols-12 gap-8">
                    {/* Navigation Sidebar */}
                    <div className="col-span-3 space-y-2 sticky top-8 h-fit">
                        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
                            <div className="font-semibold text-gray-900">Getting Started</div>
                            <a href="#intro" className="block text-sm text-gray-600 hover:text-blue-600">Introduction</a>
                            <a href="#auth" className="block text-sm text-gray-600 hover:text-blue-600">Authentication</a>

                            <div className="font-semibold text-gray-900 pt-4">Endpoints</div>
                            <a href="#actors" className="block text-sm text-gray-600 hover:text-blue-600">Actors</a>
                            <a href="#runs" className="block text-sm text-gray-600 hover:text-blue-600">Runs</a>
                            <a href="#datasets" className="block text-sm text-gray-600 hover:text-blue-600">Datasets</a>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="col-span-9 space-y-12">
                        {/* Introduction */}
                        <section id="intro" className="space-y-4">
                            <h2 className="text-2xl font-bold text-gray-900">Introduction</h2>
                            <p className="text-gray-700 leading-relaxed">
                                The Scrapi API allows you to programmatically control actors, run scrapers, and retrieve datasets.
                                It is designed to be RESTful and uses standard HTTP status codes.
                            </p>
                            <Card className="bg-slate-900 text-gray-100 border-none">
                                <CardContent className="p-4 font-mono text-sm">
                                    Base URL: {API_URL}/api
                                </CardContent>
                            </Card>
                        </section>

                        {/* Authentication */}
                        <section id="auth" className="space-y-4">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Key className="w-6 h-6" /> Authentication
                            </h2>
                            <p className="text-gray-700">
                                Authenticate your requests using the `Authorization` header with your API token.
                            </p>
                            <Card className="bg-slate-900 text-gray-300 border-none">
                                <CardContent className="p-6 space-y-4">
                                    <div>
                                        <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Header</div>
                                        <div className="font-mono text-green-400">Authorization: Bearer &lt;YOUR_API_TOKEN&gt;</div>
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Example</div>
                                        <pre className="bg-black/30 p-4 rounded text-sm overflow-x-auto">
                                            {`curl -H "Authorization: Bearer scrapi_..." ${API_URL}/api/hooks/auth/me`}
                                        </pre>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>

                        {/* Run Actor */}
                        <section id="runs" className="space-y-4">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Play className="w-6 h-6" /> Run Actor
                            </h2>
                            <p className="text-gray-700">
                                Execute an actor (scraper) by sending a POST request. You can find the <code>actor_id</code> or <code>api_id</code> on the actor's detail page.
                            </p>
                            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2 border-b flex gap-2 items-center">
                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold ring-1 ring-green-600/20">POST</span>
                                    <span className="font-mono text-sm text-gray-600">/runs</span>
                                </div>
                                <div className="p-6 space-y-4">
                                    <h3 className="font-semibold text-gray-900">Request Body</h3>
                                    <pre className="bg-gray-900 text-gray-100 p-4 rounded text-sm overflow-x-auto">
                                        {`{
  "actor_id": "google-maps-scraper",
  "input_data": {
    "search_terms": ["restaurants"],
    "location": "New York",
    "max_results": 10
  }
}`}
                                    </pre>
                                </div>
                            </div>
                        </section>

                        {/* Get Dataset */}
                        <section id="datasets" className="space-y-4">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Database className="w-6 h-6" /> Retrieve Dataset
                            </h2>
                            <p className="text-gray-700">
                                Fetch the results of a run. By default returns JSON.
                            </p>
                            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2 border-b flex gap-2 items-center">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold ring-1 ring-blue-600/20">GET</span>
                                    <span className="font-mono text-sm text-gray-600">/runs/&lt;run_id&gt;/dataset/items</span>
                                </div>
                                <div className="p-6">
                                    <p className="text-sm text-gray-600 mb-4">Query parameters: <code>format=csv</code>, <code>format=json</code>, <code>limit=100</code></p>
                                    <pre className="bg-gray-900 text-gray-100 p-4 rounded text-sm overflow-x-auto">
                                        {`curl -H "Authorization: Bearer scrapi_..." \\
  "${API_URL}/api/runs/Run_12345/dataset/items?format=json"`}
                                    </pre>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Docs;
