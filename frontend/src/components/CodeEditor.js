import React, { useRef, useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, Save, Download, Upload, Settings, Maximize2, Minimize2,
  Terminal, FileCode, AlertCircle, CheckCircle, Loader
} from 'lucide-react';

const CodeEditor = ({ 
  value, 
  onChange, 
  language = 'python',
  theme = 'vs-dark',
  height = '600px',
  readOnly = false,
  onRun,
  onSave,
  showToolbar = true,
  fileName = 'main.py',
  errors = []
}) => {
  const editorRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'saved', 'error'
  const [validationStatus, setValidationStatus] = useState(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Auto-save with debounce
  useEffect(() => {
    if (!onChange) return;
    
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
        handleAutoSave();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [localValue]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 21,
      fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      renderLineHighlight: 'all',
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: true,
      formatOnPaste: true,
      formatOnType: true,
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      wordWrap: 'on',
    });

    // Set error markers if any
    if (errors.length > 0) {
      const markers = errors.map(err => ({
        severity: monaco.MarkerSeverity.Error,
        startLineNumber: err.line || 1,
        startColumn: 1,
        endLineNumber: err.line || 1,
        endColumn: 1000,
        message: err.message || err.error || 'Error',
      }));
      monaco.editor.setModelMarkers(editor.getModel(), 'errors', markers);
    }
  };

  const handleEditorChange = (newValue) => {
    setLocalValue(newValue);
    setSaveStatus(null);
  };

  const handleAutoSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    }, 300);
  };

  const handleManualSave = async () => {
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave(localValue);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 2000);
      } catch (error) {
        setSaveStatus('error');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleRun = () => {
    if (onRun) {
      onRun(localValue);
    }
  };

  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleDownload = () => {
    const blob = new Blob([localValue], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const containerClass = isFullscreen 
    ? 'fixed inset-0 z-50 bg-[#1e1e1e]' 
    : 'relative border border-gray-700 rounded-lg overflow-hidden bg-[#1e1e1e]';

  return (
    <div className={containerClass}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="bg-[#2d2d2d] border-b border-gray-700 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* File name */}
            <div className="flex items-center space-x-2 bg-[#1e1e1e] px-3 py-1.5 rounded text-sm text-gray-300">
              <FileCode className="w-4 h-4" />
              <span>{fileName}</span>
            </div>

            {/* Language badge */}
            <div className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
              {language === 'python' ? 'Python' : 'JavaScript'}
            </div>

            {/* Save status */}
            {saveStatus === 'saving' && (
              <div className="flex items-center space-x-1 text-yellow-400 text-xs">
                <Loader className="w-3 h-3 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="flex items-center space-x-1 text-green-400 text-xs">
                <CheckCircle className="w-3 h-3" />
                <span>Saved</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center space-x-1 text-red-400 text-xs">
                <AlertCircle className="w-3 h-3" />
                <span>Save failed</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Action buttons */}
            <button
              onClick={handleFormat}
              className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-gray-300 text-sm rounded flex items-center space-x-1 transition"
              title="Format code"
            >
              <Settings className="w-4 h-4" />
              <span>Format</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-gray-300 text-sm rounded flex items-center space-x-1 transition"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>

            {onSave && (
              <button
                onClick={handleManualSave}
                disabled={isSaving}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded flex items-center space-x-1 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>
            )}

            {onRun && (
              <button
                onClick={handleRun}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded flex items-center space-x-1 transition"
              >
                <Play className="w-4 h-4" />
                <span>Run</span>
              </button>
            )}

            <button
              onClick={toggleFullscreen}
              className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-gray-300 text-sm rounded"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Monaco Editor */}
      <Editor
        height={isFullscreen ? 'calc(100vh - 50px)' : height}
        language={language}
        theme={theme}
        value={localValue}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          automaticLayout: true,
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-gray-400">
            <Loader className="w-6 h-6 animate-spin" />
          </div>
        }
      />

      {/* Error panel at bottom */}
      {errors.length > 0 && (
        <div className="bg-[#252526] border-t border-red-900 p-3 max-h-32 overflow-y-auto">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-red-400">
              {errors.length} Error{errors.length > 1 ? 's' : ''}
            </span>
          </div>
          {errors.map((error, idx) => (
            <div key={idx} className="text-xs text-red-400 font-mono mb-1">
              {error.line && <span className="text-gray-500">Line {error.line}: </span>}
              {error.message || error.error}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CodeEditor;
