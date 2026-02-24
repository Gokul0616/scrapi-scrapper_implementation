import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Check, X, AlertCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';
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
    // Keep track of active timeouts so we can cancel them if a message gets updated
    const timeoutsRef = useRef({});

    const dismissMessage = useCallback((id) => {
        setMessages((prev) => prev.filter((msg) => msg.id !== id));
        if (timeoutsRef.current[id]) {
            clearTimeout(timeoutsRef.current[id]);
            delete timeoutsRef.current[id];
        }
    }, []);

    const showMessage = useCallback((text, type = 'success', duration = 3000, id = null, progress = undefined, action = null) => {
        const messageId = id || (Date.now().toString() + Math.random().toString(36).substr(2, 5));

        setMessages((prev) => {
            const existingIndex = prev.findIndex(msg => msg.id === messageId);
            const newMessage = { id: messageId, text, type, duration, progress, action };

            if (existingIndex >= 0) {
                // Update existing message
                const newMessages = [...prev];
                newMessages[existingIndex] = newMessage;
                return newMessages;
            } else {
                // Deduplicate identical messages currently on screen
                if (prev.some((msg) => msg.text === text && msg.type === type)) {
                    return prev;
                }
                // Append new message
                return [...prev, newMessage];
            }
        });

        // Handle auto-dismiss
        // Clear any existing timeout for this ID to reset the timer
        if (timeoutsRef.current[messageId]) {
            clearTimeout(timeoutsRef.current[messageId]);
            delete timeoutsRef.current[messageId];
        }

        if (duration > 0) {
            timeoutsRef.current[messageId] = setTimeout(() => {
                dismissMessage(messageId);
            }, duration);
        }

        return messageId;
    }, [dismissMessage]);

    useEffect(() => {
        const handleGlobalMessage = (event) => {
            const { message, type, title, duration, id, progress, action } = event.detail;
            const finalMessage = title ? `${title}: ${message} ` : message;
            showMessage(finalMessage, type, duration, id, progress, action);
        };

        window.addEventListener('show-global-message', handleGlobalMessage);
        return () => window.removeEventListener('show-global-message', handleGlobalMessage);
    }, [showMessage]);

    // Clean up timeouts on unmount
    useEffect(() => {
        return () => {
            Object.values(timeoutsRef.current).forEach(clearTimeout);
            timeoutsRef.current = {};
        };
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'success':
                return <Check className="w-5 h-5 text-green-500 flex-shrink-0" strokeWidth={2.5} />;
            case 'error':
                return <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" strokeWidth={2.5} />;
            case 'warning':
                return <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" strokeWidth={2.5} />;
            case 'info':
                return <Info className="w-5 h-5 text-blue-500 flex-shrink-0" strokeWidth={2.5} />;
            case 'loading':
                return <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" strokeWidth={2.5} />;
            default:
                return <Info className="w-5 h-5 text-gray-500 flex-shrink-0" strokeWidth={2.5} />;
        }
    };

    return (
        <MessageContext.Provider value={{ showMessage, dismissMessage }}>
            {children}
            {/* Messages Container - Fixed at Top Center */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] flex flex-col items-center space-y-2 pointer-events-none">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`pointer-events-auto flex flex-col justify-between min-w-[320px] max-w-lg rounded-lg shadow-lg border animate-in fade-in slide-in-from-top-5 duration-300 overflow-hidden ${theme === 'dark'
                            ? 'bg-black border-gray-800 text-white'
                            : 'bg-white border-gray-200 text-gray-900'
                            } `}
                    >
                        <div className="flex items-center justify-between p-3 min-h-[52px]">
                            <div className="flex items-center space-x-3 flex-1 min-w-0 mr-4">
                                {getIcon(msg.type)}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
                                    <span className="text-sm font-medium">{msg.text}</span>
                                    {msg.progress !== undefined && msg.progress !== null && (
                                        <div className={`w-24 sm:w-32 flex-shrink-0 h-1 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} `}>
                                            <div
                                                className="h-full bg-green-500 transition-all duration-300 ease-out"
                                                style={{ width: `${Math.max(0, Math.min(100, msg.progress))}% ` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                                {msg.action && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); msg.action.onClick(msg.id); }}
                                        className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-blue-400' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'} `}
                                    >
                                        {msg.action.label}
                                    </button>
                                )}
                                <button
                                    onClick={() => dismissMessage(msg.id)}
                                    className={`p-1 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400'
                                        } `}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </MessageContext.Provider>
    );
};
