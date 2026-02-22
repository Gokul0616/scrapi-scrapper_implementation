import React, { useState } from 'react';
import { Book, FileText } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ApiDocsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'swagger' | 'redoc'>('swagger');
    const token = localStorage.getItem('scrapi_admin_token');
    const { theme } = useTheme();

    // ThemeContext already resolves 'system' pref to 'dark'/'light', so theme is always one of those
    const resolvedTheme = theme === 'dark' ? 'dark' : 'light';

    const handleTabChange = (tab: 'swagger' | 'redoc') => {
        setActiveTab(tab);
    };

    const iframeSrc = `/api/${activeTab === 'swagger' ? 'docs' : 'redoc'}?token=${token}&theme=${resolvedTheme}`;

    return (
        <div className="flex flex-col bg-card -m-6" style={{ height: 'calc(100vh - 56px)' }}>
            {/* Header */}
            <div className="border-b border-border bg-card px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">API Documentation</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Interactive API documentation for Scrapi platform
                        </p>
                    </div>
                    <div className="flex space-x-2 border border-border rounded-lg p-1 bg-muted/30">
                        <button
                            onClick={() => handleTabChange('swagger')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${activeTab === 'swagger'
                                ? 'bg-card text-foreground shadow-sm border border-border'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }`}
                        >
                            <Book size={16} className="mr-2" />
                            Swagger UI
                        </button>
                        <button
                            onClick={() => handleTabChange('redoc')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${activeTab === 'redoc'
                                ? 'bg-card text-foreground shadow-sm border border-border'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }`}
                        >
                            <FileText size={16} className="mr-2" />
                            ReDoc
                        </button>
                    </div>
                </div>
            </div>

            {/* Documentation Content */}
            <div className="flex-1 overflow-hidden bg-card">
                <iframe
                    key={`${activeTab}-${resolvedTheme}`}
                    src={iframeSrc}
                    className="w-full h-full border-0"
                    title={activeTab === 'swagger' ? 'Swagger UI' : 'ReDoc'}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                />
            </div>
        </div>
    );
};
