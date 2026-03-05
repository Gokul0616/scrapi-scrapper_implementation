import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const CaptchaChallenge = ({ onVerify, email, autoVerify = true }) => {
    const [captchaData, setCaptchaData] = useState(null);
    const [answer, setAnswer] = useState('');
    const [error, setError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const fetchCaptcha = useCallback(async () => {
        setIsLoading(true);
        setError('');
        setAnswer('');
        try {
            const response = await axios.get(`${API_URL}/api/auth/captcha`);
            setCaptchaData(response.data);
        } catch (err) {
            setError('Failed to load CAPTCHA. Please refresh.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCaptcha();
    }, [fetchCaptcha]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!answer.trim()) return;

        if (!autoVerify) {
            // Skip server-side verification here, let parent handle it
            onVerify(captchaData.captcha_id, answer.trim());
            return;
        }

        setIsVerifying(true);
        setError('');
        try {
            // Use the email if provided to track attempts
            const response = await axios.post(`${API_URL}/api/auth/verify-captcha`, {
                captcha_id: captchaData.captcha_id,
                answer: answer.trim(),
                email: email
            });

            if (response.data.success) {
                onVerify(captchaData.captcha_id, answer.trim());
            }
        } catch (err) {
            let msg = 'Invalid CAPTCHA answer. Try again.';
            if (err.response?.data?.detail) {
                msg = typeof err.response.data.detail === 'string'
                    ? err.response.data.detail
                    : 'Validation error. Please check your input.';
            }
            setError(msg);
            // Refresh CAPTCHA on failure
            fetchCaptcha();
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-[13px] font-medium text-gray-700 mb-3 flex items-center">
                    <ShieldCheck className="w-4 h-4 mr-1.5 text-blue-600" />
                    Security Verification
                </p>

                {captchaData ? (
                    <div className="relative group">
                        <img
                            src={`data:image/png;base64,${captchaData.image}`}
                            alt="CAPTCHA Challenge"
                            className="h-[60px] rounded-md border border-gray-300 shadow-sm"
                        />
                        <button
                            onClick={fetchCaptcha}
                            disabled={isLoading}
                            className="absolute -right-10 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-900 transition-colors bg-white rounded-full border border-gray-200 shadow-sm"
                            title="Refresh CAPTCHA"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                ) : (
                    <div className="h-[60px] w-full flex items-center justify-center bg-gray-100 animate-pulse rounded-md">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <label htmlFor="captcha_input" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                        Enter the characters above
                    </label>
                    <Input
                        id="captcha_input"
                        type="text"
                        placeholder="Type CAPTCHA"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value.toUpperCase())}
                        className={`w-full h-[38px] text-[14px] rounded-md text-center tracking-widest font-bold ${error ? 'border-red-500' : 'border-gray-300'}`}
                        autoComplete="off"
                        autoFocus
                    />
                    {error && (
                        <p className="mt-1.5 text-[12px] text-red-600 flex items-center justify-center">
                            <AlertCircle className="w-3.5 h-3.5 mr-1" />
                            {error}
                        </p>
                    )}
                </div>

                <Button
                    type="submit"
                    disabled={!answer.trim() || isVerifying || isLoading}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white h-[38px] text-[14px] font-medium rounded-md"
                >
                    {isVerifying ? 'Verifying...' : 'Verify & Continue'}
                </Button>
            </form>
        </div>
    );
};

export default CaptchaChallenge;
