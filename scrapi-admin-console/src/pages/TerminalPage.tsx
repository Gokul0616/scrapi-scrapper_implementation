import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Construct WebSocket URL based on current location
const getWebSocketURL = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}`;
};

export const TerminalPage: React.FC = () => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const navigate = useNavigate();
    const [connected, setConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string>('');

    // Check permissions
    useEffect(() => {
        if (!user) return;
        const hasAccess = user.role === 'owner' || (user.permissions || []).includes('terminal_access');
        if (!hasAccess) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    useEffect(() => {
        if (!terminalRef.current || !user) return;

        let isCleaningUp = false;
        let reconnectTimeout: ReturnType<typeof setTimeout> | undefined = undefined;

        // Initialize xterm.js
        const term = new Terminal({
            cursorBlink: true,
            theme: {
                background: '#1a1b26',
                foreground: '#c0caf5',
                cursor: '#c0caf5',
                selectionBackground: '#33467C',
                black: '#15161E',
                red: '#f7768e',
                green: '#9ece6a',
                yellow: '#e0af68',
                blue: '#7aa2f7',
                magenta: '#bb9af7',
                cyan: '#7dcfff',
                white: '#a9b1d6',
                brightBlack: '#414868',
                brightRed: '#f7768e',
                brightGreen: '#9ece6a',
                brightYellow: '#e0af68',
                brightBlue: '#7aa2f7',
                brightMagenta: '#bb9af7',
                brightCyan: '#7dcfff',
                brightWhite: '#c0caf5'
            },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current);

        // Use setTimeout to ensure terminal is fully mounted before fitting
        setTimeout(() => {
            if (!isCleaningUp) {
                try {
                    fitAddon.fit();
                } catch (error) {
                    console.error('Error fitting terminal:', error);
                }
            }
        }, 100);

        // Connect to WebSocket
        const token = localStorage.getItem('scrapi_admin_token');
        if (!token) {
            setConnectionError('No authentication token found');
            term.write('\r\n\x1b[31mError: No authentication token\x1b[0m\r\n');
            return;
        }

        const clientId = Math.random().toString(36).substring(7);
        const wsUrl = `${getWebSocketURL()}/api/terminal/ws/${clientId}?token=${token}`;

        console.log('Connecting to WebSocket:', wsUrl);
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            if (isCleaningUp) {
                ws.close();
                return;
            }
            console.log('WebSocket connected successfully');
            setConnected(true);
            setConnectionError('');
            term.write('\r\n\x1b[32mConnected to backend terminal\x1b[0m\r\n\r\n');

            // Send resize event
            try {
                const { cols, rows } = term;
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'resize', cols, rows }));
                }
            } catch (error) {
                console.error('Error sending resize:', error);
            }
        };

        ws.onmessage = (event) => {
            if (!isCleaningUp) {
                try {
                    term.write(event.data);
                } catch (error) {
                    console.error('Error writing to terminal:', error);
                }
            }
        };

        ws.onclose = (event) => {
            if (!isCleaningUp) {
                console.log('WebSocket closed:', event.code, event.reason);
                setConnected(false);
                term.write('\r\n\x1b[31mDisconnected from backend\x1b[0m\r\n');

                if (event.code !== 1000) { // Not a normal closure
                    setConnectionError(`Connection closed: ${event.reason || 'Unknown reason'}`);
                }
            }
        };

        ws.onerror = (error) => {
            if (!isCleaningUp) {
                console.error('WebSocket error:', error);
                setConnectionError('Connection error - check console for details');
                term.write('\r\n\x1b[31mConnection error - Please check your network\x1b[0m\r\n');
            }
        };

        // Handle terminal input
        const onDataHandler = (data: string) => {
            if (ws.readyState === WebSocket.OPEN && !isCleaningUp) {
                try {
                    ws.send(data);
                } catch (error) {
                    console.error('Error sending data:', error);
                }
            }
        };
        term.onData(onDataHandler);

        // Handle resize
        const handleResize = () => {
            if (!isCleaningUp) {
                try {
                    fitAddon.fit();
                    const { cols, rows } = term;
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'resize', cols, rows }));
                    }
                } catch (error) {
                    console.error('Error during resize:', error);
                }
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            isCleaningUp = true;
            window.removeEventListener('resize', handleResize);
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close(1000, 'Component unmounting');
            }
            try {
                term.dispose();
            } catch (error) {
                console.error('Error disposing terminal:', error);
            }
        };
    }, [user, navigate]);

    return (
        <div className="h-[calc(100vh-100px)] bg-card border border-border rounded-lg p-2 overflow-hidden flex flex-col shadow-sm">
            <div className="flex justify-between items-center mb-2 px-2">
                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-muted-foreground text-[12px] font-mono">
                        {connected ? 'CONNECTED' : connectionError || 'DISCONNECTED'}
                    </span>
                </div>
                <div className="text-muted-foreground/50 text-[12px] text-right">
                    Only authorized personnel • Monitor access logged
                </div>
            </div>
            {connectionError && !connected && (
                <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-3 py-2 mb-2 rounded text-xs">
                    <strong>Connection Error:</strong> {connectionError}
                </div>
            )}
            <div ref={terminalRef} className="flex-1 w-full h-full" data-testid="terminal-container" />
        </div>
    );
};
