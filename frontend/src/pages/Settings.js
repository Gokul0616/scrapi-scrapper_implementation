import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { HelpCircle, Upload, Trash2, ExternalLink, Check, Sun, Moon, Monitor, Eye, EyeOff } from 'lucide-react';
import { getUserInitials, getProfileColor } from '../utils/userUtils';
import AlertModal from '../components/AlertModal';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Settings = () => {
  const { theme, setTheme, themePreference, setThemePreference } = useTheme();
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
const initialReadme =`Markdown as an easy way to elevate the **look** and *feel* of your text.

Here are some ideas to get you started:
- ✅ Who I am: freelance scraper architect from [place]
- 🤓 My journey: [X] years of coding; now scraping for fun&business
- 🚀 My triumph: proud creator of [API name]
- ⚒️ My skills: [your tools of the trade]
- 🇬🇧 My languages: fluent in [Duolingo]
- 🤝 Work with me: open for scraping challenges at [email]
- 🌟 Preferred comm method: telepathically, pronouns: [they/them] →`
  // Form states
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
  
  // Delete account states
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteFeedbackReason, setDeleteFeedbackReason] = useState('');
  const [deleteFeedbackText, setDeleteFeedbackText] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [showDeleteSuccessAlert, setShowDeleteSuccessAlert] = useState(false);

  // Loading states
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  // Alert states for replacing browser alerts
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info'
  });

  // Load user settings on mount
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
        setReadme(data.readme || '');
        setHomepageUrl(data.homepage_url || '');
        setGithub(data.github || '');
        setTwitter(data.twitter || '');
        setLinkedin(data.linkedin || '');
        setDiscord(data.discord || '');
        setIsPublic(data.is_public || false);
        setShowEmail(data.show_email || false);
        setProfilePicture(data.profile_picture || null);
        
        // Load theme preference from backend or use current
        const backendTheme = data.theme_preference || user?.theme_preference || themePreference || 'light';
        setLocalThemePreference(backendTheme);
        
        // Don't sync theme automatically to prevent auto-toggle when navigating to settings
        // Theme should only change when user explicitly changes it
      } catch (error) {
        console.error('Failed to load settings:', error);
        // Use default values from user context
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

  // Keep local theme preference in sync
  useEffect(() => {
    setLocalThemePreference(themePreference);
  }, [themePreference]);

  const handleSaveUsername = async () => {
    if (username === originalUsername) return;
    
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
    } catch (error) {
      console.error('Failed to save username:', error);
      setAlertConfig({
        title: 'Failed to Save Username',
        message: 'Failed to save username. It may already be taken.',
        type: 'error'
      });
      setShowAlert(true);
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
      
      // Update user context
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
      
      // Update user context
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
      setProfilePicture(response.data.url);
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
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== username) {
      setAlertConfig({
        title: 'Confirmation Required',
        message: 'Please type your username correctly to confirm deletion.',
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
      
      // Show success alert instead of browser alert
      setShowDeleteSuccessAlert(true);
      
      // Clear token and redirect after user closes alert
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
      
      // Download as JSON file
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

  // Helper component for optional label with tooltip
  const OptionalLabel = ({ label, tooltip }) => (
    <div className="flex items-center gap-1.5 mb-2">
      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
        {label}
      </span>
      <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>(optional)</span>
      {tooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} cursor-help`} />
            </TooltipTrigger>
            <TooltipContent side="top" className={theme === 'dark' ? 'bg-gray-800 text-white' : ''}>
              <p className="text-xs max-w-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );

  // Theme card component with mini UI preview
  const ThemeCard = ({ value, label }) => {
    const isSelected = localThemePreference === value;
    const isDarkPreview = value === 'dark';
    const isSystemPreview = value === 'system';
    
    return (
      <button
        onClick={() => handleThemeChange(value)}
        data-testid={`theme-${value}`}
        className={`relative flex flex-col rounded-lg border-2 transition-all overflow-hidden ${
          isSelected 
            ? 'border-blue-500' 
            : theme === 'dark' 
              ? 'border-gray-700 hover:border-gray-600' 
              : 'border-gray-200 hover:border-gray-300'
        }`}
        style={{ width: '140px' }}
      >
        {/* Mini UI Preview */}
        <div className={`h-20 relative p-2 ${
          isDarkPreview ? 'bg-[#1a1a1a]' : 
          isSystemPreview ? 'bg-gradient-to-r from-gray-100 to-gray-800' : 
          'bg-gray-100'
        }`}>
          {/* Mini sidebar */}
          <div className={`absolute left-1 top-1 bottom-1 w-4 rounded-sm ${
            isDarkPreview ? 'bg-[#2a2a2a]' : 
            isSystemPreview ? 'bg-gray-200/50' : 
            'bg-white'
          }`}>
            <div className={`w-2 h-2 mx-auto mt-1 rounded-full ${
              isDarkPreview ? 'bg-gray-600' : 'bg-gray-300'
            }`}></div>
            <div className={`w-2 h-0.5 mx-auto mt-1 rounded ${
              isDarkPreview ? 'bg-gray-600' : 'bg-gray-300'
            }`}></div>
            <div className={`w-2 h-0.5 mx-auto mt-0.5 rounded ${
              isDarkPreview ? 'bg-gray-600' : 'bg-gray-300'
            }`}></div>
          </div>
          {/* Mini content area */}
          <div className={`absolute left-6 right-1 top-1 bottom-1 rounded-sm ${
            isDarkPreview ? 'bg-[#0f0f10]' : 
            isSystemPreview ? 'bg-white/50' : 
            'bg-white'
          }`}>
            <div className={`w-8 h-1 mt-2 ml-2 rounded ${
              isDarkPreview ? 'bg-gray-700' : 'bg-gray-200'
            }`}></div>
            <div className={`w-12 h-1.5 mt-1 ml-2 rounded ${
              isDarkPreview ? 'bg-gray-800' : 'bg-gray-100'
            }`}></div>
            <div className={`w-10 h-1.5 mt-0.5 ml-2 rounded ${
              isDarkPreview ? 'bg-gray-800' : 'bg-gray-100'
            }`}></div>
          </div>
          {/* Selection checkmark */}
          {isSelected && (
            <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>
        {/* Label */}
        <div className={`px-3 py-2 text-left ${theme === 'dark' ? 'bg-[#1A1B1E]' : 'bg-white'}`}>
          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            {label}
          </span>
        </div>
      </button>
    );
  };

  if (loading) {
    return (
      <div className={`flex-1 p-8 ${theme === 'dark' ? 'bg-[#1A1B1E]' : 'bg-gray-50'}`}>
        <div className="animate-pulse">
          <div className={`h-8 w-32 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} rounded mb-6`}></div>
          <div className={`h-10 w-full max-w-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} rounded`}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 min-h-screen ${theme === 'dark' ? 'bg-[#1A1B1E]' : 'bg-white'}`} data-testid="settings-page">
      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} data-testid="settings-title">
            Settings
          </h1>
          <Button
            variant="outline"
            size="sm"
            data-testid="api-button"
            className={theme === 'dark' ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : ''}
          >
            API
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="account" className="w-full">
          <TabsList className={`w-full justify-start border-b rounded-none h-auto p-0 ${theme === 'dark' ? 'bg-transparent border-gray-800' : 'bg-transparent border-gray-200'}`}>
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
                data-testid={`tab-${tab.value}`}
                className={`rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-colors data-[state=active]:border-blue-500 ${
                  theme === 'dark' 
                    ? 'text-gray-400 data-[state=active]:text-white hover:text-gray-200' 
                    : 'text-gray-500 data-[state=active]:text-gray-900 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Account Tab Content */}
          <TabsContent value="account" className="mt-0 pt-8">
            {/* Username Section */}
            <div className={`pb-8 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="flex gap-12">
                {/* Left Column */}
                <div className="w-48 flex-shrink-0">
                  <h2 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Username
                  </h2>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    This might become visible to others, e.g. if you submit an Actor issue.
                  </p>
                </div>
                {/* Right Column */}
                <div className="flex-1 flex items-start gap-3">
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    data-testid="username-input"
                    className={`max-w-sm ${
                      theme === 'dark' 
                        ? 'bg-[#25262B] border-gray-700 text-white placeholder:text-gray-500' 
                        : 'bg-white border-gray-300'
                    }`}
                    placeholder=""
                  />
                  <Button
                    onClick={handleSaveUsername}
                    disabled={username === originalUsername || savingUsername}
                    data-testid="save-username-btn"
                    variant={username === originalUsername ? "ghost" : "default"}
                    className={username === originalUsername 
                      ? `${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}` 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }
                  >
                    {savingUsername ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Profile Section */}
            <div className={`py-8 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="flex gap-12">
                {/* Left Column */}
                <div className="w-48 flex-shrink-0">
                  <h2 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Profile
                  </h2>
                  <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Tell the world a little bit about yourself.
                  </p>
                  <a 
                    href="#" 
                    className={`text-sm flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                    data-testid="view-profile-link"
                  >
                    View your public profile <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                
                {/* Right Column */}
                <div className="flex-1 space-y-6">
                  {/* Picture */}
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
                        className={theme === 'dark' ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : ''}
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

                  {/* First Name & Last Name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                        First name
                      </label>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        data-testid="first-name-input"
                        className={theme === 'dark' ? 'bg-[#25262B] border-gray-700 text-white' : ''}
                        placeholder=""
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                          Last name
                        </span>
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>(optional)</span>
                      </div>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        data-testid="last-name-input"
                        className={theme === 'dark' ? 'bg-[#25262B] border-gray-700 text-white' : ''}
                        placeholder=""
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <OptionalLabel label="Bio" tooltip="A short bio about yourself. Max 200 characters." />
                    <Input
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      data-testid="bio-input"
                      className={theme === 'dark' ? 'bg-[#25262B] border-gray-700 text-white' : ''}
                      placeholder=""
                      maxLength={200}
                    />
                  </div>

                  {/* README */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <OptionalLabel label="README" tooltip="Write a detailed description using Markdown. Max 2000 characters." />
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
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
                      className={`min-h-[200px] ${theme === 'dark' ? 'bg-[#25262B] border-gray-700 text-white' : ''}`}
                      placeholder={'add Readme!!!'}
                      maxLength={2000}
                    />
                    <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {readme.length}/2000
                    </div>
                  </div>

                  {/* Homepage URL */}
                  <div>
                    <OptionalLabel label="Homepage URL" tooltip="Your personal website or portfolio." />
                    <Input
                      value={homepageUrl}
                      onChange={(e) => setHomepageUrl(e.target.value)}
                      data-testid="homepage-url-input"
                      className={theme === 'dark' ? 'bg-[#25262B] border-gray-700 text-white' : ''}
                      placeholder=""
                    />
                  </div>

                  {/* GitHub & Twitter */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <OptionalLabel label="GitHub" tooltip="Your GitHub username." />
                      <Input
                        value={github}
                        onChange={(e) => setGithub(e.target.value)}
                        data-testid="github-input"
                        className={theme === 'dark' ? 'bg-[#25262B] border-gray-700 text-white' : ''}
                        placeholder=""
                      />
                    </div>
                    <div>
                      <OptionalLabel label="Twitter/X username" tooltip="Your Twitter/X username without the @ symbol." />
                      <Input
                        value={twitter}
                        onChange={(e) => setTwitter(e.target.value)}
                        data-testid="twitter-input"
                        className={theme === 'dark' ? 'bg-[#25262B] border-gray-700 text-white' : ''}
                        placeholder=""
                      />
                    </div>
                  </div>

                  {/* LinkedIn & Discord */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <OptionalLabel label="LinkedIn URL" tooltip="Your LinkedIn profile URL." />
                      <Input
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        data-testid="linkedin-input"
                        className={theme === 'dark' ? 'bg-[#25262B] border-gray-700 text-white' : ''}
                        placeholder=""
                      />
                    </div>
                    <div>
                      <OptionalLabel label="Discord user ID" tooltip="Your Discord user ID (18-19 digits). Right-click your username in Discord to copy." />
                      <Input
                        value={discord}
                        onChange={(e) => setDiscord(e.target.value)}
                        data-testid="discord-input"
                        className={theme === 'dark' ? 'bg-[#25262B] border-gray-700 text-white' : ''}
                        placeholder=""
                      />
                    </div>
                  </div>

                  {/* Privacy Toggles */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                          Make profile publicly visible
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} cursor-help`} />
                            </TooltipTrigger>
                            <TooltipContent side="top" className={theme === 'dark' ? 'bg-gray-800 text-white' : ''}>
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
                        <span className={`text-sm ${isPublic ? (theme === 'dark' ? 'text-gray-200' : 'text-gray-700') : (theme === 'dark' ? 'text-gray-600' : 'text-gray-400')} font-medium`}>
                          Show my contact email
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} cursor-help`} />
                            </TooltipTrigger>
                            <TooltipContent side="top" className={theme === 'dark' ? 'bg-gray-800 text-white' : ''}>
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

                  {/* Save Button */}
                  <div className="pt-4">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      data-testid="save-profile-btn"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {savingProfile ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Theme Section */}
            <div className={`py-8 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="flex gap-12">
                {/* Left Column */}
                <div className="w-48 flex-shrink-0">
                  <h2 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Theme
                  </h2>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Choose how Scrapi Console looks to you.
                  </p>
                </div>
                
                {/* Right Column */}
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

            {/* Danger Zone */}
            <div className="py-8">
              <div className="flex gap-12">
                {/* Left Column */}
                <div className="w-48 flex-shrink-0">
                  <h2 className="text-lg font-semibold mb-2 text-red-500">
                    Danger zone
                  </h2>
                </div>
                
                {/* Right Column */}
                <div className="flex-1">
                  {/* Export Data Button */}
                  <div className="mb-4">
                    <Button
                      onClick={handleExportData}
                      disabled={isExporting}
                      variant="outline"
                      data-testid="export-data-btn"
                      className={`${theme === 'dark' ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : ''}`}
                    >
                      {isExporting ? 'Exporting...' : '📥 Export My Data'}
                    </Button>
                    <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
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
                        className={`border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-600 ${
                          theme === 'dark' ? 'bg-transparent' : ''
                        }`}
                      >
                        Delete account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent 
                      className={`max-w-[480px] ${
                        theme === 'dark' 
                          ? 'bg-[#1e1e1e] border border-gray-700' 
                          : 'bg-white border border-gray-300'
                      }`}
                    >
                      <AlertDialogHeader>
                        <AlertDialogTitle className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          Delete account
                        </AlertDialogTitle>
                      </AlertDialogHeader>
                      
                      <div className="space-y-3 py-3">
                        <div className={`space-y-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          <p>
                            Do you <span className="font-semibold">really</span> want to{' '}
                            <span className={`font-semibold ${theme === 'dark' ? 'text-[#e06c75]' : 'text-[#dc3545]'}`}>
                              delete your account?
                            </span>
                          </p>
                          
                          <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-orange-900/20 border border-orange-500/30' : 'bg-orange-50 border border-orange-200'}`}>
                            <p className="font-semibold mb-1 text-sm">Grace Period: 7 days</p>
                            <p className="text-xs">Your account will be scheduled for deletion. You'll have 7 days to reactivate by simply logging in.</p>
                          </div>
                          
                          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            All Actors, Actor tasks, schedules, results, datasets, and API keys will be deleted.
                          </p>
                          
                          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            We're sad to see you go 😢
                          </p>
                        </div>
                        
                        {/* Feedback Form */}
                        <div className={`pt-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                          <button
                            onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                            className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
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
                                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                      {reason.label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                              <Textarea
                                value={deleteFeedbackText}
                                onChange={(e) => setDeleteFeedbackText(e.target.value)}
                                placeholder="Additional feedback (optional)"
                                className={`min-h-[60px] text-xs ${theme === 'dark' ? 'bg-[#25262B] border-gray-700 text-white' : ''}`}
                                maxLength={500}
                              />
                            </div>
                          )}
                        </div>
                        
                        {/* Password Re-authentication */}
                        <div className={`pt-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                          <label 
                            htmlFor="delete-password-input"
                            className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
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
                              className={`w-full text-sm pr-10 ${
                                theme === 'dark'
                                  ? 'bg-[#333333] border-gray-600 text-white focus:border-[#007bff] focus:ring-[#007bff]'
                                  : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                              }`}
                            />
                            <div
                              onClick={() => setShowDeletePassword(!showDeletePassword)}
                              className={`absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer ${
                                theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>
                        
                        {/* Username Confirmation */}
                        <div className={`pt-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                          <label 
                            htmlFor="delete-confirm-input"
                            className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                          >
                            Type <span className="font-bold select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>{username}</span> to confirm
                          </label>
                          <Input
                            id="delete-confirm-input"
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder=""
                            autoComplete="off"
                            data-testid="delete-confirm-input"
                            className={`w-full text-sm ${
                              theme === 'dark'
                                ? 'bg-[#333333] border-gray-600 text-white focus:border-[#007bff] focus:ring-[#007bff]'
                                : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                            }`}
                          />
                        </div>
                      </div>
                      
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel 
                          disabled={isDeleting}
                          className={`text-sm py-1.5 ${
                            theme === 'dark'
                              ? 'bg-[#444444] border-gray-600 text-white hover:bg-[#4a4a4a]'
                              : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                          }`}
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
                          disabled={deleteConfirmText !== username || !deletePassword || isDeleting}
                          data-testid="confirm-delete-btn"
                          className={`text-sm py-1.5 ${
                            deleteConfirmText !== username || !deletePassword || isDeleting
                              ? 'opacity-50 cursor-not-allowed bg-gray-400'
                              : theme === 'dark'
                              ? 'bg-[#e06c75] hover:bg-[#d65c66]'
                              : 'bg-[#dc3545] hover:bg-[#c82333]'
                          } text-white font-semibold`}
                        >
                          {isDeleting ? 'Scheduling deletion...' : 'I understand, schedule deletion'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <p className={`mt-3 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Completely remove your account, Actors, tasks, schedules, data, everything. This is sad 😢
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Other Tabs - Empty for now */}
          <TabsContent value="login-privacy" className="mt-8">
            <div className={`text-center py-16 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <p className="text-lg">Login & Privacy settings coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="api-integrations" className="mt-8">
            <div className={`text-center py-16 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <p className="text-lg">API & Integrations settings coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="organizations" className="mt-8">
            <div className={`text-center py-16 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <p className="text-lg">Organizations settings coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-8">
            <div className={`text-center py-16 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <p className="text-lg">Notifications settings coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="referrals" className="mt-8">
            <div className={`text-center py-16 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <p className="text-lg">Referrals settings coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Delete Success Alert Modal */}
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
      
      {/* General Alert Modal */}
      <AlertModal
        show={showAlert}
        onClose={() => setShowAlert(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </div>
  );
};

export default Settings;
