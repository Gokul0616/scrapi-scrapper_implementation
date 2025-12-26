import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AlertModal from './AlertModal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { MessageCircle, X, Send, Minimize2, Trash2, RefreshCw, Navigation } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
          className={`w-10 h-10 ${
            theme === 'dark' 
              ? 'bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700' 
              : 'bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800'
          } text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center z-[70] group active:scale-95`}
          title="Chat Assistant (Drag to move)"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            ...getPositionStyles()
          }}
          className={`w-80 ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          } rounded-lg shadow-2xl border flex flex-col z-[70] transition-all duration-300 ${
            isMinimized ? 'h-12' : 'h-[500px]'
          }`}
        >
          {/* Header */}
          <div className={`${
            theme === 'dark'
              ? 'bg-gradient-to-r from-gray-700 to-gray-900'
              : 'bg-gradient-to-r from-gray-700 to-gray-900'
          } text-white px-3 py-2 rounded-t-lg flex items-center justify-between`}>
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4" />
              <div>
                <h3 className="font-semibold text-xs">Chat Assistant</h3>
                <p className="text-[10px] opacity-90">AI-powered help</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChatHistory}
                className="text-white hover:bg-white/20 h-6 w-6 p-0"
                title="Clear History"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMinimize}
                className="text-white hover:bg-white/20 h-6 w-6 p-0"
              >
                <Minimize2 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleChat}
                className="text-white hover:bg-white/20 h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Chat Content - Only show when not minimized */}
          {!isMinimized && (
            <>
              {/* Action Feedback Banner */}
              {actionFeedback && (
                <div className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs flex items-center space-x-2 animate-pulse">
                  <Navigation className="w-3 h-3" />
                  <span>{actionFeedback}</span>
                </div>
              )}
              
              {/* Messages */}
              <div className={`flex-1 overflow-y-auto px-3 py-3 space-y-3 ${
                theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
              }`}>
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 mt-4">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs">Hi! I'm your Scrapi assistant.</p>
                    <p className="text-[10px] text-gray-400 mt-1">I can help you navigate and control the app!</p>
                    <div className="mt-3 space-y-1 text-[10px] text-left bg-white p-2 rounded-lg">
                      <p className="font-semibold text-gray-700">Try asking:</p>
                      <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                        <li>"Go to Actors page"</li>
                        <li>"Show me my runs"</li>
                        <li>"Export my latest data as CSV"</li>
                        <li>"How many scrapers do I have?"</li>
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
                      className={`max-w-[80%] rounded-lg px-3 py-1.5 ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-gray-700 to-gray-900 text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="text-xs prose prose-sm max-w-none">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                              strong: ({children}) => <strong className="font-bold text-gray-900">{children}</strong>,
                              em: ({children}) => <em className="italic">{children}</em>,
                              h1: ({children}) => <h1 className="text-sm font-bold mb-1 text-gray-900">{children}</h1>,
                              h2: ({children}) => <h2 className="text-xs font-bold mb-1 text-gray-900">{children}</h2>,
                              h3: ({children}) => <h3 className="text-xs font-bold mb-0.5 text-gray-900">{children}</h3>,
                              ul: ({children}) => <ul className="list-disc pl-3 mb-1 space-y-0.5">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal pl-3 mb-1 space-y-0.5">{children}</ol>,
                              li: ({children}) => <li className="text-gray-800">{children}</li>,
                              code: ({inline, children}) => 
                                inline ? 
                                  <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px] font-mono text-emerald-700">{children}</code> :
                                  <code className="block bg-gray-100 p-1.5 rounded text-[10px] font-mono overflow-x-auto">{children}</code>,
                              blockquote: ({children}) => <blockquote className="border-l-4 border-emerald-500 pl-3 italic text-gray-700">{children}</blockquote>
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                      <p className={`text-[10px] mt-0.5 ${
                        msg.role === 'user' ? 'text-white/70' : 'text-gray-400'
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
                    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <div className="flex space-x-1.5">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-3 py-2 border-t bg-white rounded-b-lg">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Type your message..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="flex-1 text-xs h-8"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800 text-white h-8 w-8 p-0"
                  >
                    <Send className="w-3 h-3" />
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
