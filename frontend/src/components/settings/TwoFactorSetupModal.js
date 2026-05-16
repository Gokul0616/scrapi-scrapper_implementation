import React, { useState, useEffect } from 'react';
import { CheckCircle, Copy, Download } from 'lucide-react';
import { Button } from '../ui/button';
import GlobalModal from '../GlobalModal';
import { useModal } from '../../contexts/ModalContext';
import LoadingScreen from '../LoadingScreen';

const TwoFactorSetupModal = ({ modalId = 'twoFactorSetup', onComplete }) => {
  const { isModalOpen, closeModal } = useModal();
  const isOpen = isModalOpen(modalId);
  const [step, setStep] = useState(1);
  const [qrUri, setQrUri] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (step === 1) {
        setup2FA();
      }
    } else {
      // Reset state when modal is closed
      setStep(1);
      setToken('');
      setError('');
      setRecoveryCodes([]);
    }
  }, [isOpen]);

  const setup2FA = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/security/2fa/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setQrUri(data.uri);
      } else {
        setError(data.detail || 'Failed to setup 2FA');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const verify2FA = async () => {
    try {
      setIsLoading(true);
      setError('');
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/security/2fa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (res.ok) {
        setRecoveryCodes(data.recovery_codes);
        setStep(2);
      } else {
        setError(data.detail || 'Invalid code');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const copyCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
  };

  const downloadCodes = () => {
    const element = document.createElement("a");
    const file = new Blob([recoveryCodes.join('\n')], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "scrapi-recovery-codes.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!isOpen) return null;

  return (
    <GlobalModal modalId={modalId} title="Set up Two-Factor Authentication" size="md">
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 text-red-500 text-sm rounded-md">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 flex flex-col items-center text-center">
              <p className="text-sm text-muted-foreground">
                Scan this QR code with Google Authenticator, Authy, or your preferred 2FA app.
              </p>
              
              {isLoading ? (
                <div className="w-48 h-48 flex items-center justify-center bg-muted rounded-md border border-border">
                  <LoadingScreen text={qrUri ? "Verifying..." : "Generating..."} className="w-full h-full" />
                </div>
              ) : (
                <div className="p-2 bg-white rounded-md border border-gray-200">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`} alt="QR Code" width={200} height={200} />
                </div>
              )}

              <div className="w-full mt-4 text-left">
                <label className="text-sm font-semibold mb-1 block">What code appears in your authenticator app?</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    maxLength={6}
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono tracking-widest text-center"
                  />
                  <Button onClick={verify2FA} disabled={token.length !== 6 || isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Verify
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 flex flex-col items-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <h3 className="text-lg font-bold text-foreground">2FA is now enabled!</h3>
              <p className="text-sm text-muted-foreground text-center">
                Save these recovery codes in a secure place. If you lose your device, these are the ONLY way to access your account.
              </p>

              <div className="w-full bg-muted p-4 rounded-md border border-border mt-2 grid grid-cols-2 gap-2 text-sm font-mono text-center">
                {recoveryCodes.map((code, idx) => (
                  <div key={idx} className="text-foreground">{code}</div>
                ))}
              </div>

              <div className="flex gap-3 w-full mt-4">
                <Button variant="outline" onClick={copyCodes} className="flex-1 flex items-center justify-center gap-2">
                  <Copy className="w-4 h-4" /> Copy
                </Button>
                <Button variant="outline" onClick={downloadCodes} className="flex-1 flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Download
                </Button>
              </div>

              <Button onClick={() => { onComplete(); closeModal(); }} className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white">
                I've safely saved these codes
              </Button>
            </div>
          )}
        </div>
    </GlobalModal>
  );
};

export default TwoFactorSetupModal;
