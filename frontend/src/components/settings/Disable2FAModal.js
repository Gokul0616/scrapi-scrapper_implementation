import React, { useState } from 'react';
import { Button } from '../ui/button';
import GlobalModal from '../GlobalModal';
import { useModal } from '../../contexts/ModalContext';
import { safeFetchJSON } from '../../utils/safeFetch';

const Disable2FAModal = ({ modalId = 'disable2FA', onComplete }) => {
  const { isModalOpen, closeModal } = useModal();
  const isOpen = isModalOpen(modalId);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDisable = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const res = await safeFetchJSON(`${process.env.REACT_APP_BACKEND_URL}/api/security/2fa/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        onComplete();
        closeModal();
        setPassword('');
      } else {
        setError(res.data?.detail || 'Failed to disable 2FA. Please check your password.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <GlobalModal modalId={modalId} title="Disable Two-Factor Authentication" size="sm">
      <div className="p-6">
        <p className="text-sm text-muted-foreground mb-4">
          Disabling two-factor authentication will make your account less secure. 
          Please enter your password to confirm.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 text-red-500 text-sm rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-3 justify-end mt-6">
            <Button variant="outline" onClick={closeModal} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleDisable} 
              disabled={!password || isLoading} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? "Disabling..." : "Disable 2FA"}
            </Button>
          </div>
        </div>
      </div>
    </GlobalModal>
  );
};

export default Disable2FAModal;
