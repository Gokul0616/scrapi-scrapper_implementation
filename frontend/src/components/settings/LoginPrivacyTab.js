import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Key, Shield, HelpCircle, ChevronRight,
  Globe, Hand, Github, Check, X, AlertCircle, Loader2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import ActionButton from '../ui/ActionButton';
import CustomDropdown from '../CustomDropdown';
import SpinnerInput from '../ui/SpinnerInput';
import TwoFactorSetupModal from './TwoFactorSetupModal';
import Disable2FAModal from './Disable2FAModal';
import { safeFetchJSON } from '../../utils/safeFetch';
import { useModal } from '../../contexts/ModalContext';
import { useMessage } from '../../contexts/MessageContext';
import CustomTooltip from '../CustomTooltip';

const SettingsRow = ({ title, description, children, learnMoreUrl }) => (
  <div className="py-5 border-b border-border flex flex-col md:flex-row gap-x-8 gap-y-3">
    <div className="md:w-[260px] shrink-0">
      <h3 className="text-[15px] font-bold text-foreground">{title}</h3>
      <p className="text-[14px] text-muted-foreground/90 mt-1 leading-[1.5]">
        {description}
        {learnMoreUrl && (
          <>
            <br />
            <a href={learnMoreUrl} className="text-blue-500 hover:underline">
              Learn more
            </a>
          </>
        )}
      </p>
    </div>
    <div className="flex-1 max-w-2xl">
      {children}
    </div>
  </div>
);

// Custom Google Icon SVG
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const LoginPrivacyTab = () => {
  const [resourceAccess, setResourceAccess] = useState('anyone');
  const [actorApproval, setActorApproval] = useState('require');
  const [showSessions, setShowSessions] = useState(false);
  const [sessionExpiration, setSessionExpiration] = useState(90);
  const [sessions, setSessions] = useState([]);
  const [currentJti, setCurrentJti] = useState(null);
  const { openModal } = useModal();
  const { showMessage } = useMessage();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [profileEmail, setProfileEmail] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [hasGoogle, setHasGoogle] = useState(false);
  const [hasGithub, setHasGithub] = useState(false);
  const [authProvider, setAuthProvider] = useState('email');
  const [isSaving, setIsSaving] = useState(false);
  const [originalEmail, setOriginalEmail] = useState('');
  const { user } = useAuth();

  const [emailValidation, setEmailValidation] = useState({
    checking: false,
    valid: false,
    available: false,
    disposable: false,
    message: ''
  });

  const emailWsRef = useRef(null);
  const emailTimeoutRef = useRef(null);

  useEffect(() => {
    fetchSessions();
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await safeFetchJSON(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'}/api/settings/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok && res.data) {
        setProfileEmail(res.data.email || '');
        setHasPassword(res.data.has_password || false);
        setHasGoogle(res.data.has_google || false);
        setHasGithub(res.data.has_github || false);
        setAuthProvider(res.data.auth_provider || 'email');
        setSessionExpiration(res.data.session_expiration_days || 90);
        if (res.data.resource_access_level) setResourceAccess(res.data.resource_access_level);
        if (res.data.require_actor_approval) setActorApproval(res.data.require_actor_approval);

        setOriginalEmail(res.data.email || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // WebSocket for real-time email check
  useEffect(() => {
    const wsUrl = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001').replace(/^http/, 'ws') + '/api/settings/ws/check-email';

    const connectWs = () => {
      try {
        const ws = new WebSocket(wsUrl);
        emailWsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setEmailValidation({
              checking: false,
              valid: data.valid || false,
              available: data.available || false,
              disposable: data.disposable || false,
              message: data.message || ''
            });
          } catch (err) {
            console.error('Failed to parse email WS message:', err);
          }
        };

        ws.onclose = () => {
          setTimeout(() => {
            if (emailWsRef.current === ws) connectWs();
          }, 3000);
        };
      } catch (err) {
        console.error('Failed to create email WebSocket:', err);
      }
    };

    connectWs();

    return () => {
      if (emailWsRef.current) {
        emailWsRef.current.close();
        emailWsRef.current = null;
      }
      if (emailTimeoutRef.current) {
        clearTimeout(emailTimeoutRef.current);
      }
    };
  }, []);

  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setProfileEmail(newEmail);

    if (emailTimeoutRef.current) {
      clearTimeout(emailTimeoutRef.current);
    }

    if (newEmail === originalEmail) {
      setEmailValidation({
        checking: false,
        valid: true,
        available: true,
        disposable: false,
        message: ''
      });
      return;
    }

    if (!newEmail.trim()) {
      setEmailValidation({
        checking: false,
        valid: false,
        available: false,
        disposable: false,
        message: ''
      });
      return;
    }

    setEmailValidation(prev => ({
      ...prev,
      checking: true,
      message: 'Checking...'
    }));

    emailTimeoutRef.current = setTimeout(() => {
      if (emailWsRef.current && emailWsRef.current.readyState === WebSocket.OPEN) {
        emailWsRef.current.send(JSON.stringify({
          email: newEmail,
          user_id: user?.id
        }));
      }
    }, 600);
  };

  const handleDisconnect = async (provider) => {
    try {
      const token = localStorage.getItem('token');
      const res = await safeFetchJSON(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'}/api/settings/connections/${provider}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showMessage(`Successfully disconnected ${provider}.`, 'success');
        fetchProfile(); // Refresh profile after disconnect
      } else {
        showMessage(res.data?.detail || `Failed to disconnect ${provider}.`, 'error');
      }
    } catch (e) {
      console.error(e);
      showMessage("Network error occurred.", 'error');
    }
  };

  const handleConnect = async (provider) => {
    try {
      const token = localStorage.getItem('token');
      const res = await safeFetchJSON(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'}/api/auth/${provider}/url`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok && res.data.url) {
        window.location.href = res.data.url;
      } else {
        showMessage(`Failed to get connection URL for ${provider}.`, 'error');
      }
    } catch (e) {
      console.error(e);
      showMessage("Network error occurred.", 'error');
    }
  };

  const handleSaveSessionSettings = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await safeFetchJSON(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'}/api/settings/profile`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          session_expiration_days: parseInt(sessionExpiration)
        })
      });
      if (res.ok) {
        showMessage("Session expiration updated successfully.", 'success');
      } else {
        showMessage(res.error || "Failed to update session expiration.", 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    const toastId = "reset-password-toast";
    try {
      showMessage("Sending reset email...", 'loading', 0, toastId);
      const token = localStorage.getItem('token');
      const res = await safeFetchJSON(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: profileEmail })
      });
      if (res.ok) {
        showMessage(res.data.message || "Reset link sent to your email!", 'success', 5000, toastId);
      } else {
        showMessage(res.error || "Failed to send reset email.", 'error', 5000, toastId);
      }
    } catch (e) {
      console.error(e);
      showMessage("An error occurred. Please try again.", 'error', 5000, toastId);
    }
  };

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await safeFetchJSON(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'}/api/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok && res.data && Array.isArray(res.data.sessions)) {
        setSessions(res.data.sessions);
        setCurrentJti(res.data.current_jti);
      } else {
        console.warn('Failed to fetch sessions or invalid format:', res);
        setSessions([]); // Fallback to empty
      }
    } catch (e) {
      console.error('Error in fetchSessions:', e);
      setSessions([]);
    }
  };

  const handleUpdateProfile = async (data) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await safeFetchJSON(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'}/api/settings/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        showMessage("Profile updated successfully.", 'success');
        fetchProfile();
      } else {
        showMessage(res.error || "Failed to update profile.", 'error');
      }
    } catch (e) {
      console.error(e);
      showMessage("An error occurred.", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const revokeSession = async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await safeFetchJSON(`${process.env.REACT_APP_BACKEND_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSessions(sessions.filter(s => s._id !== sessionId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const savePreferences = async (preferences) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await safeFetchJSON(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'}/api/settings/security-preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });
      if (res.ok) {
        showMessage("Preferences updated successfully.", 'success');
      } else {
        showMessage(res.data?.detail || "Failed to save preferences.", 'error');
      }
    } catch (e) {
      console.error(e);
      showMessage("Network error occurred.", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const resourceOptions = [
    { value: 'restricted', label: 'Restricted', description: 'Only signed-in users with explicit access can read your resources.' },
    { value: 'anyone', label: 'Anyone with ID can read', description: 'Anyone with a link, or the unique resource ID, can read your resources.' }
  ];

  const approvalOptions = [
    { value: 'require', label: 'Require approval before first run', description: 'You will have to approve full-permission Actors in Apify Console. This also applies when calling Actors via API, CLI or MCP.' },
    { value: 'skip', label: 'Skip approval', description: 'Full-permission Actors will run without explicit approval.' }
  ];

  return (
    <>
      <div className="mt-0 pt-2 pb-12 w-full">

        {/* Email Section */}
        <SettingsRow
          title="Email"
          description="Used for login and transactional messages."
        >
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative w-full sm:w-[300px]">
                <input
                  type="email"
                  value={profileEmail}
                  onChange={handleEmailChange}
                  className={`w-full h-[34px] px-3 bg-card border rounded-md text-[14px] text-foreground focus:outline-none focus:ring-2 transition-all ${profileEmail !== originalEmail && emailValidation.message
                      ? emailValidation.available && emailValidation.valid
                        ? 'border-green-500/50 focus:ring-green-500/10'
                        : 'border-red-500/50 focus:ring-red-500/10'
                      : 'border-border focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                  placeholder="your-email@example.com"
                />
                {emailValidation.checking && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                  </div>
                )}
              </div>
              <ActionButton
                label="Save"
                onClick={() => handleUpdateProfile({ email: profileEmail })}
                variant="default"
                disabled={isSaving || (profileEmail !== originalEmail && (!emailValidation.available || !emailValidation.valid))}
              />
            </div>

            {profileEmail !== originalEmail && emailValidation.message && (
              <div className={`text-[12px] flex items-center gap-1.5 px-1 animate-in fade-in slide-in-from-top-1 duration-200 ${emailValidation.checking
                  ? 'text-muted-foreground'
                  : emailValidation.available && emailValidation.valid
                    ? 'text-green-600 dark:text-green-500'
                    : 'text-destructive'
                }`}>
                {!emailValidation.checking && (
                  emailValidation.available && emailValidation.valid ? (
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )
                )}
                <span>{emailValidation.message}</span>
                {emailValidation.disposable && (
                  <CustomTooltip content="We do not accept temporary or disposable email addresses to prevent abuse. Please use a permanent email provider like Gmail, Outlook, or your company email.">
                    <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                  </CustomTooltip>
                )}
              </div>
            )}
          </div>
        </SettingsRow>

        {/* Login Section */}
        <SettingsRow
          title="Login"
          description="Sign in using any of the available methods."
        >
          <div className="flex flex-col space-y-6">
            {/* Password */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-accent/30">
              <div className="flex-1">
                <h4 className="text-[14px] font-bold text-foreground">Password</h4>
                <p className="text-[13px] text-muted-foreground/90 mt-0.5">
                  {hasPassword ? 'Password is set' : 'No password set'}
                </p>
              </div>
              <ActionButton
                label={hasPassword ? "Reset password" : "Set password"}
                onClick={handleResetPassword}
              />
            </div>

            {/* Google */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="mt-0.5">
                  <GoogleIcon />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-foreground leading-tight">Google</p>
                  {hasGoogle && <p className="text-[14px] text-muted-foreground/90 mt-0.5">{profileEmail}</p>}
                </div>
              </div>
              {hasGoogle ? (
                <ActionButton label="Disconnect" variant="danger" onClick={() => handleDisconnect('google')} />
              ) : (
                <ActionButton label="Connect" onClick={() => handleConnect('google')} />
              )}
            </div>

            {/* GitHub */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="mt-0.5">
                  <Github className="w-5 h-5 text-foreground" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-foreground leading-tight">GitHub</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasGithub ? (
                  <>
                    <ActionButton label="Manage on GitHub" />
                    <ActionButton label="Disconnect" variant="danger" onClick={() => handleDisconnect('github')} />
                  </>
                ) : (
                  <ActionButton label="Connect" onClick={() => handleConnect('github')} />
                )}
              </div>
            </div>
          </div>
        </SettingsRow>

        {/* Two-factor authentication */}
        <SettingsRow
          title="Two-factor authentication"
          description="Add an additional layer of security to your account by requiring more than just a password to sign in."
          learnMoreUrl="#"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="mt-0.5">
                <Shield className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[15px] font-bold text-foreground leading-tight">Authenticator app</p>
                <p className="text-[14px] text-muted-foreground/90 max-w-sm mt-1 leading-[1.5]">
                  Use an authentication app or browser extension to get two-factor authentication codes.
                </p>
              </div>
            </div>
            {is2FAEnabled ? (
              <div className="flex gap-2">
                <span className="text-sm font-bold text-green-500 my-auto mr-2">Enabled</span>
                <ActionButton label="Disable" variant="danger" onClick={() => openModal('disable2FA')} />
              </div>
            ) : (
              <ActionButton label="Enable" className="px-4" onClick={() => openModal('twoFactorSetup')} />
            )}
          </div>
        </SettingsRow>

        {/* Session */}
        <SettingsRow
          title="Session"
          description="Adjust settings to align with your security policy."
        >
          <div className="flex flex-col space-y-6">
            <div>
              <div className="flex items-center mb-1.5">
                <label className="text-[14px] font-semibold text-foreground flex items-center gap-1.5">
                  Session expiration
                  <HelpCircle className="w-[14px] h-[14px] text-muted-foreground" />
                </label>
              </div>
              <div className="flex gap-3 items-center">
                <div className="w-[240px]">
                  <SpinnerInput
                    value={sessionExpiration}
                    onChange={setSessionExpiration}
                    suffix="days"
                    className="w-full h-[36px]"
                    inputClassName="flex-1 pl-3 text-left"
                    max={90}
                  />
                </div>
                <Button
                  onClick={() => savePreferences({ session_expiration_days: sessionExpiration })}
                  disabled={isSaving}
                  className="h-[36px] bg-blue-600 hover:bg-blue-700 text-white px-4 text-[14px] shrink-0 rounded-md shadow-sm font-medium"
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            <div>
              <button
                onClick={() => setShowSessions(!showSessions)}
                className="text-[15px] font-bold text-foreground flex items-center gap-2 hover:text-blue-600 transition-colors"
              >
                Active sessions
                <span className="bg-blue-100/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[12px] px-2 py-0.5 rounded-full font-medium">
                  {sessions.length}
                </span>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showSessions ? 'rotate-90' : ''}`} />
              </button>

              {showSessions && (
                <div className="mt-4 border border-border rounded-lg overflow-hidden divide-y divide-border/50 max-w-2xl bg-card">
                  {sessions.map((session) => (
                    <div key={session._id} className={`p-4 flex items-center justify-between gap-4 transition-colors ${session.jti === currentJti ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'hover:bg-muted/30'}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-bold text-foreground">
                            {session.browser} on {session.os}
                          </p>
                          {session.jti === currentJti ? (
                            <span className="bg-blue-100 text-blue-700 text-[11px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              Current
                            </span>
                          ) : (
                            <span className="bg-green-100 text-green-700 text-[11px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-muted-foreground/90 mt-1">
                          {session.location} • {session.ip_address}
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                          Last active: {new Date(session.last_active_at).toLocaleString()}
                        </p>
                      </div>
                      <ActionButton
                        label="Revoke"
                        variant="danger"
                        onClick={() => revokeSession(session._id)}
                        disabled={session.jti === currentJti}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SettingsRow>

        {/* General resource access */}
        <SettingsRow
          title="General resource access"
          description="Configure how other users can access your storages, builds, and runs."
          learnMoreUrl="#"
        >
          <div className="flex flex-col">
            <div className="flex gap-3">
              <div className="flex items-center gap-4 flex-1">
                <Globe className="w-5 h-5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                <div className="w-[320px]">
                  <CustomDropdown
                    value={resourceAccess}
                    onChange={setResourceAccess}
                    options={resourceOptions}
                    variant="apify"
                  />
                </div>
              </div>
              <Button
                onClick={() => savePreferences({ resource_access_level: resourceAccess })}
                disabled={isSaving}
                className="px-4 h-[36px] bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-[14px] font-medium"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
            <div className="ml-9 mt-2">
              <p className="text-[14px] text-muted-foreground/90">
                {resourceOptions.find(o => o.value === resourceAccess)?.description}
              </p>
            </div>
          </div>
        </SettingsRow>

        {/* Full-permissions Actors approval */}
        <SettingsRow
          title="Full-permissions Actors approval"
          description="Full-permissions Actors have read and write access to all your account data, which is why we ask you to approve them first. You can choose to opt out from this behavior."
          learnMoreUrl="#"
        >
          <div className="flex items-start gap-3 justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className="mt-1">
                <Hand className="w-5 h-5 text-muted-foreground shrink-0" strokeWidth={1.5} />
              </div>
              <div className="flex-1 max-w-[320px]">
                <div className="mb-2">
                  <CustomDropdown
                    value={actorApproval}
                    onChange={setActorApproval}
                    options={approvalOptions}
                    variant="apify"
                  />
                </div>
                <p className="text-[14px] text-muted-foreground/90 leading-[1.5]">
                  {approvalOptions.find(o => o.value === actorApproval)?.description}
                </p>
              </div>
            </div>
            <Button
              onClick={() => savePreferences({ require_actor_approval: actorApproval })}
              disabled={isSaving}
              className="h-[36px] bg-blue-600 hover:bg-blue-700 text-white px-4 text-[14px] shrink-0 rounded-md shadow-sm font-medium"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </SettingsRow>

        {/* Share run data with developers */}
        {/* 
      <div className="py-5 flex flex-col md:flex-row gap-x-8 gap-y-3">
        <div className="md:w-[260px] shrink-0">
          <h3 className="text-[15px] font-bold text-foreground">Share run data with developers</h3>
          <p className="text-[14px] text-muted-foreground/90 mt-1 leading-[1.5]">
            Sharing this data helps developers fix issues and ensure better performance.
          </p>
        </div>
        
        <div className="flex-1 max-w-2xl">
          <p className="text-[15px] font-bold text-foreground mb-1">Manage list of Actors</p>
          <p className="text-[14px] text-muted-foreground/90 mb-5 leading-[1.5]">
            Choose the Actors for which you agree to share the runs solely for debugging purposes. By giving consent, you are agreeing to share all past and future runs with the developer of the Actor.
          </p>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 rounded border-border text-blue-600 focus:ring-blue-500 focus:ring-offset-0 bg-transparent" />
              <span className="text-[15px] font-bold text-foreground">All Actors</span>
            </label>
            
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-border text-blue-600 focus:ring-blue-500 focus:ring-offset-0 bg-transparent mt-0.5" />
              <div>
                <span className="text-[15px] font-bold text-foreground">Google Maps Extractor</span>
                <a href="#" className="block text-[14px] text-blue-600 hover:underline mt-0.5">compass/google-maps-extractor ↗</a>
              </div>
            </label>
            
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 rounded border-border text-blue-600 focus:ring-blue-500 focus:ring-offset-0 bg-transparent mt-0.5" />
              <div>
                <span className="text-[15px] font-bold text-foreground">Google Maps Scraper</span>
                <a href="#" className="block text-[14px] text-blue-600 hover:underline mt-0.5">boztek-ltd/google-maps-scraper ↗</a>
              </div>
            </label>
          </div>
        </div>
      </div>
      */}

      </div>

      <TwoFactorSetupModal
        onComplete={() => setIs2FAEnabled(true)}
      />
      <Disable2FAModal
        onComplete={() => setIs2FAEnabled(false)}
      />
    </>
  );
};

export default LoginPrivacyTab;
