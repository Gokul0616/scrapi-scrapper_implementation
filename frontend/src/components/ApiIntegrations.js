import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Copy, 
  Eye, 
  EyeOff, 
  Plus,
  HelpCircle,
  ExternalLink,
  Check,
  Clock
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useToast } from '../hooks/use-toast';
import AlertModal from './AlertModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ApiIntegrations = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [userId, setUserId] = useState('');
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeKeyId, setActiveKeyId] = useState(null);
  const [timerData, setTimerData] = useState(null);
  const [showKeyIds, setShowKeyIds] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [fullKeyStore, setFullKeyStore] = useState({}); // Store full keys temporarily
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ show: false, keyId: null, keyName: '' });

  useEffect(() => {
    if (user) {
      setUserId(user.id || '');
    }
    fetchKeys();
  }, [user]);

  // Check for active timer on mount and reconnect if needed
  useEffect(() => {
    if (keys.length > 0 && !activeKeyId) {
      const activeKey = keys.find(k => k.has_active_timer);
      if (activeKey) {
        console.log('Found active timer for key:', activeKey.id);
        setActiveKeyId(activeKey.id);
      }
    }
  }, [keys, activeKeyId]);

  // WebSocket for timer
  useEffect(() => {
    if (!activeKeyId) return;

    const wsUrl = getWsUrl(`/api/ws/api-keys/${activeKeyId}/timer`);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Connected to timer WS');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.remaining <= 0) {
          setTimerData(null);
          setActiveKeyId(null);
          // Remove full key from store when timer expires
          if (activeKeyId) {
            setFullKeyStore(prev => {
              const newStore = { ...prev };
              delete newStore[activeKeyId];
              return newStore;
            });
            // Also hide the key visibility
            setShowKeyIds(prev => ({
              ...prev,
              [activeKeyId]: false
            }));
          }
          fetchKeys();
        } else {
          setTimerData(data);
          // IMPORTANT: Store the full key when received from WebSocket (for refresh persistence)
          if (data.key && activeKeyId) {
            setFullKeyStore(prev => ({
              ...prev,
              [activeKeyId]: data.key
            }));
            // Automatically show the key
            setShowKeyIds(prev => ({
              ...prev,
              [activeKeyId]: true
            }));
          }
        }
      } catch (e) {
        console.error('Error parsing WS message', e);
      }
    };

    ws.onclose = () => {
      console.log('Timer WS closed');
      setTimerData(null);
      if (activeKeyId) setActiveKeyId(null);
    };

    return () => {
      ws.close();
    };
  }, [activeKeyId]);

  const getWsUrl = (path) => {
    const backendUrl = API_URL || 'http://localhost:8001';
    const protocol = backendUrl.startsWith('https') ? 'wss://' : 'ws://';
    const host = backendUrl.replace(/^https?:\/\//, '');
    return `${protocol}${host}${path}`;
  };

  const fetchKeys = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/auth/api-keys`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setKeys(data);
      }
    } catch (error) {
      console.error("Failed to fetch keys", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Key name is required",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/auth/api-keys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newKeyName })
      });

      if (response.ok) {
        const data = await response.json();
        setNewKeyName('');
        fetchKeys();
        setActiveKeyId(data.id);
        // Store full key temporarily and show it
        if (data.key) {
          setFullKeyStore(prev => ({
            ...prev,
            [data.id]: data.key
          }));
          // Automatically show the key in the list
          setShowKeyIds(prev => ({
            ...prev,
            [data.id]: true
          }));
        }
        toast({
          title: "Success",
          description: "API token created successfully",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.detail || "Failed to create API token",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error creating key", error);
      toast({
        title: "Error",
        description: "Failed to create API token",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (id) => {
    if (!window.confirm("Are you sure you want to delete this token? This action cannot be undone.")) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/auth/api-keys/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setKeys(keys.filter(k => k.id !== id));
        if (activeKeyId === id) {
          setActiveKeyId(null);
          setTimerData(null);
        }
        toast({
          title: "Success",
          description: "API token deleted successfully",
        });
      }
    } catch (error) {
      console.error("Error deleting key", error);
    }
  };

  const copyToClipboard = (text, type = 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'userId') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedKey(text);
      setTimeout(() => setCopiedKey(null), 2000);
    }
    toast({
      title: "Copied",
      description: type === 'userId' ? "User ID copied to clipboard" : "API token copied to clipboard",
    });
  };

  const toggleKeyVisibility = (keyId) => {
    setShowKeyIds(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const getDisplayKey = (key) => {
    // Return truncated version of the prefix for display
    if (key.prefix && key.prefix.length > 20) {
      return `${key.prefix.substring(0, 18)}...`;
    }
    return key.prefix || 'scrapi_api_...';
  };

  const getCopyKey = (key) => {
    // If we have the full key stored, return it, otherwise return prefix
    return fullKeyStore[key.id] || key.prefix;
  };

  const InfoIcon = ({ tooltip }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} cursor-help`} />
        </TooltipTrigger>
        <TooltipContent side="top" className={theme === 'dark' ? 'bg-gray-800 text-white' : ''}>
          <p className="text-xs max-w-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="space-y-6">
      {/* API tokens Section */}
      <div>
        <h2 className={`text-xl font-bold mb-1.5 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          API tokens
        </h2>
        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
          These tokens enable API access to your Scrapi account or organization.{' '}
          <span className="font-semibold">Do not share them with untrusted parties!</span>{' '}
          <a 
            href="#" 
            className={`${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} inline-flex items-center gap-1`}
          >
            Learn more <ExternalLink className="w-3 h-3" />
          </a>
        </p>

        {/* User ID */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Scrapi user ID:
          </span>
          <code className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {userId}
          </code>
          <button
            onClick={() => copyToClipboard(userId, 'userId')}
            className={`p-1 rounded hover:bg-gray-100 ${theme === 'dark' ? 'hover:bg-gray-800' : ''} transition-colors`}
            data-testid="copy-user-id-btn"
          >
            {copiedId ? (
              <Check className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
            ) : (
              <Copy className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
            )}
          </button>
        </div>
      </div>

      {/* Personal API tokens Card */}
      <div 
        className={`border rounded-lg ${
          theme === 'dark' 
            ? 'border-gray-800 bg-[#1A1B1E]' 
            : 'border-gray-200 bg-white'
        }`}
        data-testid="personal-api-tokens-card"
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${
          theme === 'dark' ? 'border-gray-800 bg-[#1A1B1E]' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-2">
            <h3 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Personal API tokens
            </h3>
            <InfoIcon tooltip="Personal tokens are used to authenticate API requests on behalf of your user account." />
          </div>
          <Button
            onClick={() => setNewKeyName('My new token')}
            size="sm"
            variant="outline"
            disabled={keys.length > 0 && !newKeyName}
            data-testid="create-token-btn"
            className={`${
              theme === 'dark' 
                ? 'border-gray-700 text-gray-300 hover:bg-gray-800' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            } ${keys.length > 0 && !newKeyName ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Plus className="w-4 h-4 mr-1" />
            Create a new token
          </Button>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-3">
          {/* Warning when user already has a key */}
          {keys.length > 0 && !newKeyName && (
            <div className={`p-3 rounded-lg border ${
              theme === 'dark' 
                ? 'border-yellow-800 bg-yellow-900/20' 
                : 'border-yellow-200 bg-yellow-50'
            }`}>
              <p className={`text-sm ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-800'}`}>
                ⚠️ You already have an API token. Delete the existing token below to create a new one.
              </p>
            </div>
          )}

          {/* Create Token Form */}
          {newKeyName && (
            <div className={`p-3 rounded-lg border ${
              theme === 'dark' 
                ? 'border-gray-700 bg-[#25262B]' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                Token name
              </label>
              <div className="flex gap-2">
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production API"
                  className={theme === 'dark' ? 'bg-[#1A1B1E] border-gray-700 text-white' : ''}
                  data-testid="token-name-input"
                />
                <Button
                  onClick={handleCreateKey}
                  disabled={isCreating}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="save-token-btn"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </Button>
                <Button
                  onClick={() => setNewKeyName('')}
                  variant="ghost"
                  className={theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : ''}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Timer Display for New Token */}
          {timerData && timerData.key && (
            <div className={`p-3 rounded-lg border ${
              theme === 'dark' 
                ? 'border-green-800 bg-green-900/20' 
                : 'border-green-200 bg-green-50'
            } animate-in fade-in duration-300`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className={`text-sm font-semibold flex items-center gap-2 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-900'
                  }`}>
                    <Check className="w-4 h-4" />
                    Token created successfully
                  </h4>
                  <p className={`text-xs mt-0.5 ${
                    theme === 'dark' ? 'text-green-300' : 'text-green-700'
                  }`}>
                    Copy this token now. It will be hidden in {timerData.remaining}s
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Clean up full key from store and hide visibility
                    if (activeKeyId) {
                      setFullKeyStore(prev => {
                        const newStore = { ...prev };
                        delete newStore[activeKeyId];
                        return newStore;
                      });
                      setShowKeyIds(prev => ({
                        ...prev,
                        [activeKeyId]: false
                      }));
                    }
                    setTimerData(null);
                    setActiveKeyId(null);
                  }}
                  className={theme === 'dark' ? 'text-green-400 hover:text-green-300' : 'text-green-700'}
                >
                  Done
                </Button>
              </div>
              <div className={`flex items-center gap-2 p-2 rounded border relative overflow-hidden ${
                theme === 'dark' 
                  ? 'bg-[#1A1B1E] border-green-800' 
                  : 'bg-white border-green-200'
              }`}>
                {/* Progress bar */}
                <div
                  className={`absolute bottom-0 left-0 h-1 transition-all duration-1000 ease-linear ${
                    theme === 'dark' ? 'bg-green-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${(timerData.remaining / 30) * 100}%` }}
                />
                <code className={`flex-1 font-mono text-xs break-all z-10 ${
                  theme === 'dark' ? 'text-green-400' : 'text-green-800'
                }`}>
                  {timerData.key}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="z-10"
                  onClick={() => copyToClipboard(timerData.key)}
                  data-testid="copy-new-token-btn"
                >
                  {copiedKey === timerData.key ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Token List */}
          {loading ? (
            <div className={`text-center py-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Loading tokens...
            </div>
          ) : keys.length === 0 ? (
            <div className={`text-center py-8 px-4 rounded-lg ${
              theme === 'dark' 
                ? 'bg-[#25262B] text-gray-400' 
                : 'bg-gray-50 text-gray-500'
            }`}>
              <p className="text-sm font-medium">No API tokens yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Active Timer Alert */}
              {timerData && timerData.remaining > 0 && activeKeyId && (
                <div className={`p-3 rounded-lg border ${
                  theme === 'dark' 
                    ? 'border-green-800 bg-green-900/20' 
                    : 'border-green-200 bg-green-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-green-400' : 'text-green-700'}`}>
                      Your API key is visible for {timerData.remaining} more seconds. Copy it now!
                    </span>
                  </div>
                </div>
              )}
              
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Default API token created on sign up.
              </p>
              {keys.map((key) => (
                <div
                  key={key.id}
                  className={`relative flex items-center gap-2 p-3 rounded-lg border overflow-hidden ${
                    theme === 'dark' 
                      ? 'border-gray-700 bg-[#25262B]' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                  data-testid={`token-item-${key.id}`}
                >
                  {/* Progress bar for active timer */}
                  {fullKeyStore[key.id] && timerData && timerData.remaining > 0 && (
                    <div
                      className={`absolute bottom-0 left-0 h-1 transition-all duration-1000 ease-linear ${
                        theme === 'dark' ? 'bg-green-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(timerData.remaining / 30) * 100}%` }}
                    />
                  )}
                  
                  {/* Token Info */}
                  <div className="flex-1 z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                        {key.name}
                      </span>
                      {/* Show timer badge if this key has active timer */}
                      {fullKeyStore[key.id] && timerData && timerData.remaining > 0 && (
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded font-semibold ${
                          theme === 'dark' ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {timerData.remaining}s
                        </span>
                      )}
                    </div>
                    <div 
                      className="font-mono text-xs select-none"
                      style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
                    >
                      {showKeyIds[key.id] || fullKeyStore[key.id] ? (
                        <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} ${
                          fullKeyStore[key.id] ? 'font-semibold' : ''
                        }`}>
                          {fullKeyStore[key.id] || key.prefix}
                        </span>
                      ) : (
                        <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>
                          {getDisplayKey(key)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 z-10">
                    {/* Show/Hide - only show if NOT currently in timer mode */}
                    {!fullKeyStore[key.id] && (
                      <button
                        onClick={() => toggleKeyVisibility(key.id)}
                        className={`p-2 rounded hover:bg-gray-100 ${
                          theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'text-gray-500'
                        } transition-colors`}
                        data-testid={`toggle-visibility-${key.id}`}
                      >
                        {showKeyIds[key.id] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {/* Copy */}
                    <button
                      onClick={() => copyToClipboard(getCopyKey(key))}
                      className={`p-2 rounded hover:bg-gray-100 ${
                        theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'text-gray-500'
                      } transition-colors`}
                      data-testid={`copy-token-${key.id}`}
                    >
                      {copiedKey === getCopyKey(key) ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {/* Delete Button */}
                    <Button
                      onClick={() => handleDeleteKey(key.id)}
                      variant="ghost"
                      size="sm"
                      className={`${
                        theme === 'dark' 
                          ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
                          : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                      }`}
                      data-testid={`delete-token-${key.id}`}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Third-party apps & services Card */}
      <div 
        className={`border rounded-lg ${
          theme === 'dark' 
            ? 'border-gray-800 bg-[#25262B]' 
            : 'border-gray-200 bg-gray-50'
        }`}
      >
        <div className={`px-4 py-3 ${
          theme === 'dark' ? 'bg-[#1A1B1E]' : 'bg-white'
        } rounded-t-lg border-b ${
          theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <h3 className={`text-base font-semibold mb-1.5 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Third-party apps & services with access to your account
          </h3>
          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            These applications are connected to your account and can use API on your behalf.
          </p>
        </div>
        <div className="px-4 py-3">
          <div className={`text-center py-8 px-4 rounded-lg ${
            theme === 'dark' 
              ? 'bg-[#25262B] text-gray-400' 
              : 'bg-gray-50 text-gray-500'
          }`}>
            <p className="text-sm font-medium">No connected third-party apps</p>
          </div>
        </div>
      </div>

      {/* Connected third-party accounts Section */}
      <div>
        <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Connected third-party accounts
        </h2>

        {/* Account-level integrations Card */}
        <div 
          className={`border rounded-lg mb-4 ${
            theme === 'dark' 
              ? 'border-gray-800 bg-[#25262B]' 
              : 'border-gray-200 bg-gray-50'
          }`}
        >
          <div className={`flex items-center justify-between px-4 py-3 border-b ${
            theme === 'dark' ? 'border-gray-800 bg-[#1A1B1E]' : 'border-gray-200 bg-white'
          } rounded-t-lg`}>
            <div className="flex items-center gap-2">
              <h3 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Account-level integrations
              </h3>
              <InfoIcon tooltip="Integrations that work across your entire account." />
            </div>
            <Button
              size="sm"
              variant="outline"
              className={theme === 'dark' ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : ''}
            >
              Add account
            </Button>
          </div>
          <div className="px-4 py-3">
            <div className={`text-center py-8 px-4 rounded-lg ${
              theme === 'dark' 
                ? 'bg-[#25262B] text-gray-400' 
                : 'bg-gray-50 text-gray-500'
            }`}>
              <p className="text-sm font-medium mb-1.5">No integrations</p>
              <a 
                href="#" 
                className={`text-xs inline-flex items-center gap-1 ${
                  theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                Learn more <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Actor OAuth accounts Card */}
        <div 
          className={`border rounded-lg ${
            theme === 'dark' 
              ? 'border-gray-800 bg-[#25262B]' 
              : 'border-gray-200 bg-gray-50'
          }`}
        >
          <div className={`px-4 py-3 border-b ${
            theme === 'dark' ? 'border-gray-800 bg-[#1A1B1E]' : 'border-gray-200 bg-white'
          } rounded-t-lg`}>
            <h3 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Actor OAuth accounts
            </h3>
          </div>
          <div className="px-4 py-3">
            <div className={`text-center py-8 px-4 rounded-lg ${
              theme === 'dark' 
                ? 'bg-[#25262B] text-gray-400' 
                : 'bg-gray-50 text-gray-500'
            }`}>
              <p className="text-sm font-medium mb-1.5">No accounts connected</p>
              <a 
                href="#" 
                className={`text-xs inline-flex items-center gap-1 ${
                  theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                Learn more <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiIntegrations;
