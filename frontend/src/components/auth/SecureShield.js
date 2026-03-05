import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const SecureShield = ({ onVerify, email }) => {
    const [status, setStatus] = useState('initializing'); // initializing, challenge, solving, completed, error
    const [error, setError] = useState('');

    const getFingerprint = useCallback(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("Scrapi Shield", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("Scrapi Shield", 4, 17);
        const canvasHash = canvas.toDataURL();

        return {
            screen: `${window.screen.width}x${window.screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            languages: navigator.languages,
            cores: navigator.hardwareConcurrency,
            webdriver: navigator.webdriver,
            canvasFingerprint: canvasHash.substring(canvasHash.length - 100), // Last 100 chars as a summary
            ua: navigator.userAgent
        };
    }, []);

    const startShield = useCallback(async () => {
        try {
            setStatus('challenge');
            const startTime = Date.now();

            // 1. Get Challenge from Backend
            const { data } = await axios.get(`${API_URL}/api/auth/challenge`);

            setStatus('solving');

            // 2. Solve Proof-of-Work in Worker
            const worker = new Worker('/pow_worker.js');
            worker.postMessage({ nonce: data.nonce, difficulty: data.difficulty });

            worker.onmessage = (e) => {
                const { solution, duration_ms, error: workerError } = e.data;

                if (workerError) {
                    setError('Security challenge failed to initialize');
                    setStatus('error');
                    return;
                }

                // 3. Prepare Multi-Layered Token
                const fingerprint = {
                    ...getFingerprint(),
                    duration_ms: duration_ms,
                    total_time: Date.now() - startTime
                };

                setStatus('completed');

                // 4. Pass back to parent
                onVerify({
                    nonce: data.nonce,
                    solution: solution,
                    fingerprint: fingerprint
                });

                worker.terminate();
            };

            worker.onerror = (err) => {
                console.error("Shield Worker Error:", err);
                setError('Security shield calculation error');
                setStatus('error');
                worker.terminate();
            };

        } catch (err) {
            console.error("Shield Error:", err);
            setError(err.response?.data?.detail || 'Could not establish secure connection');
            setStatus('error');
        }
    }, [getFingerprint, onVerify]);

    useEffect(() => {
        startShield();
    }, [startShield]);

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-gray-50/50 rounded-xl border border-gray-100 backdrop-blur-sm transition-all duration-300">
            {status === 'error' ? (
                <div className="flex flex-col items-center space-y-2 text-red-600">
                    <ShieldAlert className="w-8 h-8 opacity-80" />
                    <p className="text-sm font-medium">{error}</p>
                    <button
                        onClick={startShield}
                        className="text-xs underline hover:text-red-700 transition-colors"
                    >
                        Retry Security Check
                    </button>
                </div>
            ) : status === 'completed' ? (
                <div className="flex items-center space-x-3 text-emerald-600">
                    <ShieldCheck className="w-6 h-6 animate-pulse" />
                    <span className="text-sm font-medium">Securely verified</span>
                </div>
            ) : (
                <div className="flex flex-col items-center space-y-3">
                    <div className="relative">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 opacity-60" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-blue-100 animate-ping"></div>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-[13px] font-medium text-gray-700">Verifying secure connection...</p>
                        <p className="text-[11px] text-gray-400 mt-1 italic">
                            {status === 'solving' ? 'Solving behavioral puzzle...' : 'Connecting to Enterprise Shield...'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecureShield;
