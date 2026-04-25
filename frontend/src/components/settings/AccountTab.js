import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import CustomTooltip from '../CustomTooltip';
import { HelpCircle, Upload, Trash2, ExternalLink, Check, Sun, Moon, Monitor } from 'lucide-react';
import { getUserInitials, getProfileColor } from '../../utils/userUtils';
import { useToast } from '../../hooks/use-toast';
import LoadingScreen from '../LoadingScreen';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const initialReadme = `Markdown as an easy way to elevate the **look** and *feel* of your text.

Here are some ideas to get you started:
- ✅ Who I am: freelance scraper architect from [place]
- 🤓 My journey: [X] years of coding; now scraping for fun&business
- 🚀 My triumph: proud creator of [API name]
- ⚒️ My skills: [your tools of the trade]
- 🇬🇧 My languages: fluent in [Duolingo]
- 🤝 Work with me: open for scraping challenges at [email]
- 🌟 Preferred comm method: telepathically, pronouns: [they/them] →`;

const AccountTab = ({ isActive }) => {
  const { theme, setTheme, themePreference, setThemePreference } = useTheme();
  const { user, updateUser } = useAuth();
  const { openModal } = useModal();
  
  const fileInputRef = useRef(null);
  const usernameInputRef = useRef(null);
  const wsRef = useRef(null);
  const usernameTimeoutRef = useRef(null);

  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [readme, setReadme] = useState(initialReadme);
  const [homepageUrl, setHomepageUrl] = useState('');
  const [github, setGithub] = useState('');
  const [twitter, setTwitter] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [discord, setDiscord] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [localThemePreference, setLocalThemePreference] = useState('light');
  const [markdownPreview, setMarkdownPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const { toast } = useToast();

  const [usernameValidation, setUsernameValidation] = useState({
    checking: false,
    valid: false,
    available: false,
    message: ''
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/settings/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = response.data;

        setUsername(data.username || user?.username || '');
        setOriginalUsername(data.username || user?.username || '');
        setFirstName(data.first_name || user?.first_name || '');
        setLastName(data.last_name || user?.last_name || '');
        setBio(data.bio || '');
        setReadme(data.readme || initialReadme);
        setHomepageUrl(data.homepage_url || '');
        setGithub(data.github || '');
        setTwitter(data.twitter || '');
        setLinkedin(data.linkedin || '');
        setDiscord(data.discord || '');
        setIsPublic(data.is_public || false);
        setShowEmail(data.show_email || false);
        setProfilePicture(data.profile_picture || null);

        const backendTheme = data.theme_preference || user?.theme_preference || themePreference || 'light';
        setLocalThemePreference(backendTheme);

      } catch (error) {
        console.error('Failed to load settings:', error);
        if (user) {
          setUsername(user.username || '');
          setOriginalUsername(user.username || '');
          setFirstName(user.first_name || '');
          setLastName(user.last_name || '');
          setLocalThemePreference(user.theme_preference || themePreference || 'light');
        }
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [user, themePreference]);

  useEffect(() => {
    setLocalThemePreference(themePreference);
  }, [themePreference]);

  // Focus username input when on account tab
  useEffect(() => {
    if (isActive && !loading) {
      const focusElement = () => {
        if (usernameInputRef.current) {
          usernameInputRef.current.focus();
          const length = usernameInputRef.current.value.length;
          usernameInputRef.current.setSelectionRange(length, length);
        }
      };
      const timer = setTimeout(focusElement, 50);
      const secondTimer = setTimeout(focusElement, 150);
      return () => {
        clearTimeout(timer);
        clearTimeout(secondTimer);
      };
    }
  }, [isActive, loading]);

  useEffect(() => {
    const wsUrl = API_URL ? API_URL.replace(/^http/, 'ws') + '/api/settings/ws/check-username' : null;

    const connectWs = () => {
      if (!wsUrl) return;
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('Username validation WebSocket connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setUsernameValidation({
              checking: false,
              valid: data.valid || false,
              available: data.available || false,
              message: data.message || ''
            });
          } catch (err) {
            console.error('Failed to parse WS message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('Username validation WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('Username validation WebSocket closed');
          setTimeout(() => {
            if (wsRef.current === ws) connectWs();
          }, 3000);
        };
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
      }
    };

    connectWs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (usernameTimeoutRef.current) {
        clearTimeout(usernameTimeoutRef.current);
      }
    };
  }, []);

  const handleUsernameChange = (e) => {
    const newUsername = e.target.value;
    setUsername(newUsername);

    if (usernameTimeoutRef.current) {
      clearTimeout(usernameTimeoutRef.current);
    }

    if (newUsername === originalUsername) {
      setUsernameValidation({
        checking: false,
        valid: true,
        available: true,
        message: ''
      });
      return;
    }

    if (!newUsername.trim()) {
      setUsernameValidation({
        checking: false,
        valid: false,
        available: false,
        message: ''
      });
      return;
    }

    setUsernameValidation({
      checking: true,
      valid: false,
      available: false,
      message: 'Checking...'
    });

    usernameTimeoutRef.current = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          username: newUsername,
          user_id: user?.id
        }));
      } else {
        console.warn('WebSocket is not open. Unable to check username.');
        setUsernameValidation({
          checking: false,
          valid: false,
          available: false,
          message: 'Connection issue. Please wait or refresh.'
        });
      }
    }, 500);
  };

  const handleSaveUsername = async () => {
    if (username === originalUsername) return;
    if (!usernameValidation.available || usernameValidation.checking) return;

    setSavingUsername(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/settings/username`,
        { username },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOriginalUsername(username);
      if (updateUser) {
        updateUser({ username });
      }

      setUsernameValidation({
        checking: false,
        valid: true,
        available: true,
        message: ''
      });
    } catch (error) {
      console.error('Failed to save username:', error);
      setUsernameValidation({
        checking: false,
        valid: false,
        available: false,
        message: error.response?.data?.detail || 'Failed to save username. Please try again.'
      });
    } finally {
      setSavingUsername(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/settings/profile`, {
        first_name: firstName,
        last_name: lastName,
        bio,
        readme,
        homepage_url: homepageUrl,
        github,
        twitter,
        linkedin,
        discord,
        is_public: isPublic,
        show_email: showEmail,
        theme_preference: localThemePreference
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast({
        title: 'Profile Saved',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast({
        title: 'Failed to Save Profile',
        description: 'Failed to save profile.',
        variant: 'destructive',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleThemeChange = async (newTheme) => {
    setLocalThemePreference(newTheme);
    setThemePreference(newTheme);

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/settings/profile`, {
        theme_preference: newTheme
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (updateUser) {
        updateUser({ theme_preference: newTheme });
      }
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/settings/profile-picture`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const newProfilePicture = response.data.url;
      setProfilePicture(newProfilePicture);

      if (updateUser) {
        await updateUser({ profile_picture: newProfilePicture });
      }

      toast({
        title: 'Success',
        description: 'Profile picture updated successfully.',
      });
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload image.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteImage = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/settings/profile-picture`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfilePicture(null);

      if (updateUser) {
        updateUser({ profile_picture: null });
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/settings/account/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `scrapi-data-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast({
        title: 'Export Started',
        description: 'Your data export is ready and downloading.',
      });
    } catch (error) {
      console.error('Failed to export data:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const userInitials = getUserInitials(user || { username: firstName || username });
  const profileColorValue = getProfileColor(user?.profile_color, theme);

  const OptionalLabel = ({ label, tooltip }) => (
    <div className="flex items-center gap-1.5 mb-2">
      <span className="text-sm font-medium text-foreground">
        {label}
      </span>
      <span className="text-sm text-muted-foreground">(optional)</span>
      {tooltip && (
        <CustomTooltip content={tooltip}>
          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
        </CustomTooltip>
      )}
    </div>
  );

  const ThemeCard = ({ value, label }) => {
    const isSelected = localThemePreference === value;
    const isDarkPreview = value === 'dark';
    const isSystemPreview = value === 'system';

    return (
      <button
        onClick={() => handleThemeChange(value)}
        data-testid={`theme-${value}`}
        className={`relative flex flex-col rounded-lg border-2 transition-all overflow-hidden ${isSelected
          ? 'border-blue-500'
          : 'border-muted hover:border-muted-foreground/30'
          }`}
        style={{ width: '140px' }}
      >
        <div className={`h-20 relative p-2 ${isDarkPreview ? 'bg-[#1a1a1a]' :
          isSystemPreview ? 'bg-gradient-to-r from-gray-100 to-gray-800' :
            'bg-gray-100'
          }`}>
          <div className={`absolute left-1 top-1 bottom-1 w-4 rounded-sm ${isDarkPreview ? 'bg-[#2a2a2a]' :
            isSystemPreview ? 'bg-gray-200/50' :
              'bg-white'
            }`}>
            <div className={`w-2 h-2 mx-auto mt-1 rounded-full ${isDarkPreview ? 'bg-gray-600' : 'bg-gray-300'
              }`}></div>
            <div className={`w-2 h-0.5 mx-auto mt-1 rounded ${isDarkPreview ? 'bg-gray-600' : 'bg-gray-300'
              }`}></div>
            <div className={`w-2 h-0.5 mx-auto mt-0.5 rounded ${isDarkPreview ? 'bg-gray-600' : 'bg-gray-300'
              }`}></div>
          </div>
          <div className={`absolute left-6 right-1 top-1 bottom-1 rounded-sm ${isDarkPreview ? 'bg-[#0f0f10]' :
            isSystemPreview ? 'bg-white/50' :
              'bg-white'
            }`}>
            <div className={`w-8 h-1 mt-2 ml-2 rounded ${isDarkPreview ? 'bg-gray-700' : 'bg-gray-200'
              }`}></div>
            <div className={`w-12 h-1.5 mt-1 ml-2 rounded ${isDarkPreview ? 'bg-gray-800' : 'bg-gray-100'
              }`}></div>
            <div className={`w-10 h-1.5 mt-0.5 ml-2 rounded ${isDarkPreview ? 'bg-gray-800' : 'bg-gray-100'
              }`}></div>
          </div>
          {isSelected && (
            <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>
        <div className="px-3 py-2 text-left bg-card text-card-foreground">
          <span className="text-sm font-medium text-foreground">
            {label}
          </span>
        </div>
      </button>
    );
  };

  if (loading) {
    return <LoadingScreen text="Loading account settings..." />;
  }

  return (
    <div className="mt-0 pt-4 max-w-5xl mx-auto">
      {/* Username Section */}
      <div className="pb-4 border-b border-border">
        <div className="flex gap-8">
          {/* Left Column */}
          <div className="w-40 flex-shrink-0">
            <h2 className="text-base font-semibold mb-1.5 text-foreground">
              Username
            </h2>
            <p className="text-xs text-muted-foreground">
              This might become visible to others, e.g. if you submit an Actor issue.
            </p>
          </div>
          {/* Right Column */}
          <div className="flex-1">
            <div className="flex items-start gap-3">
              <div className="flex-1 max-w-sm">
                <Input
                  ref={usernameInputRef}
                  value={username}
                  onChange={handleUsernameChange}
                  data-testid="username-input"
                  className={`w-full bg-background border-input ${usernameValidation.message && username !== originalUsername
                    ? usernameValidation.available
                      ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                      : 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : ''
                    }`}
                  placeholder=""
                />
                {username !== originalUsername && usernameValidation.message && (
                  <div className={`mt-1.5 text-xs flex items-center gap-1.5 ${usernameValidation.checking
                    ? 'text-muted-foreground'
                    : usernameValidation.available
                      ? 'text-green-600 dark:text-green-500'
                      : 'text-destructive'
                    }`} data-testid="username-validation-message">
                    {usernameValidation.checking ? (
                      <>
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{usernameValidation.message}</span>
                      </>
                    ) : usernameValidation.available ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span>{usernameValidation.message}</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>{usernameValidation.message}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <Button
                onClick={handleSaveUsername}
                disabled={username === originalUsername || savingUsername || !usernameValidation.available || usernameValidation.checking}
                data-testid="save-username-btn"
                variant={username === originalUsername ? "ghost" : "default"}
                className={username === originalUsername
                  ? 'text-muted-foreground/50'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
                }
              >
                {savingUsername ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="py-4 border-b border-border">
        <div className="flex gap-8">
          <div className="w-40 flex-shrink-0">
            <h2 className="text-base font-semibold mb-1.5 text-foreground">
              Profile
            </h2>
            <p className="text-xs mb-3 text-muted-foreground">
              Tell the world a little bit about yourself.
            </p>
            <a
              href="#"
              className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
              data-testid="view-profile-link"
            >
              View your public profile <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <OptionalLabel label="Picture" tooltip="Upload a profile picture. Recommended size: 256x256 pixels." />
              <div className="flex items-center gap-3">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ background: profileColorValue }}
                  >
                    {userInitials}
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="upload-image-btn"
                  className="border-border text-muted-foreground hover:bg-muted"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload new image
                </Button>
                {profilePicture && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteImage}
                    data-testid="delete-image-btn"
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">
                  First name
                </label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  data-testid="first-name-input"
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                  placeholder=""
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm font-medium text-foreground">
                    Last name
                  </span>
                  <span className="text-sm text-muted-foreground">(optional)</span>
                </div>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  data-testid="last-name-input"
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                  placeholder=""
                />
              </div>
            </div>

            <div>
              <OptionalLabel label="Bio" tooltip="A short bio about yourself. Max 200 characters." />
              <Input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                data-testid="bio-input"
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                placeholder=""
                maxLength={200}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <OptionalLabel label="README" tooltip="Write a detailed description using Markdown. Max 2000 characters." />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Markdown preview
                  </span>
                  <Switch
                    checked={markdownPreview}
                    onCheckedChange={setMarkdownPreview}
                    data-testid="markdown-preview-toggle"
                  />
                </div>
              </div>
              <Textarea
                value={readme}
                onChange={(e) => setReadme(e.target.value)}
                data-testid="readme-textarea"
                className="min-h-[200px] scrollbar-hide bg-background border-input text-foreground placeholder:text-muted-foreground"
                placeholder={'add Readme!!!'}
                maxLength={2000}
                style={{
                  msOverflowStyle: 'none',
                  scrollbarWidth: 'none',
                }}
              />
              <div className="text-xs mt-1 text-muted-foreground">
                {readme.length}/2000
              </div>
            </div>

            <div>
              <OptionalLabel label="Homepage URL" tooltip="Your personal website or portfolio." />
              <Input
                value={homepageUrl}
                onChange={(e) => setHomepageUrl(e.target.value)}
                data-testid="homepage-url-input"
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                placeholder=""
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <OptionalLabel label="GitHub" tooltip="Your GitHub username." />
                <Input
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  data-testid="github-input"
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                  placeholder=""
                />
              </div>
              <div>
                <OptionalLabel label="Twitter/X username" tooltip="Your Twitter/X username without the @ symbol." />
                <Input
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  data-testid="twitter-input"
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                  placeholder=""
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <OptionalLabel label="LinkedIn URL" tooltip="Your LinkedIn profile URL." />
                <Input
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  data-testid="linkedin-input"
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                  placeholder=""
                />
              </div>
              <div>
                <OptionalLabel label="Discord user ID" tooltip="Your Discord user ID (18-19 digits). Right-click your username in Discord to copy." />
                <Input
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  data-testid="discord-input"
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                  placeholder=""
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground">
                    Make profile publicly visible
                  </span>
                  <CustomTooltip content="Allow others to see your profile.">
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </CustomTooltip>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                  data-testid="public-profile-toggle"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-medium ${isPublic ? 'text-foreground' : 'text-muted-foreground'}`}>
                    Show my contact email
                  </span>
                  <CustomTooltip content="Display your email on your public profile.">
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </CustomTooltip>
                </div>
                <Switch
                  checked={showEmail}
                  onCheckedChange={setShowEmail}
                  disabled={!isPublic}
                  data-testid="show-email-toggle"
                />
              </div>
            </div>

            <div className="pt-3">
              <Button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                data-testid="save-profile-btn"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {savingProfile ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="py-4 border-b border-border">
        <div className="flex gap-8">
          <div className="w-40 flex-shrink-0">
            <h2 className="text-base font-semibold mb-1.5 text-foreground">
              Theme
            </h2>
            <p className="text-xs text-muted-foreground">
              Choose how Scrapi Console looks to you.
            </p>
          </div>
          <div className="flex-1">
            <div className="flex gap-4">
              <ThemeCard
                value="system"
                label="Sync with system"
              />
              <ThemeCard
                value="light"
                label="Light theme"
              />
              <ThemeCard
                value="dark"
                label="Dark theme"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="py-4">
        <div className="flex gap-8">
          <div className="w-40 flex-shrink-0">
            <h2 className="text-base font-semibold mb-1.5 text-red-500">
              Danger zone
            </h2>
          </div>
          <div className="flex-1">
            <div className="mb-3">
              <Button
                onClick={handleExportData}
                disabled={isExporting}
                variant="outline"
                data-testid="export-data-btn"
                className="border-border text-muted-foreground hover:bg-muted"
              >
                {isExporting ? 'Exporting...' : '📥 Export My Data'}
              </Button>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Download all your data before deletion (actors, runs, datasets, etc.)
              </p>
            </div>
            <Button
              variant="outline"
              data-testid="delete-account-btn"
              onClick={() => openModal('delete-account')}
              className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive bg-transparent"
            >
              Delete account
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Completely remove your account, Actors, tasks, schedules, data, everything. This is sad 😢
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountTab;
