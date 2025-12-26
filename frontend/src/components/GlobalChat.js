import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AlertModal from './AlertModal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, Send, Minimize2, Trash2, Navigation } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Custom Chat Icon SVG Component - Clean and modern
const ChatIcon = ({ className = "w-5 h-5" }) => (
  <svg 
    className={className}
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      d="M12 2C6.48 2 2 6.48 2 12C2 13.54 2.38 15 3.06 16.29L2 22L7.71 20.94C9 21.62 10.46 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" 
      fill="currentColor"
      fillOpacity="0.9"
    />
    <circle cx="8" cy="12" r="1.25" fill="white"/>
    <circle cx="12" cy="12" r="1.25" fill="white"/>
    <circle cx="16" cy="12" r="1.25" fill="white"/>
  </svg>
);

const GlobalChat = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const messagesEndRef = useRef(null);

  // Draggable state
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('chatPosition');
    return saved ? JSON.parse(saved) : { corner: 'bottom-right' };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragMoved, setDragMoved] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);
  const DRAG_THRESHOLD = 5; // pixels - minimum movement to consider it a drag
  
  // Alert modal states
  const [alertModal, setAlertModal] = useState({ show: false, type: 'info', title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ show: false, type: 'warning', title: '', message: '', onConfirm: null });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation history when chat opens
  useEffect(() => {
    if (isOpen && !historyLoaded) {
      loadChatHistory();
    }
  }, [isOpen]);

  // Get position styles based on corner
  const getPositionStyles = () => {
    const spacing = 24; // 1.5rem = 24px
    const positions = {
      'top-left': { top: `${spacing}px`, left: `${spacing}px`, bottom: 'auto', right: 'auto' },
      'top-right': { top: `${spacing}px`, right: `${spacing}px`, bottom: 'auto', left: 'auto' },
      'bottom-left': { bottom: `${spacing}px`, left: `${spacing}px`, top: 'auto', right: 'auto' },
      'bottom-right': { bottom: `${spacing}px`, right: `${spacing}px`, top: 'auto', left: 'auto' }
    };
    return positions[position.corner] || positions['bottom-right'];
  };

  // Detect nearest corner based on current position
  const getNearestCorner = (x, y) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    const distanceToLeft = x;
    const distanceToRight = windowWidth - x;
    const distanceToTop = y;
    const distanceToBottom = windowHeight - y;
    
    const isLeft = distanceToLeft < distanceToRight;
    const isTop = distanceToTop < distanceToBottom;
    
    if (isTop && isLeft) return 'top-left';
    if (isTop && !isLeft) return 'top-right';
    if (!isTop && isLeft) return 'bottom-left';
    return 'bottom-right';
  };

  // Handle drag start
  const handleDragStart = (e) => {
    if (isOpen) return; // Don't drag when chat is open
    
    setIsDragging(true);
    setDragMoved(false); // Reset drag moved flag
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    
    const rect = buttonRef.current.getBoundingClientRect();
    setDragStart({
      x: clientX - rect.left,
      y: clientY - rect.top,
      startX: clientX,
      startY: clientY
    });
    setCurrentPos({ x: rect.left, y: rect.top });
  };

  // Handle drag move
  const handleDragMove = (e) => {
    if (!isDragging) return;
    
    e.preventDefault();
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    
    // Check if movement exceeds threshold
    const deltaX = Math.abs(clientX - dragStart.startX);
    const deltaY = Math.abs(clientY - dragStart.startY);
    
    if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
      setDragMoved(true); // User is actually dragging, not just clicking
    }
    
    setCurrentPos({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  // Handle drag end
  const handleDragEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Only update position if user actually dragged (moved beyond threshold)
    if (dragMoved) {
      // Calculate center of button
      const buttonSize = 56; // 14 * 4 = 56px (w-14 h-14)
      const centerX = currentPos.x + buttonSize / 2;
      const centerY = currentPos.y + buttonSize / 2;
      
      // Find nearest corner
      const nearestCorner = getNearestCorner(centerX, centerY);
      
      // Update position
      const newPosition = { corner: nearestCorner };
      setPosition(newPosition);
      localStorage.setItem('chatPosition', JSON.stringify(newPosition));
    }
    
    // Reset drag moved flag after a short delay to allow onClick to check it
    setTimeout(() => {
      setDragMoved(false);
    }, 50);
  };

  // Add/remove event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      const handleMove = (e) => handleDragMove(e);
      const handleEnd = () => handleDragEnd();
      
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove);
      document.addEventListener('touchend', handleEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging, currentPos, dragStart]);

  const loadChatHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/chat/global/history?limit=30`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const history = response.data.history || [];
      const formattedMessages = history.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at || new Date().toISOString()
      }));

      setMessages(formattedMessages);
      setHistoryLoaded(true);
    } catch (error) {
      console.error('Error loading chat history:', error);
      setHistoryLoaded(true);
    }
  };

  const clearChatHistory = async () => {
    // Show confirmation modal
    setConfirmModal({
      show: true,
      type: 'warning',
      title: 'Clear Chat History',
      message: 'Are you sure you want to clear your chat history?',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(
            `${API}/chat/global/history`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );

          setMessages([]);
          setAlertModal({
            show: true,
            type: 'success',
            title: 'Success',
            message: 'Chat history cleared successfully!'
          });
        } catch (error) {
          console.error('Error clearing chat history:', error);
          setAlertModal({
            show: true,
            type: 'error',
            title: 'Error',
            message: 'Failed to clear chat history. Please try again.'
          });
        }
      }
    });
  };

  // Execute commands from AI (navigation, export, form filling, etc.)
  const executeCommand = async (response) => {
    try {
      // Parse the response to look for action commands
      const responseData = typeof response === 'string' ? { response } : response;
      
      // Check if there's an action command in the response metadata
      if (responseData.action) {
        const { action, page, run_id, format, message: actionMessage, actor_id, form_data } = responseData;
        
        // Show visual feedback
        if (actionMessage) {
          setActionFeedback(actionMessage);
          setTimeout(() => setActionFeedback(null), 3000);
        }
        
        // Execute navigation
        if (action === 'navigate' && page) {
          setTimeout(() => {
            const pageMap = {
              'home': '/home',
              'actors': '/actors',
              'runs': '/runs',
              'datasets': '/datasets',
              'leads': '/datasets',
              'proxies': '/proxies',
              'marketplace': '/marketplace',
              'store': '/store',
              'my-scrapers': '/my-scrapers',
              'create-scraper': '/create-scraper'
            };
            
            if (pageMap[page]) {
              navigate(pageMap[page]);
            } else if (page.startsWith('/')) {
              // Direct path navigation
              navigate(page);
            }
          }, 800); // Small delay for user to see the feedback
        }
        
        // Execute actor detail page opening
        if (action === 'open_actor' && actor_id) {
          setTimeout(() => {
            navigate(`/actors/${actor_id}`);
          }, 800);
        }
        
        // Execute run details viewing - navigate to dataset page with run_id
        if (action === 'view_run' && run_id) {
          setTimeout(() => {
            navigate(`/dataset/${run_id}`);
          }, 800);
        }
        
        // Execute full form fill and run automation
        if (action === 'fill_and_run' && run_id) {
          // Just navigate to runs page to see the new run
          setTimeout(() => {
            setActionFeedback(`✓ Scraper started! Run ID: ${run_id.substring(0, 8)}...`);
            setTimeout(() => {
              navigate('/runs');
              setActionFeedback(null);
            }, 1500);
          }, 1000);
        }
        
        // Execute export
        if (action === 'export' && run_id) {
          setTimeout(async () => {
            try {
              const token = localStorage.getItem('token');
              const exportFormat = format || 'json';
              const response = await axios.get(
                `${API}/datasets/export/${run_id}?format=${exportFormat}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                  responseType: 'blob'
                }
              );
              
              // Download the file
              const url = window.URL.createObjectURL(new Blob([response.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `export_${run_id}.${exportFormat}`);
              document.body.appendChild(link);
              link.click();
              link.parentNode.removeChild(link);
              
              setActionFeedback(`✓ Export downloaded successfully!`);
              setTimeout(() => setActionFeedback(null), 3000);
            } catch (error) {
              console.error('Export error:', error);
              setActionFeedback(`✗ Export failed. Please try again.`);
              setTimeout(() => setActionFeedback(null), 3000);
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error('Command execution error:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/chat/global`,
        {
          message: userMessage
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const assistantMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: response.data.timestamp
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Execute any commands from the response
      await executeCommand(response.data);
    } catch (error) {
      console.error('Global chat error:', error);
      
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    if (isOpen) {
      setIsOpen(false);
      setIsMinimized(false);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          ref={buttonRef}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          onClick={(e) => {
            // Only open chat if user didn't drag (just clicked)
            if (!dragMoved) {
              toggleChat();
            }
          }}
          style={
            isDragging
              ? {
                  position: 'fixed',
                  left: `${currentPos.x}px`,
                  top: `${currentPos.y}px`,
                  cursor: 'grabbing',
                  transition: 'none'
                }
              : {
                  position: 'fixed',
                  ...getPositionStyles(),
                  cursor: 'grab',
                  transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)'
                }
          }
          className={`w-14 h-14 ${
            theme === 'dark' 
              ? 'bg-gray-700 hover:bg-gray-600' 
              : 'bg-[#1B1D1F] hover:bg-gray-800'
          } text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center z-[70] group active:scale-95 transition-all duration-200`}
          title="AI Assistant (Drag to move)"
        >
          <ChatIcon className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#2BC56B] rounded-full border-2 border-white animate-pulse"></span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            ...getPositionStyles()
          }}
          className={`w-96 ${
            theme === 'dark' 
              ? 'bg-gray-900 border-gray-700' 
              : 'bg-white border-gray-200'
          } rounded-xl shadow-2xl border flex flex-col z-[70] transition-all duration-300 ${
            isMinimized ? 'h-14' : 'h-[500px]'
          }`}
        >
          {/* Header */}
          <div className={`${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-100'
          } px-4 py-3 rounded-t-xl flex items-center justify-between border-b`}>
            <div className="flex items-center space-x-3">
              <div className={`w-9 h-9 ${
                theme === 'dark' ? 'bg-gray-700' : 'bg-[#1B1D1F]'
              } rounded-lg flex items-center justify-center`}>
                <ChatIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`font-semibold text-sm ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                }`}>AI Assistant</h3>
                <p className={`text-xs ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>Always here to help</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChatHistory}
                className={`${
                  theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                } h-8 w-8 p-0`}
                title="Clear History"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMinimize}
                className={`${
                  theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                } h-8 w-8 p-0`}
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleChat}
                className={`${
                  theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                } h-8 w-8 p-0`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Chat Content - Only show when not minimized */}
          {!isMinimized && (
            <>
              {/* Action Feedback Banner */}
              {actionFeedback && (
                <div className={`px-4 py-2 ${
                  theme === 'dark' ? 'bg-blue-600' : 'bg-[#2BC56B]'
                } text-white text-sm flex items-center space-x-2`}>
                  <Navigation className="w-4 h-4" />
                  <span className="font-medium">{actionFeedback}</span>
                </div>
              )}
              
              {/* Messages */}
              <div className={`flex-1 overflow-y-auto px-4 py-4 space-y-4 ${
                theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
              }`}>
                {messages.length === 0 && (
                  <div className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mt-8`}>
                    <div className={`w-16 h-16 mx-auto mb-4 ${
                      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                    } rounded-full flex items-center justify-center`}>
                      <ChatIcon className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                    </div>
                    <p className="text-base font-medium mb-1">Hi! I'm your AI assistant.</p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} mb-4`}>
                      I can help you navigate and control the app!
                    </p>
                    <div className={`mt-4 space-y-2 text-sm text-left ${
                      theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-white border border-gray-200'
                    } p-4 rounded-lg`}>
                      <p className={`font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                        Try asking:
                      </p>
                      <ul className={`space-y-1.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        <li className="flex items-start">
                          <span className="text-[#2BC56B] mr-2">•</span>
                          <span>"Go to Actors page"</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-[#2BC56B] mr-2">•</span>
                          <span>"Show me my runs"</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-[#2BC56B] mr-2">•</span>
                          <span>"Export my latest data as CSV"</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-[#2BC56B] mr-2">•</span>
                          <span>"How many scrapers do I have?"</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
                
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                        msg.role === 'user'
                          ? theme === 'dark'
                            ? 'bg-blue-600 text-white'
                            : 'bg-[#1B1D1F] text-white'
                          : theme === 'dark'
                            ? 'bg-gray-800 border border-gray-700 text-gray-100'
                            : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <div className="text-sm prose prose-sm max-w-none leading-relaxed">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({children}) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                              strong: ({children}) => <strong className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{children}</strong>,
                              em: ({children}) => <em className="italic">{children}</em>,
                              h1: ({children}) => <h1 className={`text-base font-semibold mb-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{children}</h1>,
                              h2: ({children}) => <h2 className={`text-sm font-semibold mb-1.5 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{children}</h2>,
                              h3: ({children}) => <h3 className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{children}</h3>,
                              ul: ({children}) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                              li: ({children}) => <li className={theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}>{children}</li>,
                              code: ({inline, children}) => 
                                inline ? 
                                  <code className={`${theme === 'dark' ? 'bg-gray-700 text-emerald-400' : 'bg-gray-100 text-emerald-700'} px-1.5 py-0.5 rounded text-xs font-mono`}>{children}</code> :
                                  <code className={`block ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} p-2 rounded text-xs font-mono overflow-x-auto my-2`}>{children}</code>,
                              blockquote: ({children}) => <blockquote className={`border-l-4 border-[#2BC56B] pl-3 italic ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} my-2`}>{children}</blockquote>
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                      <p className={`text-xs mt-1.5 ${
                        msg.role === 'user' ? 'text-white/60' : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl px-4 py-3`}>
                      <div className="flex space-x-2">
                        <div className={`w-2 h-2 ${theme === 'dark' ? 'bg-gray-500' : 'bg-gray-400'} rounded-full animate-bounce`}></div>
                        <div className={`w-2 h-2 ${theme === 'dark' ? 'bg-gray-500' : 'bg-gray-400'} rounded-full animate-bounce`} style={{animationDelay: '0.1s'}}></div>
                        <div className={`w-2 h-2 ${theme === 'dark' ? 'bg-gray-500' : 'bg-gray-400'} rounded-full animate-bounce`} style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className={`px-4 py-3 border-t ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-b-xl`}>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Type your message..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className={`flex-1 text-sm h-10 ${
                      theme === 'dark' 
                        ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-500' 
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'
                    } rounded-lg`}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className={`${
                      theme === 'dark'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-[#1B1D1F] hover:bg-gray-800'
                    } text-white h-10 w-10 p-0 rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Alert Modal (for info/error messages) */}
      <AlertModal
        show={alertModal.show}
        onClose={() => setAlertModal({ ...alertModal, show: false })}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
      />

      {/* Confirmation Modal (for confirmations) */}
      <AlertModal
        show={confirmModal.show}
        onClose={() => setConfirmModal({ ...confirmModal, show: false })}
        onConfirm={confirmModal.onConfirm}
        type={confirmModal.type}
        title={confirmModal.title}
        message={confirmModal.message}
        showCancel={true}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </>
  );
};

export default GlobalChat;
