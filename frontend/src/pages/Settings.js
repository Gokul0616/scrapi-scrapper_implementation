import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useModal } from '../contexts/ModalContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { HelpCircle, Upload, Trash2, ExternalLink, Check, Sun, Moon, Monitor, Eye, EyeOff, Building2, Plus, User, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { getUserInitials, getProfileColor, getUserDisplayName } from '../utils/userUtils';
import AlertModal from '../components/AlertModal';
import ApiIntegrations from '../components/ApiIntegrations';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Settings = () => {
  const { theme, setTheme, themePreference, setThemePreference } = useTheme();
  const { user, updateUser } = useAuth();
  const { openModal } = useModal();
  const { workspaces, refreshWorkspaces } = useWorkspace();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  const tabRefs = useRef({});
  const tabsListRef = useRef(null);
  const initialReadme = `Markdown as an easy way to elevate the **look** and *feel* of your text.

Here are some ideas to get you started:
- ✅ Who I am: freelance scraper architect from [place]
- 🤓 My journey: [X] years of coding; now scraping for fun&business
- 🚀 My triumph: proud creator of [API name]
- ⚒️ My skills: [your tools of the trade]
- 🇬🇧 My languages: fluent in [Duolingo]
- 🤝 Work with me: open for scraping challenges at [email]
- 🌟 Preferred comm method: telepathically, pronouns: [they/them] →`

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
  const [isPublic, setIsPublic] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [localThemePreference, setLocalThemePreference] = useState('light');
  const [markdownPreview, setMarkdownPreview] = useState(false);

  // Read tab from URL query parameter, default to 'account'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'account');
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });


  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteFeedbackReason, setDeleteFeedbackReason] = useState('');
  const [deleteFeedbackText, setDeleteFeedbackText] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [showDeleteSuccessAlert, setShowDeleteSuccessAlert] = useState(false);


  const [savingUsername, setSavingUsername] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);


  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info'
  });


  const [usernameValidation, setUsernameValidation] = useState({
    checking: false,
    valid: false,
    available: false,
    message: ''
  });
  const wsRef = useRef(null);
  const usernameTimeoutRef = useRef(null);


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
  }, [user]);


  useEffect(() => {
    setLocalThemePreference(themePreference);
  }, [themePreference]);

  // Handle tab parameter from URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);


  useEffect(() => {

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/settings/ws/check-username`;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          setUsernameValidation({
            checking: false,
            valid: data.valid || false,
            available: data.available || false,
            message: data.message || ''
          });
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setUsernameValidation(prev => ({
            ...prev,
            checking: false
          }));
        };

        ws.onclose = () => {
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
      }
    };

    connectWebSocket();


    return () => {
      if (wsRef.current) {
        wsRef.current.close();
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
        setUsernameValidation({
          checking: false,
          valid: false,
          available: false,
          message: 'Connection error. Please try again.'
        });
      }
    }, 500);
  };


  useEffect(() => {
    const updateUnderlinePosition = () => {
      const activeTabElement = tabRefs.current[activeTab];
      const tabsListElement = tabsListRef.current;

      if (activeTabElement && tabsListElement) {
        const tabsListRect = tabsListElement.getBoundingClientRect();
        const activeTabRect = activeTabElement.getBoundingClientRect();

        setUnderlineStyle({
          left: activeTabRect.left - tabsListRect.left,
          width: activeTabRect.width
        });
      }
    };


    const timer = setTimeout(updateUnderlinePosition, 50);


    window.addEventListener('resize', updateUnderlinePosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateUnderlinePosition);
    };
  }, [activeTab, theme, loading]);

  const handleSaveUsername = async () => {
    if (username === originalUsername) return;


    if (!usernameValidation.available || usernameValidation.checking) {
      return;
    }

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


      if (updateUser) {
        updateUser({
          first_name: firstName,
          last_name: lastName,
          theme_preference: localThemePreference
        });
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      setAlertConfig({
        title: 'Failed to Save Profile',
        message: 'Failed to save profile.',
        type: 'error'
      });
      setShowAlert(true);
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


      setTimeout(() => {

        window.dispatchEvent(new CustomEvent('profilePictureUpdated', {
          detail: { profile_picture: newProfilePicture }
        }));
      }, 100);

    } catch (error) {
      console.error('Failed to upload image:', error);
      setAlertConfig({
        title: 'Upload Failed',
        message: 'Failed to upload image.',
        type: 'error'
      });
      setShowAlert(true);
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== user?.email) {
      setAlertConfig({
        title: 'Confirmation Required',
        message: 'Please type your email correctly to confirm deletion.',
        type: 'warning'
      });
      setShowAlert(true);
      return;
    }

    if (!deletePassword) {
      setAlertConfig({
        title: 'Password Required',
        message: 'Please enter your password to confirm deletion.',
        type: 'warning'
      });
      setShowAlert(true);
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


      setShowDeleteSuccessAlert(true);


      setTimeout(() => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }, 3000);
    } catch (error) {
      console.error('Failed to delete account:', error);
      setAlertConfig({
        title: 'Deletion Failed',
        message: error.response?.data?.detail || 'Failed to delete account.',
        type: 'error'
      });
      setShowAlert(true);
      setIsDeleting(false);
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
    } catch (error) {
      console.error('Failed to export data:', error);
      setAlertConfig({
        title: 'Export Failed',
        message: 'Failed to export data. Please try again.',
        type: 'error'
      });
      setShowAlert(true);
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-popover text-popover-foreground">
              <p className="text-xs max-w-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
    return (
      <div className="flex-1 p-8 bg-background">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-muted rounded mb-6"></div>
          <div className="h-10 w-full max-w-xl bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>
      <div className="flex-1 min-h-screen bg-background" data-testid="settings-page">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground" data-testid="settings-title">
              Settings
            </h1>
            <Button
              variant="outline"
              size="sm"
              data-testid="api-button"
              className="border-border text-muted-foreground hover:bg-muted"
            >
              API
            </Button>
          </div>


          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="relative">
              <TabsList
                ref={tabsListRef}
                style={{ backgroundColor: 'transparent !important' }}
                className="w-full justify-start border-b rounded-none h-auto p-0 !bg-transparent border-border"
              >
                {[
                  { value: 'account', label: 'Account' },
                  { value: 'login-privacy', label: 'Login & Privacy' },
                  { value: 'api-integrations', label: 'API & Integrations' },
                  { value: 'organizations', label: 'Organizations' },
                  { value: 'notifications', label: 'Notifications' },
                  { value: 'referrals', label: 'Referrals' }
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    ref={(el) => (tabRefs.current[tab.value] = el)}
                    data-testid={`tab-${tab.value}`}
                    style={{ backgroundColor: 'transparent !important' }}
                    className={`rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-colors !bg-transparent hover:!bg-transparent ${activeTab === tab.value
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div
                className="absolute bottom-0 h-0.5 bg-blue-500 transition-all duration-300 ease-in-out"
                style={{
                  left: `${underlineStyle.left}px`,
                  width: `${underlineStyle.width}px`,
                  opacity: underlineStyle.width > 0 ? 1 : 0
                }}
              />
            </div>


            <TabsContent value="account" className="mt-0 pt-4">
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
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-popover text-popover-foreground">
                                <p className="text-xs">Allow others to see your profile.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-popover text-popover-foreground">
                                <p className="text-xs">Display your email on your public profile.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
                        icon={Monitor}
                        preview={`bg-gradient-to-r from-gray-200 to-gray-800`}
                      />
                      <ThemeCard
                        value="light"
                        label="Light theme"
                        icon={Sun}
                        preview="bg-gray-100"
                      />
                      <ThemeCard
                        value="dark"
                        label="Dark theme"
                        icon={Moon}
                        preview="bg-gray-800"
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

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          data-testid="delete-account-btn"
                          onClick={() => {
                            setDeleteConfirmText('');
                            setDeletePassword('');
                            setDeleteFeedbackReason('');
                            setDeleteFeedbackText('');
                            setShowFeedbackForm(false);
                          }}
                          className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive bg-transparent"
                        >
                          Delete account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent
                        className="max-w-[480px] bg-background border border-border"
                      >
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-lg font-bold text-foreground">
                            Delete account
                          </AlertDialogTitle>
                        </AlertDialogHeader>

                        <div className="space-y-3 py-3">
                          <div className="space-y-2 text-sm text-foreground">
                            <p>
                              Do you <span className="font-semibold">really</span> want to{' '}
                              <span className="font-semibold text-destructive">
                                delete your account?
                              </span>
                            </p>

                            <div className="p-3 rounded-lg border bg-muted/50 border-border">
                              <p className="font-semibold mb-1 text-sm">Grace Period: 7 days</p>
                              <p className="text-xs">Your account will be scheduled for deletion. You'll have 7 days to reactivate by simply logging in.</p>
                            </div>

                            <p className="text-xs text-muted-foreground">
                              All Actors, Actor tasks, schedules, results, datasets, and API keys will be deleted.
                            </p>
                          </div>


                          <div className="pt-3 border-t border-border">
                            <button
                              onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                              className="text-xs font-medium mb-2 text-primary hover:text-primary/80"
                            >
                              {showFeedbackForm ? '▼' : '▶'} Tell us why you're leaving (optional)
                            </button>

                            {showFeedbackForm && (
                              <div className="space-y-2">
                                <div className="space-y-1.5">
                                  {[
                                    { value: 'too_expensive', label: 'Too expensive' },
                                    { value: 'lack_features', label: 'Lack of features I need' },
                                    { value: 'found_alternative', label: 'Found a better alternative' },
                                    { value: 'privacy_concerns', label: 'Privacy concerns' },
                                    { value: 'other', label: 'Other reason' }
                                  ].map((reason) => (
                                    <label key={reason.value} className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name="feedback_reason"
                                        value={reason.value}
                                        checked={deleteFeedbackReason === reason.value}
                                        onChange={(e) => setDeleteFeedbackReason(e.target.value)}
                                        className="w-3.5 h-3.5"
                                      />
                                      <span className="text-xs text-foreground">
                                        {reason.label}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                                <Textarea
                                  value={deleteFeedbackText}
                                  onChange={(e) => setDeleteFeedbackText(e.target.value)}
                                  placeholder="Additional feedback (optional)"
                                  className="min-h-[60px] text-xs bg-background border-input text-foreground placeholder:text-muted-foreground"
                                  maxLength={500}
                                />
                              </div>
                            )}
                          </div>


                          <div className="pt-3 border-t border-border">
                            <label
                              htmlFor="delete-password-input"
                              className="block text-xs font-medium mb-1.5 text-foreground"
                            >
                              Enter your password to confirm
                            </label>
                            <div className="relative">
                              <Input
                                id="delete-password-input"
                                type={showDeletePassword ? 'text' : 'password'}
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                placeholder="Your password"
                                autoComplete="current-password"
                                data-testid="delete-password-input"
                                className="w-full text-sm pr-10 bg-secondary border-input text-foreground focus:border-ring focus:ring-ring"
                              />
                              <div
                                onClick={() => setShowDeletePassword(!showDeletePassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                              >
                                {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>


                          <div className="pt-3 border-t border-border">
                            <label
                              htmlFor="delete-confirm-input"
                              className="block text-xs font-medium mb-1.5 text-foreground"
                            >
                              Type <span className="font-bold select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>{user?.email}</span> to confirm
                            </label>
                            <Input
                              id="delete-confirm-input"
                              type="text"
                              value={deleteConfirmText}
                              onChange={(e) => setDeleteConfirmText(e.target.value)}
                              placeholder=""
                              autoComplete="off"
                              data-testid="delete-confirm-input"
                              className="w-full text-sm bg-secondary border-input text-foreground focus:border-ring focus:ring-ring"
                            />
                          </div>
                        </div>

                        <AlertDialogFooter className="gap-2">
                          <AlertDialogCancel
                            disabled={isDeleting}
                            className="text-sm py-1.5 bg-muted text-muted-foreground hover:bg-muted/80 border-border"
                            onClick={() => {
                              setDeleteConfirmText('');
                              setDeletePassword('');
                              setDeleteFeedbackReason('');
                              setDeleteFeedbackText('');
                            }}
                          >
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirmText !== user?.email || !deletePassword || isDeleting}
                            data-testid="confirm-delete-btn"
                            className={`text-sm py-1.5 ${deleteConfirmText !== user?.email || !deletePassword || isDeleting
                              ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground'
                              : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                              } font-semibold`}
                          >
                            {isDeleting ? 'Scheduling deletion...' : 'Schedule deletion'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Completely remove your account, Actors, tasks, schedules, data, everything. This is sad 😢
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>


            <TabsContent value="login-privacy" className="mt-4">
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-base">Login & Privacy settings coming soon</p>
              </div>
            </TabsContent>

            <TabsContent value="api-integrations" className="mt-0 pt-4">
              <ApiIntegrations />
            </TabsContent>

            <TabsContent value="organizations" className="mt-4">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Your Organizations</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage organizations you are a member of.
                    </p>
                  </div>
                  <Button
                    onClick={() => openModal('create-organization', { onSuccess: refreshWorkspaces })}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Organization
                  </Button>
                </div>

                <div className="rounded-lg border border-border divide-y divide-border">
                  {workspaces.filter(w => w.workspace_type === 'organization').length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>You haven't joined any organizations yet.</p>
                    </div>
                  ) : (
                    workspaces
                      .filter(w => w.workspace_type === 'organization')
                      .map((org) => (
                        <div key={org.workspace_id} className="p-4 flex items-center justify-between bg-card">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{org.workspace_name}</div>
                              <div className="text-xs text-muted-foreground capitalize">
                                Role: {org.role}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Placeholder for future manage specific org functionality */}
                            <Button variant="ghost" size="sm" className="hidden">
                              <SettingsIcon className="w-4 h-4 mr-2" />
                              Manage
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                {/* Convert Personal Account Section */}
                <div className="pt-6 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Convert Personal Account</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                        Convert your personal account into an organization to enable team collaboration features.
                        You will become the owner of the new organization, and all your existing resources will be moved.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => openModal('convert-to-organization', { onSuccess: refreshWorkspaces })}
                      className="border-primary/50 text-primary hover:bg-primary/5"
                    >
                      Convert to Organization
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="mt-4">
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-base">Notifications settings coming soon</p>
              </div>
            </TabsContent>

            <TabsContent value="referrals" className="mt-4">
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-base">Referrals settings coming soon</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>


        <AlertModal
          show={showDeleteSuccessAlert}
          onClose={() => {
            setShowDeleteSuccessAlert(false);
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}
          title="Account Deletion Scheduled"
          message="Your account has been scheduled for deletion. You have 7 days to reactivate by simply logging in."
          type="success"
          confirmText="OK"
        />


        <AlertModal
          show={showAlert}
          onClose={() => setShowAlert(false)}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
        />
      </div>
    </>
  );
};

export default Settings;
