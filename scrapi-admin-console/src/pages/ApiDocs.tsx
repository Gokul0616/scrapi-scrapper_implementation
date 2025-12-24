import React, { useState, useEffect } from 'react';
import { Book, FileText, AlertCircle, Loader2 } from 'lucide-react';

export const ApiDocsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'swagger' | 'redoc'>('swagger');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';
    const token = localStorage.getItem('scrapi_admin_token');

    // Create authenticated URL with token
    const getAuthenticatedUrl = (path: string) => {
        return `${backendUrl}${path}`;
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
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                                activeTab === 'swagger'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Book size={16} className="mr-2" />
                            Swagger UI
                        </button>
                        <button
                            onClick={() => setActiveTab('redoc')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                                activeTab === 'redoc'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <FileText size={16} className="mr-2" />
                            ReDoc
                        </button>
                    </div>
                </div>
            </div>

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

            {/* Documentation Content - Custom implementation with token injection */}
            <div className="flex-1 overflow-hidden">
                <div className="w-full h-full relative">
                    {activeTab === 'swagger' ? (
                        <SwaggerUIWrapper backendUrl={backendUrl} token={token} />
                    ) : (
                        <RedocWrapper backendUrl={backendUrl} token={token} />
                    )}
                </div>
            </div>
        </div>
    );
};

// Swagger UI Component with authentication
const SwaggerUIWrapper: React.FC<{ backendUrl: string; token: string | null }> = ({ backendUrl, token }) => {
    useEffect(() => {
        // Dynamically load Swagger UI and configure with authentication
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js';
        script.async = true;
        
        script.onload = () => {
            // @ts-ignore
            if (window.SwaggerUIBundle) {
                // @ts-ignore
                window.SwaggerUIBundle({
                    url: `${backendUrl}/api/openapi.json`,
                    dom_id: '#swagger-ui',
                    deepLinking: true,
                    presets: [
                        // @ts-ignore
                        window.SwaggerUIBundle.presets.apis,
                        // @ts-ignore
                        window.SwaggerUIBundle.SwaggerUIStandalonePreset
                    ],
                    requestInterceptor: (req: any) => {
                        // Add authentication header to all requests
                        if (token) {
                            req.headers['Authorization'] = `Bearer ${token}`;
                        }
                        return req;
                    }
                });
            }
        };

        document.body.appendChild(script);

        // Load CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css';
        document.head.appendChild(link);

        return () => {
            document.body.removeChild(script);
            document.head.removeChild(link);
        };
    }, [backendUrl, token]);

    return <div id="swagger-ui" className="w-full h-full overflow-auto p-4"></div>;
};

// ReDoc Component with authentication
const RedocWrapper: React.FC<{ backendUrl: string; token: string | null }> = ({ backendUrl, token }) => {
    useEffect(() => {
        // Dynamically load ReDoc
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/redoc@2.1.3/bundles/redoc.standalone.js';
        script.async = true;
        
        script.onload = () => {
            // @ts-ignore
            if (window.Redoc) {
                // @ts-ignore
                window.Redoc.init(
                    `${backendUrl}/api/openapi.json`,
                    {
                        scrollYOffset: 0,
                        hideDownloadButton: false,
                        theme: {
                            colors: {
                                primary: {
                                    main: '#232F3E'
                                }
                            }
                        }
                    },
                    document.getElementById('redoc-container'),
                    // Add authentication if needed
                    token ? {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    } : undefined
                );
            }
        };

        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, [backendUrl, token]);

    return <div id="redoc-container" className="w-full h-full"></div>;
};
