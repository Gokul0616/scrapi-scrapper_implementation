import React, { useState } from 'react';
import { Book, FileText } from 'lucide-react';

export const ApiDocsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'swagger' | 'redoc'>('swagger');
    const token = localStorage.getItem('scrapi_admin_token');

    const handleTabChange = (tab: 'swagger' | 'redoc') => {
        setActiveTab(tab);
    };

    return (
        <div className="flex flex-col bg-white rounded-lg shadow" style={{ height: 'calc(100vh - 160px)' }}>
            {/* Header */}
            <div className="border-b border-gray-200 bg-white px-6 py-4 flex-shrink-0 rounded-t-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Interactive API documentation for Scrapi platform
                        </p>
                    </div>
                    <div className="flex space-x-2 border border-gray-300 rounded-lg p-1 bg-gray-50">
                        <button
                            onClick={() => handleTabChange('swagger')}
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
                            onClick={() => handleTabChange('redoc')}
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

            {/* Documentation Content */}
            <div className="flex-1 min-h-0 bg-gray-50">
                <iframe
                    key={activeTab}
                    src={`/api/${activeTab === 'swagger' ? 'docs' : 'redoc'}?token=${token}`}
                    className="w-full h-full border-0"
                    title={activeTab === 'swagger' ? 'Swagger UI' : 'ReDoc'}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                />
            </div>
        </div>
    );
};
