import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import CodeEditor from '../components/CodeEditor';
import { 
  FileCode, FolderOpen, Plus, X, Play, Save, ArrowLeft, 
  Terminal, XCircle, CheckCircle, Loader, ChevronRight,
  Settings, Code, Eye, Box
} from 'lucide-react';

const ActorCodeEditor = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const actorId = searchParams.get('id');
  
  // State
  const [actor, setActor] = useState(null);
  const [files, setFiles] = useState([
    { name: 'main.py', language: 'python', content: '', active: true, modified: false },
    { name: 'requirements.txt', language: 'plaintext', content: 'requests\nbeautifulsoup4\nlxml', active: false, modified: false },
    { name: 'README.md', language: 'markdown', content: '# Actor Documentation\n\nDescribe your actor here...', active: false, modified: false }
  ]);
  const [activeFile, setActiveFile] = useState('main.py');
  const [showConsole, setShowConsole] = useState(true);
  const [consoleOutput, setConsoleOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Actor metadata
  const [actorName, setActorName] = useState('');
  const [actorDescription, setActorDescription] = useState('');
  const [actorIcon, setActorIcon] = useState('🤖');
  const [showSettings, setShowSettings] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    if (actorId) {
      loadActor();
    } else {
      // New actor - load default template
      loadPythonTemplate();
    }
  }, [actorId]);

  const loadActor = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${backendUrl}/api/actors/${actorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const actorData = response.data;
      setActor(actorData);
      setActorName(actorData.name);
      setActorDescription(actorData.description);
      setActorIcon(actorData.icon || '🤖');
      
      // Load code into editor
      if (actorData.code) {
        updateFileContent('main.py', actorData.code);
      }
    } catch (error) {
      console.error('Failed to load actor:', error);
      addConsoleLog('error', 'Failed to load actor');
    }
  };

  const loadPythonTemplate = () => {
    const template = `"""
Actor Template - Web Scraper
"""
import requests
from bs4 import BeautifulSoup
import json

def start(input_data):
    """
    Entry point: Return list of URLs to scrape
    
    Args:
        input_data (dict): User provided inputs
            - url: Target URL
            - max_pages: Maximum pages to scrape
    
    Returns:
        list[str]: URLs to process
    """
    url = input_data.get('url', 'https://example.com')
    print(f"🚀 Starting scraper for: {url}")
    return [url]

def parse(url, html):
    """
    Parse HTML and extract data
    
    Args:
        url (str): Current URL
        html (str): Page HTML content
    
    Returns:
        list[dict]: Extracted items
    """
    print(f"📄 Parsing: {url}")
    soup = BeautifulSoup(html, 'lxml')
    results = []
    
    # Example: Extract all links
    for link in soup.select('a'):
        href = link.get('href', '')
        text = link.get_text(strip=True)
        if href and text:
            results.append({
                'title': text,
                'url': href,
                'source_url': url
            })
    
    print(f"✅ Extracted {len(results)} items")
    return results

def paginate(url, html):
    """
    Optional: Return next page URL
    
    Args:
        url (str): Current URL
        html (str): Page HTML content
    
    Returns:
        str or None: Next page URL or None to stop
    """
    soup = BeautifulSoup(html, 'lxml')
    next_button = soup.select_one('.next-page, .pagination-next')
    
    if next_button:
        next_url = next_button.get('href')
        print(f"➡️  Next page found: {next_url}")
        return next_url
    
    return None

# Helper functions available to you:
# - download_image(url) -> saves image and returns path
# - make_request(url, method='GET', headers={}, data={}) -> custom HTTP request
# - sleep(seconds) -> pause execution
`;
    updateFileContent('main.py', template);
  };

  const updateFileContent = (fileName, content) => {
    setFiles(prev => prev.map(f => 
      f.name === fileName 
        ? { ...f, content, modified: true }
        : f
    ));
  };

  const getActiveFile = () => {
    return files.find(f => f.name === activeFile);
  };

  const handleFileChange = (newContent) => {
    updateFileContent(activeFile, newContent);
    setErrors([]); // Clear errors on change
  };

  const addConsoleLog = (type, message) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleOutput(prev => [...prev, { type, message, timestamp }]);
  };

  const clearConsole = () => {
    setConsoleOutput([]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    addConsoleLog('info', '💾 Saving actor...');
    
    try {
      const token = localStorage.getItem('token');
      const mainFile = files.find(f => f.name === 'main.py');
      
      const payload = {
        name: actorName || 'Untitled Actor',
        description: actorDescription || 'No description',
        icon: actorIcon,
        actor_type: 'code',
        code: mainFile.content,
        language: 'python'
      };

      if (actorId) {
        await axios.patch(`${backendUrl}/api/actors/${actorId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        addConsoleLog('success', '✅ Actor saved successfully');
      } else {
        const response = await axios.post(`${backendUrl}/api/actors`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        addConsoleLog('success', `✅ Actor created: ${response.data.id}`);
        navigate(`/actor-code-editor?id=${response.data.id}`);
      }

      // Mark files as not modified
      setFiles(prev => prev.map(f => ({ ...f, modified: false })));
    } catch (error) {
      console.error('Save failed:', error);
      addConsoleLog('error', `❌ Save failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = async () => {
    addConsoleLog('info', '🔍 Validating code...');
    setErrors([]);
    
    try {
      const token = localStorage.getItem('token');
      const mainFile = files.find(f => f.name === 'main.py');
      
      const response = await axios.post(
        `${backendUrl}/api/actors/validate-code`,
        {
          code: mainFile.content,
          language: 'python'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.valid) {
        addConsoleLog('success', '✅ Code is valid');
      } else {
        const error = {
          line: response.data.line,
          message: response.data.error
        };
        setErrors([error]);
        addConsoleLog('error', `❌ Validation error on line ${error.line}: ${error.message}`);
      }
    } catch (error) {
      console.error('Validation failed:', error);
      addConsoleLog('error', '❌ Validation failed');
    }
  };

  const handleRun = async () => {
    addConsoleLog('info', '▶️  Starting test run...');
    setIsRunning(true);
    
    try {
      // First save the actor
      await handleSave();
      
      if (!actorId) {
        addConsoleLog('error', '❌ Please save actor first');
        setIsRunning(false);
        return;
      }

      // Create a test run
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${backendUrl}/api/runs`,
        {
          actor_id: actorId,
          input: { url: 'https://example.com' }
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      addConsoleLog('success', `✅ Run created: ${response.data.id}`);
      addConsoleLog('info', '📊 View results in Runs page');
      
      // Navigate to runs page after 2 seconds
      setTimeout(() => {
        navigate('/runs');
      }, 2000);
    } catch (error) {
      console.error('Run failed:', error);
      addConsoleLog('error', `❌ Run failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getFileIcon = (fileName) => {
    if (fileName.endsWith('.py')) return '🐍';
    if (fileName.endsWith('.js')) return '📜';
    if (fileName.endsWith('.txt')) return '📄';
    if (fileName.endsWith('.md')) return '📝';
    return '📄';
  };

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e]">
      {/* Top bar */}
      <div className="bg-[#2d2d2d] border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/actors')}
            className="p-2 hover:bg-[#3c3c3c] rounded text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{actorIcon}</span>
            <div>
              <h1 className="text-lg font-semibold text-white">
                {actorName || 'Untitled Actor'}
              </h1>
              <p className="text-xs text-gray-400">{actorId ? `ID: ${actorId}` : 'Not saved yet'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleValidate}
            className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-gray-300 rounded flex items-center space-x-1 transition"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Validate</span>
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-gray-300 rounded flex items-center space-x-1 transition"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center space-x-1 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded flex items-center space-x-1 transition disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>{isRunning ? 'Running...' : 'Test Run'}</span>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - File Explorer */}
        {!sidebarCollapsed && (
          <div className="w-64 bg-[#252526] border-r border-gray-700 flex flex-col">
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-300 uppercase">Files</span>
              <button className="p-1 hover:bg-[#3c3c3c] rounded text-gray-400">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {files.map(file => (
                <div
                  key={file.name}
                  onClick={() => setActiveFile(file.name)}
                  className={`px-3 py-2 cursor-pointer flex items-center justify-between group ${
                    file.name === activeFile 
                      ? 'bg-[#37373d] text-white' 
                      : 'text-gray-400 hover:bg-[#2a2d2e]'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getFileIcon(file.name)}</span>
                    <span className="text-sm">{file.name}</span>
                    {file.modified && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Editor area */}
        <div className="flex-1 flex flex-col">
          {/* Tab bar */}
          <div className="bg-[#2d2d2d] border-b border-gray-700 flex items-center px-2 overflow-x-auto">
            {files.filter(f => f.name === activeFile).map(file => (
              <div
                key={file.name}
                className="flex items-center space-x-2 px-3 py-2 bg-[#1e1e1e] border-r border-gray-700 text-gray-300"
              >
                <span className="text-sm">{getFileIcon(file.name)}</span>
                <span className="text-sm">{file.name}</span>
                {file.modified && (
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                )}
              </div>
            ))}
          </div>

          {/* Code editor */}
          <div className="flex-1">
            <CodeEditor
              value={getActiveFile()?.content || ''}
              onChange={handleFileChange}
              language={getActiveFile()?.language || 'python'}
              theme="vs-dark"
              height="100%"
              showToolbar={false}
              fileName={activeFile}
              errors={errors}
              onSave={handleSave}
              onRun={handleRun}
            />
          </div>

          {/* Console */}
          {showConsole && (
            <div className="h-48 bg-[#1e1e1e] border-t border-gray-700 flex flex-col">
              <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-gray-700">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-300">Console</span>
                  <span className="text-xs text-gray-500">({consoleOutput.length} messages)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={clearConsole}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowConsole(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
                {consoleOutput.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    Console output will appear here...
                  </div>
                ) : (
                  consoleOutput.map((log, idx) => (
                    <div
                      key={idx}
                      className={`mb-1 ${
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'success' ? 'text-green-400' :
                        log.type === 'warning' ? 'text-yellow-400' :
                        'text-gray-300'
                      }`}
                    >
                      <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {!showConsole && (
            <button
              onClick={() => setShowConsole(true)}
              className="absolute bottom-4 right-4 px-3 py-2 bg-[#2d2d2d] hover:bg-[#3c3c3c] text-gray-300 rounded-lg shadow-lg flex items-center space-x-2 border border-gray-700"
            >
              <Terminal className="w-4 h-4" />
              <span>Show Console</span>
            </button>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2d2d2d] rounded-lg shadow-xl max-w-2xl w-full border border-gray-700">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Actor Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Actor Name
                </label>
                <input
                  type="text"
                  value={actorName}
                  onChange={(e) => setActorName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1e1e1e] border border-gray-600 rounded text-white"
                  placeholder="My Awesome Scraper"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={actorDescription}
                  onChange={(e) => setActorDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#1e1e1e] border border-gray-600 rounded text-white"
                  placeholder="Describe what your actor does..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Icon (Emoji)
                </label>
                <input
                  type="text"
                  value={actorIcon}
                  onChange={(e) => setActorIcon(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1e1e1e] border border-gray-600 rounded text-white"
                  placeholder="🤖"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-700 flex justify-end space-x-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-gray-300 hover:bg-[#3c3c3c] rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSettings(false);
                  handleSave();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActorCodeEditor;
