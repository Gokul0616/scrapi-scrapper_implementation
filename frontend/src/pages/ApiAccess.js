import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Plus, Trash2, Copy, Check, Key, Clock } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import AlertModal from '../components/AlertModal';

const ApiAccess = () => {
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newKeyName, setNewKeyName] = useState('');
    const [activeKeyId, setActiveKeyId] = useState(null);
    const [timerData, setTimerData] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const { toast } = useToast();
    const { getAuthToken } = useAuth();
    const [copied, setCopied] = useState(false);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState({ show: false, keyId: null, keyName: '' });

    useEffect(() => {
        fetchKeys();
    }, []);

    // Check for active timers on key list update
    useEffect(() => {
        if (keys.length > 0 && !activeKeyId) {
            const activeKey = keys.find(k => k.has_active_timer);
            if (activeKey) {
                console.log('Found active timer, reconnecting WebSocket for key:', activeKey.id);
                setActiveKeyId(activeKey.id);
            }
        }
    }, [keys, activeKeyId]);

    // WebSocket connection for active timer
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
                console.log('WebSocket timer update:', data);
                
                if (data.remaining <= 0) {
                    console.log('Timer expired, clearing state');
                    setTimerData(null);
                    setActiveKeyId(null);
                    fetchKeys(); // Refresh list to update status if needed
                } else {
                    console.log('Timer active, remaining:', data.remaining);
                    setTimerData(data);
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
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
        const protocol = backendUrl.startsWith('https') ? 'wss://' : 'ws://';
        const host = backendUrl.replace(/^https?:\/\//, '');
        return `${protocol}${host}${path}`;
    };

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
                description: "Key name is required",
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
                setNewKeyName('');
                fetchKeys();

                // Activate timer
                setActiveKeyId(data.id);

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
                if (activeKeyId === id) {
                    setActiveKeyId(null);
                    setTimerData(null);
                }
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

                    {timerData && timerData.key && (
                        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg animate-in fade-in duration-300">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold text-green-900 flex items-center">
                                        <Check className="w-5 h-5 mr-2" />
                                        API Key Created
                                    </h4>
                                    <p className="text-sm text-green-700 mt-1 flex items-center">
                                        <Clock className="w-4 h-4 mr-1 ml-1" />
                                        Visible for {timerData.remaining}s
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setTimerData(null);
                                        setActiveKeyId(null);
                                    }}
                                >
                                    Done
                                </Button>
                            </div>
                            <div className="mt-4 flex items-center gap-2 bg-white p-3 rounded border border-green-200 shadow-sm relative overflow-hidden">
                                {/* Progress bar for timer */}
                                <div
                                    className="absolute bottom-0 left-0 h-1 bg-green-500 transition-all duration-1000 ease-linear"
                                    style={{ width: `${(timerData.remaining / 30) * 100}%` }}
                                />
                                <code className="flex-1 font-mono text-sm break-all text-green-800 z-10">
                                    {timerData.key}
                                </code>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="z-10"
                                    onClick={() => copyToClipboard(timerData.key)}
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-green-600 mt-2">
                                Warning: This key will be hidden forever after the timer expires.
                            </p>
                        </div>
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
                            Authorization: Bearer scrapi_api_...
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
