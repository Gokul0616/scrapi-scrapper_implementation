import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import GlobalModal from './GlobalModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DeleteAccountModal = () => {
    const { user } = useAuth();
    const { isModalOpen, closeModal } = useModal();

    const modalId = 'delete-account';
    const isOpen = isModalOpen(modalId);

    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteFeedbackReason, setDeleteFeedbackReason] = useState('');
    const [deleteFeedbackText, setDeleteFeedbackText] = useState('');
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeletePassword, setShowDeletePassword] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleDeleteAccount = async () => {
        setError(null);
        if (deleteConfirmText !== user?.email) {
            setError('Please type your email correctly to confirm deletion.');
            return;
        }

        if (!deletePassword) {
            setError('Please enter your password to confirm deletion.');
            return;
        }

        setIsDeleting(true);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/settings/account`, {
                headers: { Authorization: `Bearer ${token}` },
                data: {
                    confirmation_text: deleteConfirmText,
                    password: deletePassword,
                    feedback_reason: deleteFeedbackReason || null,
                    feedback_text: deleteFeedbackText || null
                }
            });

            setIsSuccess(true);
            setTimeout(() => {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }, 3000);
        } catch (error) {
            console.error('Failed to delete account:', error);
            setError(error.response?.data?.detail || 'Failed to delete account. Please check your password and try again.');
            setIsDeleting(false);
        }
    };

    const resetForm = () => {
        setDeleteConfirmText('');
        setDeletePassword('');
        setDeleteFeedbackReason('');
        setDeleteFeedbackText('');
        setShowFeedbackForm(false);
        setError(null);
        setIsSuccess(false);
    };

    return (
        <GlobalModal
            modalId={modalId}
            title={isSuccess ? "Success" : "Delete account"}
            size="xs"
            className="bg-background border-border max-h-[85vh]"
            contentClassName="px-0 flex-1 overflow-y-auto scrollbar-thin"
        >
            <div className="px-5 py-4 space-y-4">
                {isSuccess ? (
                    <div className="py-6 text-center space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-center">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-foreground">Account Deletion Scheduled</h3>
                            <p className="text-sm text-muted-foreground px-4">
                                Your account has been scheduled for deletion. You have 7 days to reactivate by simply logging in.
                            </p>
                        </div>
                        <p className="text-xs text-muted-foreground pt-4">Redirecting to login...</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            <div className="space-y-2 text-sm text-foreground">
                                <p>
                                    Do you <span className="font-semibold">really</span> want to{' '}
                                    <span className="font-semibold text-destructive">
                                        delete your account?
                                    </span>
                                </p>

                                <div className="p-3 rounded-lg border bg-muted/50 border-border">
                                    <p className="font-semibold mb-1 text-sm">Grace Period: 7 days</p>
                                    <p className="text-xs text-muted-foreground">Your account will be scheduled for deletion. You'll have 7 days to reactivate by simply logging in.</p>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    All Actors, Actor tasks, schedules, results, datasets, and API keys will be deleted.
                                </p>
                            </div>

                            {/* {error && (
                                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                                    <p className="text-xs text-destructive font-medium leading-tight">{error}</p>
                                </div>
                            )} */}

                            <div className="pt-3 border-t border-border">
                                <button
                                    onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                                    className="text-xs font-medium mb-2 text-primary hover:text-primary/80 flex items-center gap-1"
                                >
                                    {showFeedbackForm ? '▼' : '▶'} Tell us why you're leaving (optional)
                                </button>

                                {showFeedbackForm && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="space-y-2">
                                            {[
                                                { value: 'too_expensive', label: 'Too expensive' },
                                                { value: 'lack_features', label: 'Lack of features I need' },
                                                { value: 'found_alternative', label: 'Found a better alternative' },
                                                { value: 'privacy_concerns', label: 'Privacy concerns' },
                                                { value: 'other', label: 'Other reason' }
                                            ].map((reason) => (
                                                <label key={reason.value} className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        name="feedback_reason"
                                                        value={reason.value}
                                                        checked={deleteFeedbackReason === reason.value}
                                                        onChange={(e) => setDeleteFeedbackReason(e.target.value)}
                                                        className="w-3.5 h-3.5 accent-primary"
                                                    />
                                                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                                                        {reason.label}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                        <Textarea
                                            value={deleteFeedbackText}
                                            onChange={(e) => setDeleteFeedbackText(e.target.value)}
                                            placeholder="Additional feedback (optional)"
                                            className="min-h-[80px] text-xs bg-background border-input text-foreground focus-visible:ring-blue-500/20 focus-visible:border-blue-500"
                                            maxLength={500}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="pt-3 border-t border-border">
                                <label
                                    htmlFor="modal-delete-password-input"
                                    className="block text-xs font-medium mb-1.5 text-foreground"
                                >
                                    Enter your password to confirm
                                </label>
                                <div className="relative">
                                    <Input
                                        id="modal-delete-password-input"
                                        type={showDeletePassword ? 'text' : 'password'}
                                        value={deletePassword}
                                        onChange={(e) => {
                                            setDeletePassword(e.target.value);
                                            if (error) setError(null);
                                        }}
                                        placeholder="Your password"
                                        autoComplete="current-password"
                                        className={`w-full text-sm pr-10 bg-secondary border-input text-foreground focus-visible:ring-blue-500/20 focus-visible:border-blue-500 ${error && 'border-destructive/50'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowDeletePassword(!showDeletePassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-border">
                                <label
                                    htmlFor="modal-delete-confirm-input"
                                    className="block text-xs font-medium mb-1.5 text-foreground"
                                >
                                    Type <span className="font-bold select-none text-foreground">{user?.email}</span> to confirm
                                </label>
                                <Input
                                    id="modal-delete-confirm-input"
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => {
                                        setDeleteConfirmText(e.target.value);
                                        if (error) setError(null);
                                    }}
                                    placeholder=""
                                    autoComplete="off"
                                    className={`w-full text-sm bg-secondary border-input text-foreground focus-visible:ring-blue-500/20 focus-visible:border-blue-500 ${error && 'border-destructive/50'}`}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row-reverse gap-2 pt-2">
                            <Button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmText !== user?.email || !deletePassword || isDeleting}
                                className={`flex-1 sm:flex-none py-2 px-4 h-auto font-bold transition-all ${deleteConfirmText !== user?.email || !deletePassword || isDeleting
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm'
                                    }`}
                            >
                                {isDeleting ? 'Scheduling deletion...' : 'Schedule deletion'}
                            </Button>
                            <Button
                                variant="outline"
                                disabled={isDeleting}
                                onClick={() => {
                                    resetForm();
                                    closeModal();
                                }}
                                className="flex-1 sm:flex-none py-2 px-4 h-auto border-border bg-background text-foreground hover:bg-muted"
                            >
                                Cancel
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </GlobalModal>
    );
};

export default DeleteAccountModal;
