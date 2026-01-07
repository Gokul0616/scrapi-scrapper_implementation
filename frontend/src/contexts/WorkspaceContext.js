import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const WorkspaceProvider = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load workspace from localStorage or set default
  useEffect(() => {
    if (user) {
      const savedWorkspace = localStorage.getItem('activeWorkspace');
      if (savedWorkspace) {
        try {
          const parsed = JSON.parse(savedWorkspace);
          setCurrentWorkspace(parsed);
        } catch (e) {
          console.error('Failed to parse saved workspace:', e);
          setDefaultWorkspace();
        }
      } else {
        setDefaultWorkspace();
      }
      fetchWorkspaces();
    } else {
      setCurrentWorkspace(null);
      setWorkspaces([]);
      setLoading(false);
    }
  }, [user]);

  const setDefaultWorkspace = () => {
    if (user) {
      const defaultWorkspace = {
        workspace_type: 'personal',
        workspace_id: user.id,
        workspace_name: user.username || 'Personal',
        role: null
      };
      setCurrentWorkspace(defaultWorkspace);
      localStorage.setItem('activeWorkspace', JSON.stringify(defaultWorkspace));
    }
  };

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/organizations/workspaces`);
      setWorkspaces(response.data.workspaces || []);
      
      // If current workspace is not set, use the one from backend
      if (!currentWorkspace && response.data.current_workspace) {
        setCurrentWorkspace(response.data.current_workspace);
        localStorage.setItem('activeWorkspace', JSON.stringify(response.data.current_workspace));
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
      // Set default personal workspace on error
      if (!currentWorkspace) {
        setDefaultWorkspace();
      }
    } finally {
      setLoading(false);
    }
  };

  const switchWorkspace = (workspace) => {
    setCurrentWorkspace(workspace);
    localStorage.setItem('activeWorkspace', JSON.stringify(workspace));
    
    // Dispatch event to notify components about workspace change
    window.dispatchEvent(new CustomEvent('workspaceChanged', { detail: workspace }));
    
    // Optionally refresh the page to reload data for new workspace
    window.location.reload();
  };

  const refreshWorkspaces = async () => {
    await fetchWorkspaces();
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        loading,
        switchWorkspace,
        refreshWorkspaces
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
};
