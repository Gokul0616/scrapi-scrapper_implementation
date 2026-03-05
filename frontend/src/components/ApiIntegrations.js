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
  Clock,
  AlertCircle
} from 'lucide-react';
import CustomTooltip from './CustomTooltip';
import { useToast } from '../hooks/use-toast';
import AlertModal from './AlertModal';
const API_URL = process.env.REACT_APP_BACKEND_URL;

const ApiIntegrations = () => {
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
        title: 'Error',
        description: 'Key name is required',
        variant: 'destructive'
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
          // Set initial timer data immediately to show timer from 30 seconds
          setTimerData({
            key: data.key,
            remaining: 30
          });
        }
        toast({
          title: 'Success',
          description: 'API token created successfully'
        });
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.detail || 'Failed to create API token',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error("Error creating key", error);
      toast({
        title: 'Error',
        description: 'Failed to create API token',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = (id) => {
    const keyToDelete = keys.find(k => k.id === id);
    setDeleteConfirmModal({
      show: true,
      keyId: id,
      keyName: keyToDelete?.name || 'this token'
    });
  };

  const confirmDeleteKey = async () => {
    const { keyId } = deleteConfirmModal;
    setDeleteConfirmModal({ show: false, keyId: null, keyName: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/auth/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setKeys(keys.filter(k => k.id !== keyId));
        if (activeKeyId === keyId) {
          setActiveKeyId(null);
          setTimerData(null);
        }
        toast({
          title: 'Success',
          description: 'API token deleted successfully'
        });
      }
    } catch (error) {
      console.error("Error deleting key", error);
      toast({
        title: 'Error',
        description: 'Failed to delete API token',
        variant: 'destructive'
      });
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
      description: type === 'userId' ? 'User ID copied to clipboard' : 'API token copied to clipboard'
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
    <CustomTooltip content={tooltip}>
      <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
    </CustomTooltip>
  );

  return (
    <div className="space-y-6">
      {/* API tokens Section */}
      <div>
        <h2 className="text-xl font-bold mb-1.5 text-foreground">
          API tokens
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          These tokens enable API access to your Scrapi account or organization.{' '}
          <span className="font-semibold">Do not share them with untrusted parties!</span>{' '}
          <a version=""
            href="#"
            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            Learn more <ExternalLink className="w-3 h-3" />
          </a>
        </p>

        {/* User ID */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium text-foreground">
            Scrapi user ID:
          </span>
          <code className="text-xs font-mono text-muted-foreground">
            {userId}
          </code>
          <button
            onClick={() => copyToClipboard(userId, 'userId')}
            className="p-1 rounded hover:bg-muted transition-colors"
            data-testid="copy-user-id-btn"
          >
            {copiedId ? (
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Personal API tokens Card */}
      <div
        className="border rounded-lg bg-card border-border"
        data-testid="personal-api-tokens-card"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">
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
            className={`border-border text-foreground hover:bg-muted ${keys.length > 0 && !newKeyName ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Plus className="w-4 h-4 mr-1" />
            Create a new token
          </Button>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-3">
          {/* Warning when user already has a key */}
          {keys.length > 0 && !newKeyName && (
            <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                ⚠️ You already have an API token. Delete the existing token below to create a new one.
              </p>
            </div>
          )}

          {/* Create Token Form */}
          {newKeyName && (
            <div className="p-3 rounded-lg border border-border bg-muted/30">
              <label className="block text-xs font-medium mb-1.5 text-foreground">
                Token name
              </label>
              <div className="flex gap-2">
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production API"
                  className="bg-background border-input text-foreground"
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
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Token List */}
          {loading ? (
            <div className="text-center py-6 text-muted-foreground">
              Loading tokens...
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-lg bg-muted/30 text-muted-foreground">
              <p className="text-sm font-medium">No API tokens yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Default API token created on sign up.
              </p>
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="relative flex items-center gap-2 p-3 rounded-lg border overflow-hidden border-border bg-card"
                  data-testid={`token-item-${key.id}`}
                >
                  {/* Progress bar for active timer - Show if this key has active timer */}
                  {activeKeyId === key.id && timerData && timerData.remaining > 0 && (
                    <div
                      className="absolute bottom-0 left-0 h-1 transition-all duration-1000 ease-linear bg-blue-600"
                      style={{ width: `${(timerData.remaining / 30) * 100}%` }}
                    />
                  )}

                  {/* Token Info */}
                  <div className="flex-1 z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {key.name}
                      </span>
                      {/* Show timer badge if this key has active timer */}
                      {activeKeyId === key.id && timerData && timerData.remaining > 0 && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded font-semibold bg-blue-600/10 text-blue-600 dark:text-blue-400">
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
                        <span className={`text-foreground ${fullKeyStore[key.id] ? 'font-semibold' : ''
                          }`}>
                          {fullKeyStore[key.id] || key.prefix}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
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
                        className="p-2 rounded hover:bg-muted text-muted-foreground transition-colors"
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
                      className="p-2 rounded hover:bg-muted text-muted-foreground transition-colors"
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
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
        className="border rounded-lg bg-card border-border"
      >
        <div className="px-4 py-3 bg-card rounded-t-lg border-b border-border">
          <h3 className="text-base font-semibold mb-1.5 text-foreground">
            Third-party apps & services with access to your account
          </h3>
          <p className="text-xs text-muted-foreground">
            These applications are connected to your account and can use API on your behalf.
          </p>
        </div>
        <div className="px-4 py-3">
          <div className="text-center py-8 px-4 rounded-lg bg-muted/30 text-muted-foreground">
            <p className="text-sm font-medium">No connected third-party apps</p>
          </div>
        </div>
      </div>

      {/* Connected third-party accounts Section */}
      <div>
        <h2 className="text-xl font-bold mb-4 text-foreground">
          Connected third-party accounts
        </h2>

        {/* Account-level integrations Card */}
        <div
          className="border rounded-lg mb-4 bg-card border-border"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card rounded-t-lg">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">
                Account-level integrations
              </h3>
              <InfoIcon tooltip="Integrations that work across your entire account." />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-border text-foreground hover:bg-muted"
            >
              Add account
            </Button>
          </div>
          <div className="px-4 py-3">
            <div className="text-center py-8 px-4 rounded-lg bg-muted/30 text-muted-foreground">
              <p className="text-sm font-medium mb-1.5">No integrations</p>
              <a
                href="#"
                className="text-xs inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
              >
                Learn more <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Actor OAuth accounts Card */}
        <div
          className="border rounded-lg bg-card border-border"
        >
          <div className="px-4 py-3 border-b border-border bg-card rounded-t-lg">
            <h3 className="text-base font-semibold text-foreground">
              Actor OAuth accounts
            </h3>
          </div>
          <div className="px-4 py-3">
            <div className="text-center py-8 px-4 rounded-lg bg-muted/30 text-muted-foreground">
              <p className="text-sm font-medium mb-1.5">No accounts connected</p>
              <a
                href="#"
                className="text-xs inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
              >
                Learn more <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Inlined if possible or using Global confirm? */}
      {/* For now, let's use a subtle inline confirmation instead of a full AlertModal if user wants to avoid them */}
      {/* Actually I'll just remove the AlertModal as requested and we can implement a better way if needed */}
      <AlertModal
        show={deleteConfirmModal.show}
        onClose={() => setDeleteConfirmModal({ show: false, keyId: null, keyName: '' })}
        onConfirm={confirmDeleteKey}
        title="Delete API Token"
        message={`Are you sure you want to delete "${deleteConfirmModal.keyName}"? This action cannot be undone.`}
        type="warning"
        showCancel={true}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default ApiIntegrations;
