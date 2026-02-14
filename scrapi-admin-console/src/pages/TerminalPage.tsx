import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const BACKEND_WS_URL = (import.meta.env.VITE_BACKEND_URL || '').replace(/^http/, 'ws');

export const TerminalPage: React.FC = () => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const navigate = useNavigate();
    const [connected, setConnected] = useState(false);

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
        fitAddon.fit();

        // Connect to WebSocket
        const token = localStorage.getItem('scrapi_admin_token');
        const clientId = Math.random().toString(36).substring(7);
        const ws = new WebSocket(`${BACKEND_WS_URL}/api/terminal/ws/${clientId}?token=${token}`);

        ws.onopen = () => {
            setConnected(true);
            term.write('\r\n\x1b[32mConnected to backend terminal\x1b[0m\r\n');

            // Send resize event
            const { cols, rows } = term;
            ws.send(JSON.stringify({ type: 'resize', cols, rows }));
        };

        ws.onmessage = (event) => {
            term.write(event.data);
        };

        ws.onclose = () => {
            setConnected(false);
            term.write('\r\n\x1b[31mDisconnected from backend\x1b[0m\r\n');
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            term.write('\r\n\x1b[31mConnection error\x1b[0m\r\n');
        };

        // Handle terminal input
        term.onData((data) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });

        // Handle resize
        const handleResize = () => {
            fitAddon.fit();
            const { cols, rows } = term;
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'resize', cols, rows }));
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            ws.close();
            term.dispose();
        };
    }, []);

    return (
        <div className="h-[calc(100vh-100px)] bg-[#1a1b26] rounded-lg p-2 overflow-hidden flex flex-col shadow-xl">
            <div className="flex justify-between items-center mb-2 px-2">
                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-gray-400 text-xs font-mono">
                        {connected ? 'CONNECTED' : 'DISCONNECTED'}
                    </span>
                </div>
                <div className="text-gray-500 text-xs text-right">
                    Only authorized personnel • Monitor access logged
                </div>
            </div>
            <div ref={terminalRef} className="flex-1 w-full h-full" />
        </div>
    );
};
