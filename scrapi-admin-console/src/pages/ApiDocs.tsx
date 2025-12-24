import React, { useState, useEffect, useRef } from 'react';
import { Book, FileText, AlertCircle, Loader2 } from 'lucide-react';

export const ApiDocsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'swagger' | 'redoc'>('swagger');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const token = localStorage.getItem('scrapi_admin_token');
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        loadDocs();
    }, [activeTab]);

    const loadDocs = async () => {
        setLoading(true);
        setError(null);

        try {
            const endpoint = activeTab === 'swagger' ? '/api/docs' : '/api/redoc';
            // Use relative URL to leverage Vite's proxy configuration
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load documentation: ${response.statusText}`);
            }

            const html = await response.text();
            
            // Modify the HTML to include base tag and fix asset URLs
            const modifiedHtml = html
                .replace('<head>', '<head><base href="/">')
                .replace('url: \'/api/openapi.json\'', `url: '/api/openapi.json',
                    requestInterceptor: (req) => {
                        req.headers['Authorization'] = 'Bearer ${token}';
                        return req;
                    }`);
            
            // Inject the modified HTML into iframe
            if (iframeRef.current) {
                const iframe = iframeRef.current;
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (iframeDoc) {
                    iframeDoc.open();
                    iframeDoc.write(modifiedHtml);
                    iframeDoc.close();
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="border-b border-gray-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Interactive API documentation for Scrapi platform
                        </p>
                    </div>
                    <div className="flex space-x-2 border border-gray-300 rounded-lg p-1 bg-gray-50">
                        <button
                            onClick={() => setActiveTab('swagger')}
                            disabled={loading}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                                activeTab === 'swagger'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Book size={16} className="mr-2" />
                            Swagger UI
                        </button>
                        <button
                            onClick={() => setActiveTab('redoc')}
                            disabled={loading}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                                activeTab === 'redoc'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <FileText size={16} className="mr-2" />
                            ReDoc
                        </button>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={32} className="text-gray-400 animate-spin" />
                    <span className="ml-3 text-gray-600">Loading documentation...</span>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                    <AlertCircle size={20} className="text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-900">Failed to load documentation</p>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Documentation Content */}
            <div className="flex-1 overflow-hidden">
                <iframe
                    ref={iframeRef}
                    className="w-full h-full border-0"
                    title={activeTab === 'swagger' ? 'Swagger UI' : 'ReDoc'}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
            </div>
        </div>
    );
};
