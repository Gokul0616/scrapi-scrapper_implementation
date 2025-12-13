import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Plus, Trash2, Copy, Check, Key, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const ApiKeyTimer = ({ initialKey, onComplete, onCopy, copied }) => {
    const [timeLeft, setTimeLeft] = useState(initialKey.expires_in || 30);
    const [activeKey, setActiveKey] = useState(initialKey.key || '');
    const wsRef = useRef(null);

    useEffect(() => {
        // Connect to WebSocket
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host.split(':')[0]}:8000/api/ws/api-key-timer/${initialKey.id}`;

        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.status === 'expired') {
                onComplete();
            } else if (data.status === 'active') {
                setTimeLeft(Math.ceil(data.remaining));
                if (data.key && !activeKey) setActiveKey(data.key);
            }
        };

        // Fallback local timer in case WS fails or lags, but prefer WS updates
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Wait for WS to confirm or just close
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (wsRef.current) wsRef.current.close();
            clearInterval(timer);
        };
    }, [initialKey.id, onComplete, initialKey.key, activeKey]);

    // If initial key has key data, use it. If we refreshed, we might be waiting for WS.
    const displayKey = activeKey || initialKey.key;

    return (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg animate-in fade-in duration-300">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-semibold text-green-900 flex items-center">
                        <Check className="w-5 h-5 mr-2" />
                        API Key Created
                    </h4>
                    <div className="flex items-center gap-2 mt-2 text-sm text-green-700">
                        <Clock className="w-4 h-4 animate-pulse" />
                        <span>Visible for {timeLeft} seconds</span>
                    </div>
                </div>
                {/* No 'Done' button, auto-hides */}
            </div>

            <div className="mt-4">
                {/* Progress bar */}
                <div className="h-1 w-full bg-green-200 rounded-full mb-4 overflow-hidden">
                    <div
                        className="h-full bg-green-500 transition-all duration-1000 ease-linear"
                        style={{ width: `${(timeLeft / 30) * 100}%` }}
                    />
                </div>

                <div className="flex items-center gap-2 bg-white p-3 rounded border border-green-200 shadow-sm relative overflow-hidden">
                    {displayKey ? (
                        <code className="flex-1 font-mono text-sm break-all text-green-800 tracking-wider font-bold">
                            {displayKey}
                        </code>
                    ) : (
                        <div className="flex-1 flex items-center gap-2 text-gray-400 italic">
                            <Loader2 className="w-3 h-3 animate-spin" /> Syncing key...
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCopy(displayKey)}
                        disabled={!displayKey}
                        className="hover:bg-green-50"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                </div>

                <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Copy this key immediately. It will disappear when the timer ends.
                </p>
            </div>
        </div>
    );
};

const ApiAccess = () => {
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newKeyName, setNewKeyName] = useState('');
    const [createdKey, setCreatedKey] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const { toast } = useToast();
    const { getAuthToken } = useAuth(); // Assuming this exists or I'll use localStorage
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'}/api/auth/api-keys`, {
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
                description: "key name is required",
                variant: "destructive"
            });
            return;
        }

        setIsCreating(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'}/api/auth/api-keys`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newKeyName })
            });

            if (response.ok) {
                const data = await response.json();
                setCreatedKey(data);
                setNewKeyName('');
                fetchKeys();
                toast({
                    title: "Success",
                    description: "API Key created successfully"
                });
            } else {
                toast({
                    title: "Error",
                    description: "Failed to create API key",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Error creating key", error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteKey = async (id) => {
        if (!window.confirm("Are you sure you want to revoke this key? This action cannot be undone.")) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'}/api/auth/api-keys/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setKeys(keys.filter(k => k.id !== id));
                toast({
                    title: "Revoked",
                    description: "API Key revoked successfully"
                });
            }
        } catch (error) {
            console.error("Error deleting key", error);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
            title: "Copied",
            description: "API Key copied to clipboard"
        });
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">API Access</h1>
                    <p className="text-gray-500 mt-2">Manage your API keys and view documentation.</p>
                </div>
            </div>

            {/* Create Key Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Create New API Key</CardTitle>
                </CardHeader>
                <CardContent>
                    {!createdKey ? (
                        <div className="flex gap-4 items-end">
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-medium text-gray-700">Key Name</label>
                                <Input
                                    placeholder="e.g. Production Scraper"
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleCreateKey} disabled={isCreating}>
                                {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                Generate Key
                            </Button>
                        </div>
                    ) : (
                        <ApiKeyTimer
                            initialKey={createdKey}
                            onComplete={() => setCreatedKey(null)}
                            onCopy={copyToClipboard}
                            copied={copied}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Keys List */}
            <Card>
                <CardHeader>
                    <CardTitle>Your API Keys</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : keys.length === 0 ? (
                        <div className="text-center p-8 text-gray-500">
                            No API keys found. Create one to get started.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Prefix</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Last Used</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {keys.map((key) => (
                                    <TableRow key={key.id}>
                                        <TableCell className="font-medium">{key.name}</TableCell>
                                        <TableCell className="font-mono text-xs">{key.prefix}</TableCell>
                                        <TableCell>{new Date(key.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            {key.last_used_at
                                                ? new Date(key.last_used_at).toLocaleDateString()
                                                : <span className="text-gray-400">Never</span>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDeleteKey(key.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Documentation */}
            <Card className="bg-slate-900 text-white border-none">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Key className="w-5 h-5" />
                        Quick Start
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="tex-lg font-medium mb-2">Authentication</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Include your API key in the <code>Authorization</code> header of your requests.
                        </p>
                        <div className="bg-black/50 p-4 rounded-lg font-mono text-sm text-green-400">
                            Authorization: Bearer scrapi_...
                        </div>
                    </div>

                    <div>
                        <h3 className="tex-lg font-medium mb-2">Run an Actor</h3>
                        <div className="bg-black/50 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                            <pre className="text-gray-300">
                                {`curl -X POST "${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'}/api/runs" \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "actor_id": "google-maps-scraper",
    "input_data": {
      "search_terms": ["restaurants in New York"],
      "max_results": 10
    }
  }'`}
                            </pre>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ApiAccess;
