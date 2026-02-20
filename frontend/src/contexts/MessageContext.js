import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { useTheme } from './ThemeContext';

const MessageContext = createContext();

export const useMessage = () => {
    const context = useContext(MessageContext);
    if (!context) {
        throw new Error('useMessage must be used within MessageProvider');
    }
    return context;
};

export const MessageProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const { theme } = useTheme();

    const showMessage = useCallback((text, type = 'success', duration = 3000) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);

        setMessages((prev) => {
            // Deduplicate identical messages currently on screen
            if (prev.some((msg) => msg.text === text && msg.type === type)) {
                return prev;
            }
            return [...prev, { id, text, type, duration }];
        });

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => {
                dismissMessage(id);
            }, duration);
        }

        return id;
    }, []);

    const dismissMessage = useCallback((id) => {
        setMessages((prev) => prev.filter((msg) => msg.id !== id));
    }, []);

    return (
        <MessageContext.Provider value={{ showMessage, dismissMessage }}>
            {children}
            {/* Messages Container - Fixed at Top Center */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] flex flex-col items-center space-y-2 pointer-events-none">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`pointer-events-auto flex items-center justify-between min-w-[300px] max-w-sm px-4 py-3 rounded-lg shadow-lg border animate-in fade-in slide-in-from-top-5 duration-300 ${theme === 'dark'
                            ? 'bg-gray-800 border-gray-700 text-white'
                            : 'bg-white border-gray-200 text-gray-900'
                            }`}
                    >
                        <div className="flex items-center space-x-3">
                            {msg.type === 'success' ? (
                                <Check className="w-5 h-5 text-green-500 flex-shrink-0" strokeWidth={2.5} />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" strokeWidth={2.5} />
                            )}
                            <span className="text-sm font-medium">{msg.text}</span>
                        </div>
                        <button
                            onClick={() => dismissMessage(msg.id)}
                            className={`ml-4 p-1 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400'
                                }`}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </MessageContext.Provider>
    );
};
