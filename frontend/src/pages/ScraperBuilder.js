import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, X, Play, Save, Code, Eye, Settings, ChevronDown, ChevronUp,
  MousePointer, Layers, Globe, Repeat, Clock, Shield, Zap
} from 'lucide-react';
import AlertModal from '../components/AlertModal';

const ScraperBuilder = () => {
  const navigate = useNavigate();
  const iframeRef = useRef(null);
  
  // State
  const [scraperName, setScraperName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🕷️');
  const [startUrls, setStartUrls] = useState(['']);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fields, setFields] = useState([]);
  const [isTestingSelector, setIsTestingSelector] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeError, setIframeError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    fields: true,
    pagination: false,
    advanced: false
  });
  
  // AlertModal state
  const [alertModal, setAlertModal] = useState({ 
    show: false, 
    type: 'info', 
    title: '', 
    message: '',
    details: []
  });
  
  // Pagination config
  const [paginationEnabled, setPaginationEnabled] = useState(false);
  const [paginationType, setPaginationType] = useState('next_button');
  const [nextSelector, setNextSelector] = useState('');
  const [maxPages, setMaxPages] = useState(10);
  
  // Advanced settings
  const [useBrowser, setUseBrowser] = useState(true);
  const [waitForSelector, setWaitForSelector] = useState('');
  const [delayBetweenPages, setDelayBetweenPages] = useState(2000);
  const [useProxy, setUseProxy] = useState(false);
  const [maxPagesLimit, setMaxPagesLimit] = useState(50);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const addField = () => {
    setFields([...fields, {
      id: Date.now(),
      name: '',
      selector: '',
      selector_type: 'css',
      extract_type: 'text',
      attribute: '',
      multiple: false,
      transform: '',
      required: false,
      default_value: ''
    }]);
  };

  const updateField = (id, key, value) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const removeField = (id) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const testSelector = async (fieldId) => {
    if (!previewUrl) {
      setAlertModal({
        show: true,
        type: 'warning',
        title: 'Preview URL Required',
        message: 'Please enter a preview URL first'
      });
      return;
    }

    const field = fields.find(f => f.id === fieldId);
    if (!field.selector) {
      setAlertModal({
        show: true,
        type: 'warning',
        title: 'Selector Required',
        message: 'Please enter a selector first'
      });
      return;
    }

    setIsTestingSelector(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${backendUrl}/api/scrapers/builder/test-selector`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          url: previewUrl,
          selector: field.selector,
          selector_type: field.selector_type
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setAlertModal({
          show: true,
          type: 'success',
          title: 'Selector Test Successful',
          message: `Found ${data.count} elements`,
          details: [
            { label: 'Sample Results', value: data.samples.map(s => s.text).join(', ') }
          ]
        });
      } else {
        setAlertModal({
          show: true,
          type: 'error',
          title: 'Selector Test Failed',
          message: data.error
        });
      }
    } catch (error) {
      setAlertModal({
        show: true,
        type: 'error',
        title: 'Test Error',
        message: error.message
      });
    } finally {
      setIsTestingSelector(false);
    }
  };

  const testScraper = async () => {
    if (!previewUrl) {
      setAlertModal({
        show: true,
        type: 'warning',
        title: 'URL Required',
        message: 'Please enter a URL to test'
      });
      return;
    }

    if (fields.length === 0) {
      setAlertModal({
        show: true,
        type: 'warning',
        title: 'Fields Required',
        message: 'Please add at least one field'
      });
      return;
    }

    setIsRunningTest(true);
    setTestResults(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${backendUrl}/api/scrapers/builder/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          url: previewUrl,
          fields: fields.map(f => ({
            name: f.name,
            selector: f.selector,
            selector_type: f.selector_type,
            extract_type: f.extract_type,
            attribute: f.attribute || null,
            multiple: f.multiple,
            transform: f.transform || null,
            required: f.required,
            default_value: f.default_value || null
          })),
          use_browser: useBrowser,
          wait_for_selector: waitForSelector || null
        })
      });

      const data = await response.json();
      setTestResults(data);
    } catch (error) {
      setAlertModal({
        show: true,
        type: 'error',
        title: 'Test Error',
        message: error.message
      });
    } finally {
      setIsRunningTest(false);
    }
  };

  const saveScraper = async () => {
    if (!scraperName) {
      setAlertModal({
        show: true,
        type: 'warning',
        title: 'Name Required',
        message: 'Please enter a scraper name'
      });
      return;
    }

    if (startUrls.filter(u => u.trim()).length === 0) {
      setAlertModal({
        show: true,
        type: 'warning',
        title: 'URL Required',
        message: 'Please enter at least one start URL'
      });
      return;
    }

    if (fields.length === 0) {
      setAlertModal({
        show: true,
        type: 'warning',
        title: 'Fields Required',
        message: 'Please add at least one field'
      });
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${backendUrl}/api/scrapers/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: scraperName,
          description: description,
          icon: icon,
          start_urls: startUrls.filter(u => u.trim()),
          fields: fields.map(f => ({
            name: f.name,
            selector: f.selector,
            selector_type: f.selector_type,
            extract_type: f.extract_type,
            attribute: f.attribute || null,
            multiple: f.multiple,
            transform: f.transform || null,
            required: f.required,
            default_value: f.default_value || null
          })),
          pagination: {
            enabled: paginationEnabled,
            type: paginationType,
            next_selector: nextSelector || null,
            max_pages: maxPages,
            wait_after_load: 2000,
            stop_if_no_new_items: true
          },
          use_browser: useBrowser,
          wait_for_selector: waitForSelector || null,
          delay_between_pages: delayBetweenPages,
          use_proxy: useProxy,
          max_pages: maxPagesLimit,
          category: 'Custom',
          tags: ['custom', 'visual-builder'],
          status: 'draft'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setAlertModal({
          show: true,
          type: 'success',
          title: 'Scraper Saved',
          message: 'Your scraper has been saved successfully!'
        });
        setTimeout(() => navigate('/my-scraper'), 1500);
      } else {
        setAlertModal({
          show: true,
          type: 'error',
          title: 'Save Failed',
          message: data.message || 'Unknown error occurred'
        });
      }
    } catch (error) {
      setAlertModal({
        show: true,
        type: 'error',
        title: 'Save Error',
        message: error.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/my-scraper')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{icon}</span>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Visual Scraper Builder</h1>
                  <p className="text-sm text-gray-500">Create custom scrapers without code</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={testScraper}
                disabled={isRunningTest || !previewUrl || fields.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                <span>{isRunningTest ? 'Testing...' : 'Test Run'}</span>
              </button>
              
              <button
                onClick={saveScraper}
                disabled={isSaving || !scraperName || fields.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg hover:from-gray-900 hover:to-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Scraper'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-full">
        <div className="grid grid-cols-2 gap-0 h-[calc(100vh-80px)]">
          {/* Left: Preview */}
          <div className="border-r border-gray-200 bg-gray-50 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center space-x-2">
                <Eye className="w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={previewUrl}
                  onChange={(e) => setPreviewUrl(e.target.value)}
                  placeholder="Enter URL to preview (e.g., https://example.com)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <button
                  onClick={() => iframeRef.current?.contentWindow.location.reload()}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Reload
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {previewUrl ? (
                <iframe
                  ref={iframeRef}
                  src={previewUrl}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin allow-scripts"
                  title="Page Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <Globe className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Enter a URL above to preview</p>
                    <p className="text-sm mt-2">You can click elements to generate selectors</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Configuration */}
          <div className="overflow-y-auto bg-white">
            <div className="p-6 space-y-6">
              
              {/* Basic Info Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('basic')}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
                >
                  <div className="flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Basic Information</span>
                  </div>
                  {expandedSections.basic ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                
                {expandedSections.basic && (
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Scraper Name *
                      </label>
                      <input
                        type="text"
                        value={scraperName}
                        onChange={(e) => setScraperName(e.target.value)}
                        placeholder="My Custom Scraper"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what this scraper does..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Icon
                      </label>
                      <input
                        type="text"
                        value={icon}
                        onChange={(e) => setIcon(e.target.value)}
                        placeholder="🕷️"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start URLs *
                      </label>
                      {startUrls.map((url, index) => (
                        <div key={index} className="flex items-center space-x-2 mb-2">
                          <input
                            type="url"
                            value={url}
                            onChange={(e) => {
                              const newUrls = [...startUrls];
                              newUrls[index] = e.target.value;
                              setStartUrls(newUrls);
                            }}
                            placeholder="https://example.com"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                          />
                          {startUrls.length > 1 && (
                            <button
                              onClick={() => setStartUrls(startUrls.filter((_, i) => i !== index))}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => setStartUrls([...startUrls, ''])}
                        className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add URL</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Fields Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('fields')}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
                >
                  <div className="flex items-center space-x-2">
                    <Layers className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Field Extraction ({fields.length})</span>
                  </div>
                  {expandedSections.fields ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                
                {expandedSections.fields && (
                  <div className="p-4 space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Field {index + 1}</span>
                          <button
                            onClick={() => removeField(field.id)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Field Name</label>
                            <input
                              type="text"
                              value={field.name}
                              onChange={(e) => updateField(field.id, 'name', e.target.value)}
                              placeholder="title"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-900"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Extract Type</label>
                            <select
                              value={field.extract_type}
                              onChange={(e) => updateField(field.id, 'extract_type', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-900"
                            >
                              <option value="text">Text</option>
                              <option value="attribute">Attribute</option>
                              <option value="html">HTML</option>
                              <option value="link">Link (href)</option>
                              <option value="image">Image (src)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Selector ({field.selector_type})
                          </label>
                          <div className="flex items-center space-x-2">
                            <select
                              value={field.selector_type}
                              onChange={(e) => updateField(field.id, 'selector_type', e.target.value)}
                              className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-900"
                            >
                              <option value="css">CSS</option>
                              <option value="xpath">XPath</option>
                            </select>
                            <input
                              type="text"
                              value={field.selector}
                              onChange={(e) => updateField(field.id, 'selector', e.target.value)}
                              placeholder="h1.title"
                              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-900"
                            />
                            <button
                              onClick={() => testSelector(field.id)}
                              disabled={isTestingSelector || !field.selector}
                              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                            >
                              Test
                            </button>
                          </div>
                        </div>

                        {field.extract_type === 'attribute' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Attribute Name</label>
                            <input
                              type="text"
                              value={field.attribute}
                              onChange={(e) => updateField(field.id, 'attribute', e.target.value)}
                              placeholder="data-id"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-900"
                            />
                          </div>
                        )}

                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={field.multiple}
                              onChange={(e) => updateField(field.id, 'multiple', e.target.checked)}
                              className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                            />
                            <span className="text-gray-700">Multiple</span>
                          </label>
                          
                          <label className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateField(field.id, 'required', e.target.checked)}
                              className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                            />
                            <span className="text-gray-700">Required</span>
                          </label>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={addField}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-900"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Add Field</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Pagination Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('pagination')}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
                >
                  <div className="flex items-center space-x-2">
                    <Repeat className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Pagination</span>
                  </div>
                  {expandedSections.pagination ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                
                {expandedSections.pagination && (
                  <div className="p-4 space-y-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={paginationEnabled}
                        onChange={(e) => setPaginationEnabled(e.target.checked)}
                        className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      <span className="text-sm text-gray-700">Enable Pagination</span>
                    </label>

                    {paginationEnabled && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                          <select
                            value={paginationType}
                            onChange={(e) => setPaginationType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                          >
                            <option value="next_button">Next Button</option>
                            <option value="load_more">Load More</option>
                            <option value="infinite_scroll">Infinite Scroll</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Next Button Selector
                          </label>
                          <input
                            type="text"
                            value={nextSelector}
                            onChange={(e) => setNextSelector(e.target.value)}
                            placeholder="a.next-page"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Max Pages
                          </label>
                          <input
                            type="number"
                            value={maxPages}
                            onChange={(e) => setMaxPages(parseInt(e.target.value))}
                            min="1"
                            max="100"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Advanced Settings Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('advanced')}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
                >
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Advanced Settings</span>
                  </div>
                  {expandedSections.advanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                
                {expandedSections.advanced && (
                  <div className="p-4 space-y-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={useBrowser}
                        onChange={(e) => setUseBrowser(e.target.checked)}
                        className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      <span className="text-sm text-gray-700">Use Headless Browser (Playwright)</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={useProxy}
                        onChange={(e) => setUseProxy(e.target.checked)}
                        className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      <span className="text-sm text-gray-700">Use Proxy</span>
                    </label>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Wait for Selector (optional)
                      </label>
                      <input
                        type="text"
                        value={waitForSelector}
                        onChange={(e) => setWaitForSelector(e.target.value)}
                        placeholder=".content-loaded"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delay Between Pages (ms)
                      </label>
                      <input
                        type="number"
                        value={delayBetweenPages}
                        onChange={(e) => setDelayBetweenPages(parseInt(e.target.value))}
                        min="0"
                        step="500"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Pages Limit
                      </label>
                      <input
                        type="number"
                        value={maxPagesLimit}
                        onChange={(e) => setMaxPagesLimit(parseInt(e.target.value))}
                        min="1"
                        max="1000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Test Results */}
              {testResults && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                    <Code className="w-5 h-5" />
                    <span>Test Results</span>
                  </h3>
                  
                  {testResults.success ? (
                    <div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-green-800">✅ Successfully extracted {testResults.fields_extracted} fields</p>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3 overflow-x-auto">
                        <pre className="text-xs text-gray-800">{JSON.stringify(testResults.data, null, 2)}</pre>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800">❌ {testResults.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Alert Modal */}
      <AlertModal
        show={alertModal.show}
        onClose={() => setAlertModal({ ...alertModal, show: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        details={alertModal.details}
      />
    </div>
  );
};

export default ScraperBuilder;
