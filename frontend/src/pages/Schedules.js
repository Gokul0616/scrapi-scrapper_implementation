import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Clock, Plus, Play, Pause, Trash2, Edit, Calendar, 
  Activity, CheckCircle, XCircle, AlertCircle, Copy, Download, Filter, Search, HelpCircle, X, Info
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Schedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [actors, setActors] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSchedules, setSelectedSchedules] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, paused
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchSchedules();
    fetchActors();
  }, [page]);

  const fetchSchedules = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/schedules?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchedules(response.data.schedules);
      setTotalPages(response.data.pages);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        title: "Error",
        description: "Failed to load schedules",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const fetchActors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/actors?page=1&limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Fetched actors:', response.data); // Debug log
      setActors(response.data || []);
    } catch (error) {
      console.error('Error fetching actors:', error);
      setActors([]);
    }
  };

  const handleToggleSchedule = async (scheduleId, isEnabled) => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = isEnabled ? 'disable' : 'enable';
      await axios.post(
        `${API_URL}/api/schedules/${scheduleId}/${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: "Success",
        description: `Schedule ${isEnabled ? 'disabled' : 'enabled'} successfully`
      });
      
      fetchSchedules();
    } catch (error) {
      console.error('Error toggling schedule:', error);
      toast({
        title: "Error",
        description: "Failed to toggle schedule",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/schedules/${scheduleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({
        title: "Success",
        description: "Schedule deleted successfully"
      });
      
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive"
      });
    }
  };

  const handleRunNow = async (scheduleId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/schedules/${scheduleId}/run-now`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: "Success",
        description: `Run started: ${response.data.run_id}`
      });
    } catch (error) {
      console.error('Error running schedule:', error);
      toast({
        title: "Error",
        description: "Failed to start run",
        variant: "destructive"
      });
    }
  };

  const handleCloneSchedule = async (schedule) => {
    try {
      const token = localStorage.getItem('token');
      const clonedData = {
        name: `${schedule.name} (Copy)`,
        description: schedule.description,
        actor_id: schedule.actor_id,
        cron_expression: schedule.cron_expression,
        timezone: schedule.timezone,
        input_data: schedule.input_data,
        is_enabled: false // Start cloned schedules as disabled
      };
      
      await axios.post(`${API_URL}/api/schedules`, clonedData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({
        title: "Success",
        description: "Schedule cloned successfully"
      });
      
      fetchSchedules();
    } catch (error) {
      console.error('Error cloning schedule:', error);
      toast({
        title: "Error",
        description: "Failed to clone schedule",
        variant: "destructive"
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSchedules.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedSchedules.length} schedule(s)?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await Promise.all(
        selectedSchedules.map(id => 
          axios.delete(`${API_URL}/api/schedules/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );
      
      toast({
        title: "Success",
        description: `${selectedSchedules.length} schedule(s) deleted successfully`
      });
      
      setSelectedSchedules([]);
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedules:', error);
      toast({
        title: "Error",
        description: "Failed to delete some schedules",
        variant: "destructive"
      });
    }
  };

  const handleBulkToggle = async (enable) => {
    if (selectedSchedules.length === 0) return;

    try {
      const token = localStorage.getItem('token');
      const endpoint = enable ? 'enable' : 'disable';
      
      await Promise.all(
        selectedSchedules.map(id => 
          axios.post(
            `${API_URL}/api/schedules/${id}/${endpoint}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );
      
      toast({
        title: "Success",
        description: `${selectedSchedules.length} schedule(s) ${enable ? 'enabled' : 'disabled'} successfully`
      });
      
      setSelectedSchedules([]);
      fetchSchedules();
    } catch (error) {
      console.error('Error toggling schedules:', error);
      toast({
        title: "Error",
        description: "Failed to toggle some schedules",
        variant: "destructive"
      });
    }
  };

  const handleExportSchedules = () => {
    const exportData = schedules.map(s => ({
      name: s.name,
      description: s.description,
      actor_name: s.actor_name,
      cron_expression: s.cron_expression,
      timezone: s.timezone,
      is_enabled: s.is_enabled,
      run_count: s.run_count,
      last_status: s.last_status
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedules-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Schedules exported successfully"
    });
  };

  const toggleSelectSchedule = (scheduleId) => {
    setSelectedSchedules(prev => 
      prev.includes(scheduleId) 
        ? prev.filter(id => id !== scheduleId)
        : [...prev, scheduleId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSchedules.length === filteredSchedules.length) {
      setSelectedSchedules([]);
    } else {
      setSelectedSchedules(filteredSchedules.map(s => s.id));
    }
  };

  // Filter and search schedules
  const filteredSchedules = useMemo(() => {
    let filtered = schedules;

    // Apply status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter(s => s.is_enabled);
    } else if (filterStatus === 'paused') {
      filtered = filtered.filter(s => !s.is_enabled);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.actor_name.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [schedules, filterStatus, searchQuery]);

  const formatNextRun = (nextRun) => {
    if (!nextRun) return 'N/A';
    const date = new Date(nextRun);
    const now = new Date();
    const diff = date - now;
    
    if (diff < 0) return 'Overdue';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `in ${days}d ${hours % 24}h`;
    if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
    return `in ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedules</h1>
          <p className="text-gray-600 mt-1">Automate your scraping tasks with cron-based schedules</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={20} />
          Create Schedule
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search schedules by name, actor, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-gray-600" size={20} />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          >
            <option value="all">All Schedules</option>
            <option value="active">Active Only</option>
            <option value="paused">Paused Only</option>
          </select>
          <button
            onClick={handleExportSchedules}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            title="Export schedules"
          >
            <Download size={20} />
            Export
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedSchedules.length > 0 && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">
              {selectedSchedules.length} schedule(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkToggle(true)}
                className="px-3 py-1.5 text-sm bg-black text-white rounded hover:bg-gray-800 transition-colors"
              >
                Enable All
              </button>
              <button
                onClick={() => handleBulkToggle(false)}
                className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors"
              >
                Disable All
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 text-sm bg-white border border-gray-400 rounded hover:bg-gray-200 transition-colors"
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Schedules</p>
              <p className="text-2xl font-bold text-black mt-1">{schedules.length}</p>
            </div>
            <Calendar className="text-black" size={32} />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-black mt-1">
                {schedules.filter(s => s.is_enabled).length}
              </p>
            </div>
            <Activity className="text-black" size={32} />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Paused</p>
              <p className="text-2xl font-bold text-gray-700 mt-1">
                {schedules.filter(s => !s.is_enabled).length}
              </p>
            </div>
            <Pause className="text-gray-700" size={32} />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Runs</p>
              <p className="text-2xl font-bold text-black mt-1">
                {schedules.reduce((sum, s) => sum + (s.run_count || 0), 0)}
              </p>
            </div>
            <Play className="text-black" size={32} />
          </div>
        </div>
      </div>

      {/* Schedules List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredSchedules.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No schedules yet</h3>
            <p className="text-gray-600 mb-4">Create your first schedule to automate your scraping tasks</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Create Schedule
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedSchedules.length === filteredSchedules.length && filteredSchedules.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-black border-gray-300 rounded focus:ring-gray-800"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Run
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Runs
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSchedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedSchedules.includes(schedule.id)}
                        onChange={() => toggleSelectSchedule(schedule.id)}
                        className="w-4 h-4 text-black border-gray-300 rounded focus:ring-gray-800"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{schedule.name}</div>
                        {schedule.description && (
                          <div className="text-sm text-gray-500">{schedule.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{schedule.actor_icon || '🤖'}</span>
                        <span className="text-sm text-gray-900">{schedule.actor_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{schedule.human_readable || schedule.cron_expression}</div>
                      <div className="text-xs text-gray-500">{schedule.cron_expression}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {schedule.is_enabled ? formatNextRun(schedule.next_run) : '-'}
                      </div>
                      {schedule.is_enabled && schedule.next_run && (
                        <div className="text-xs text-gray-500">
                          {new Date(schedule.next_run).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        schedule.is_enabled 
                          ? 'bg-black text-white' 
                          : 'bg-gray-200 text-gray-800'
                      }`}>
                        {schedule.is_enabled ? <CheckCircle size={12} /> : <Pause size={12} />}
                        {schedule.is_enabled ? 'Active' : 'Paused'}
                      </span>
                      {schedule.last_status && (
                        <div className="mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                            schedule.last_status === 'success' 
                              ? 'bg-gray-800 text-white' 
                              : 'bg-gray-300 text-black'
                          }`}>
                            {schedule.last_status === 'success' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                            Last: {schedule.last_status}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {schedule.run_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRunNow(schedule.id)}
                          className="text-black hover:text-gray-700 p-1 rounded hover:bg-gray-100 border border-gray-300"
                          title="Run now"
                        >
                          <Play size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleSchedule(schedule.id, schedule.is_enabled)}
                          className={`p-1 rounded border border-gray-300 ${
                            schedule.is_enabled 
                              ? 'text-gray-600 hover:text-black hover:bg-gray-100' 
                              : 'text-black hover:text-gray-700 hover:bg-gray-100'
                          }`}
                          title={schedule.is_enabled ? 'Pause' : 'Activate'}
                        >
                          {schedule.is_enabled ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <button
                          onClick={() => handleCloneSchedule(schedule)}
                          className="text-gray-600 hover:text-black p-1 rounded hover:bg-gray-100 border border-gray-300"
                          title="Clone"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSchedule(schedule);
                            setShowEditModal(true);
                          }}
                          className="text-gray-600 hover:text-black p-1 rounded hover:bg-gray-100 border border-gray-300"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="text-black hover:text-gray-700 p-1 rounded hover:bg-gray-200 border border-gray-400"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <ScheduleModal
          isEdit={showEditModal}
          schedule={selectedSchedule}
          actors={actors}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedSchedule(null);
          }}
          onSuccess={() => {
            fetchSchedules();
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedSchedule(null);
          }}
        />
      )}
    </div>
  );
};

// Dynamic Input Field Component
const DynamicInputField = ({ fieldKey, schema, value, onChange }) => {
  const [arrayInput, setArrayInput] = useState('');
  
  // Get field properties
  const fieldType = schema.type || 'string';
  const fieldTitle = schema.title || schema.description || fieldKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const fieldDescription = schema.description || '';
  const isRequired = schema.required || false;
  const defaultValue = schema.default;
  const placeholder = schema.example ? JSON.stringify(schema.example) : '';

  // Handle array type (like search_terms)
  if (fieldType === 'array') {
    const currentArray = Array.isArray(value) ? value : [];
    
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {fieldTitle} {isRequired && <span className="text-red-500">*</span>}
        </label>
        {fieldDescription && (
          <p className="text-xs text-gray-500 mb-2">{fieldDescription}</p>
        )}
        <div className="space-y-2">
          {currentArray.map((item, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const newArray = [...currentArray];
                  newArray[index] = e.target.value;
                  onChange(newArray);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Item ${index + 1}`}
              />
              <button
                type="button"
                onClick={() => {
                  const newArray = currentArray.filter((_, i) => i !== index);
                  onChange(newArray);
                }}
                className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={arrayInput}
              onChange={(e) => setArrayInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (arrayInput.trim()) {
                    onChange([...currentArray, arrayInput.trim()]);
                    setArrayInput('');
                  }
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Type and press Enter to add"
            />
            <button
              type="button"
              onClick={() => {
                if (arrayInput.trim()) {
                  onChange([...currentArray, arrayInput.trim()]);
                  setArrayInput('');
                }
              }}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle boolean type
  if (fieldType === 'boolean') {
    return (
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={value ?? defaultValue ?? false}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <div>
          <label className="text-sm font-medium text-gray-700">
            {fieldTitle}
          </label>
          {fieldDescription && (
            <p className="text-xs text-gray-500 mt-0.5">{fieldDescription}</p>
          )}
        </div>
      </div>
    );
  }

  // Handle integer/number type
  if (fieldType === 'integer' || fieldType === 'number') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {fieldTitle} {isRequired && <span className="text-red-500">*</span>}
        </label>
        {fieldDescription && (
          <p className="text-xs text-gray-500 mb-2">{fieldDescription}</p>
        )}
        <input
          type="number"
          value={value ?? defaultValue ?? ''}
          onChange={(e) => {
            const val = e.target.value === '' ? undefined : (fieldType === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value));
            onChange(val);
          }}
          min={schema.minimum}
          max={schema.maximum}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={placeholder || `Enter ${fieldTitle.toLowerCase()}`}
        />
      </div>
    );
  }

  // Handle string type (default)
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {fieldTitle} {isRequired && <span className="text-red-500">*</span>}
      </label>
      {fieldDescription && (
        <p className="text-xs text-gray-500 mb-2">{fieldDescription}</p>
      )}
      <input
        type="text"
        value={value ?? defaultValue ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={placeholder || `Enter ${fieldTitle.toLowerCase()}`}
      />
    </div>
  );
};

// Schedule Modal Component
const ScheduleModal = ({ isEdit, schedule, actors, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: schedule?.name || '',
    description: schedule?.description || '',
    actor_id: schedule?.actor_id || '',
    cron_expression: schedule?.cron_expression || '0 0 * * *',
    timezone: schedule?.timezone || 'UTC',
    input_data: schedule?.input_data || {},
    is_enabled: schedule?.is_enabled ?? true
  });
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedActor, setSelectedActor] = useState(null);
  const { toast } = useToast();

  // Update selected actor when actor_id changes
  useEffect(() => {
    if (formData.actor_id && actors.length > 0) {
      const actor = actors.find(a => a.id === formData.actor_id);
      setSelectedActor(actor);
      console.log('Selected actor:', actor); // Debug log
    } else {
      setSelectedActor(null);
    }
  }, [formData.actor_id, actors]);

  const cronPresets = [
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every 6 hours', value: '0 */6 * * *' },
    { label: 'Daily at midnight', value: '0 0 * * *' },
    { label: 'Daily at noon', value: '0 12 * * *' },
    { label: 'Weekly (Sundays)', value: '0 0 * * 0' },
    { label: 'Monthly (1st)', value: '0 0 1 * *' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = isEdit 
        ? `${API_URL}/api/schedules/${schedule.id}` 
        : `${API_URL}/api/schedules`;
      
      const method = isEdit ? 'patch' : 'post';
      
      await axios[method](url, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast({
        title: "Success",
        description: `Schedule ${isEdit ? 'updated' : 'created'} successfully`
      });

      onSuccess();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || `Failed to ${isEdit ? 'update' : 'create'} schedule`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Schedule' : 'Create Schedule'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Daily Product Scrape"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actor *
            </label>
            <select
              value={formData.actor_id}
              onChange={(e) => setFormData({ ...formData, actor_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              required
            >
              <option value="">Select an actor</option>
              {actors && actors.length > 0 ? (
                actors.map(actor => (
                  <option key={actor.id} value={actor.id}>
                    {actor.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>No actors available</option>
              )}
            </select>
            {formData.actor_id === '' && actors.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ Please create an actor first before scheduling
              </p>
            )}
            {selectedActor && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-xl">{selectedActor.icon || '🤖'}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      {selectedActor.name}
                    </p>
                    {selectedActor.description && (
                      <p className="text-xs text-blue-700 mt-1">
                        {selectedActor.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frequency Preset
            </label>
            <select
              value={formData.cron_expression}
              onChange={(e) => setFormData({ ...formData, cron_expression: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {cronPresets.map(preset => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Custom Cron Expression
              </label>
              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
              >
                <HelpCircle size={16} />
                <span>Need help?</span>
              </button>
            </div>
            <input
              type="text"
              value={formData.cron_expression}
              onChange={(e) => setFormData({ ...formData, cron_expression: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              placeholder="0 0 * * *"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: minute hour day month weekday (e.g., "0 0 * * *" = daily at midnight)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST/EDT)</option>
              <option value="America/Chicago">America/Chicago (CST/CDT)</option>
              <option value="America/Denver">America/Denver (MST/MDT)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
              <option value="Australia/Sydney">Australia/Sydney (AEDT/AEST)</option>
            </select>
          </div>

          {/* Dynamic Input Fields Based on Actor Schema */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Input Configuration
            </label>
            
            {selectedActor && selectedActor.input_schema ? (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {Object.entries(selectedActor.input_schema).map(([key, schema]) => (
                  <DynamicInputField
                    key={key}
                    fieldKey={key}
                    schema={schema}
                    value={formData.input_data[key]}
                    onChange={(value) => {
                      setFormData({
                        ...formData,
                        input_data: { ...formData.input_data, [key]: value }
                      });
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                <p className="text-sm text-gray-600">
                  {formData.actor_id ? 'Loading input fields...' : 'Select an actor to see input fields'}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_enabled"
              checked={formData.is_enabled}
              onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_enabled" className="ml-2 text-sm text-gray-700">
              Enable schedule immediately
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-400 rounded-lg hover:bg-gray-100 transition-colors text-black"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (isEdit ? 'Update Schedule' : 'Create Schedule')}
            </button>
          </div>
        </form>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Info className="text-blue-600" size={24} />
                Scheduling Guide
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Cron Expression Basics */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Cron Expression Format</h3>
                <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
                  <div className="grid grid-cols-5 gap-4 mb-2">
                    <div className="text-center">
                      <div className="font-bold text-blue-600">*</div>
                      <div className="text-xs mt-1">Minute</div>
                      <div className="text-xs text-gray-600">(0-59)</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-blue-600">*</div>
                      <div className="text-xs mt-1">Hour</div>
                      <div className="text-xs text-gray-600">(0-23)</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-blue-600">*</div>
                      <div className="text-xs mt-1">Day</div>
                      <div className="text-xs text-gray-600">(1-31)</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-blue-600">*</div>
                      <div className="text-xs mt-1">Month</div>
                      <div className="text-xs text-gray-600">(1-12)</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-blue-600">*</div>
                      <div className="text-xs mt-1">Weekday</div>
                      <div className="text-xs text-gray-600">(0-7)</div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Note: For weekday, 0 and 7 both represent Sunday
                </p>
              </section>

              {/* Special Characters */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Special Characters</h3>
                <div className="space-y-2">
                  <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    <code className="font-mono font-bold text-blue-600 text-lg">*</code>
                    <div className="flex-1">
                      <div className="font-medium">Any value</div>
                      <div className="text-sm text-gray-600">Matches all possible values for that field</div>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    <code className="font-mono font-bold text-blue-600 text-lg">,</code>
                    <div className="flex-1">
                      <div className="font-medium">Value list separator</div>
                      <div className="text-sm text-gray-600">Example: "1,15" in hour = 1 AM and 3 PM</div>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    <code className="font-mono font-bold text-blue-600 text-lg">-</code>
                    <div className="flex-1">
                      <div className="font-medium">Range of values</div>
                      <div className="text-sm text-gray-600">Example: "1-5" in weekday = Monday to Friday</div>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    <code className="font-mono font-bold text-blue-600 text-lg">/</code>
                    <div className="flex-1">
                      <div className="font-medium">Step values</div>
                      <div className="text-sm text-gray-600">Example: "*/15" in minute = every 15 minutes</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Common Examples */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Common Examples</h3>
                <div className="space-y-3">
                  <div className="border-l-4 border-blue-500 pl-4 py-2">
                    <code className="font-mono text-blue-600 font-semibold">* * * * *</code>
                    <p className="text-sm text-gray-700 mt-1">Every minute</p>
                  </div>
                  <div className="border-l-4 border-green-500 pl-4 py-2">
                    <code className="font-mono text-green-600 font-semibold">*/5 * * * *</code>
                    <p className="text-sm text-gray-700 mt-1">Every 5 minutes</p>
                  </div>
                  <div className="border-l-4 border-purple-500 pl-4 py-2">
                    <code className="font-mono text-purple-600 font-semibold">0 * * * *</code>
                    <p className="text-sm text-gray-700 mt-1">Every hour (at minute 0)</p>
                  </div>
                  <div className="border-l-4 border-orange-500 pl-4 py-2">
                    <code className="font-mono text-orange-600 font-semibold">0 */6 * * *</code>
                    <p className="text-sm text-gray-700 mt-1">Every 6 hours</p>
                  </div>
                  <div className="border-l-4 border-red-500 pl-4 py-2">
                    <code className="font-mono text-red-600 font-semibold">0 0 * * *</code>
                    <p className="text-sm text-gray-700 mt-1">Daily at midnight (00:00)</p>
                  </div>
                  <div className="border-l-4 border-indigo-500 pl-4 py-2">
                    <code className="font-mono text-indigo-600 font-semibold">0 9 * * *</code>
                    <p className="text-sm text-gray-700 mt-1">Daily at 9:00 AM</p>
                  </div>
                  <div className="border-l-4 border-pink-500 pl-4 py-2">
                    <code className="font-mono text-pink-600 font-semibold">0 9 * * 1-5</code>
                    <p className="text-sm text-gray-700 mt-1">Weekdays at 9:00 AM (Monday to Friday)</p>
                  </div>
                  <div className="border-l-4 border-teal-500 pl-4 py-2">
                    <code className="font-mono text-teal-600 font-semibold">0 0 * * 0</code>
                    <p className="text-sm text-gray-700 mt-1">Every Sunday at midnight</p>
                  </div>
                  <div className="border-l-4 border-yellow-500 pl-4 py-2">
                    <code className="font-mono text-yellow-600 font-semibold">0 0 1 * *</code>
                    <p className="text-sm text-gray-700 mt-1">First day of every month at midnight</p>
                  </div>
                  <div className="border-l-4 border-cyan-500 pl-4 py-2">
                    <code className="font-mono text-cyan-600 font-semibold">0 12 1 */3 *</code>
                    <p className="text-sm text-gray-700 mt-1">Every 3 months on the 1st at noon</p>
                  </div>
                  <div className="border-l-4 border-gray-500 pl-4 py-2">
                    <code className="font-mono text-gray-600 font-semibold">30 2 * * 6,0</code>
                    <p className="text-sm text-gray-700 mt-1">Weekends (Saturday & Sunday) at 2:30 AM</p>
                  </div>
                </div>
              </section>

              {/* Advanced Examples */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Advanced Examples</h3>
                <div className="space-y-3">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                    <code className="font-mono text-blue-700 font-semibold">0 9,12,15,18 * * *</code>
                    <p className="text-sm text-gray-700 mt-1">Four times daily: 9 AM, 12 PM, 3 PM, 6 PM</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                    <code className="font-mono text-green-700 font-semibold">0 8-17 * * 1-5</code>
                    <p className="text-sm text-gray-700 mt-1">Every hour from 8 AM to 5 PM, Monday through Friday</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                    <code className="font-mono text-purple-700 font-semibold">*/30 9-17 * * 1-5</code>
                    <p className="text-sm text-gray-700 mt-1">Every 30 minutes during business hours (9 AM - 5 PM), weekdays</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
                    <code className="font-mono text-orange-700 font-semibold">0 0 1,15 * *</code>
                    <p className="text-sm text-gray-700 mt-1">Twice a month: 1st and 15th at midnight</p>
                  </div>
                </div>
              </section>

              {/* Tips and Best Practices */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Tips & Best Practices</h3>
                <div className="space-y-2">
                  <div className="flex gap-2 p-3 bg-blue-50 rounded-lg">
                    <CheckCircle className="text-blue-600 flex-shrink-0" size={20} />
                    <p className="text-sm text-gray-700">
                      <strong>Test your schedule:</strong> Use the frequency presets or verify your cron expression online at crontab.guru
                    </p>
                  </div>
                  <div className="flex gap-2 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
                    <p className="text-sm text-gray-700">
                      <strong>Consider timezone:</strong> All times are based on the timezone you select. Default is UTC
                    </p>
                  </div>
                  <div className="flex gap-2 p-3 bg-purple-50 rounded-lg">
                    <CheckCircle className="text-purple-600 flex-shrink-0" size={20} />
                    <p className="text-sm text-gray-700">
                      <strong>Avoid overlapping:</strong> Make sure your actor can complete before the next scheduled run
                    </p>
                  </div>
                  <div className="flex gap-2 p-3 bg-amber-50 rounded-lg">
                    <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
                    <p className="text-sm text-gray-700">
                      <strong>Monitor usage:</strong> Frequent schedules consume more resources. Balance frequency with your needs
                    </p>
                  </div>
                </div>
              </section>

              {/* External Resources */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Need More Help?</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 mb-2">
                    Use these online tools to help build and test your cron expressions:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <a href="https://crontab.guru" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        crontab.guru - Quick and simple cron editor
                      </a>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <a href="https://crontab-generator.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        crontab-generator.org - Visual cron generator
                      </a>
                    </li>
                  </ul>
                </div>
              </section>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowHelp(false)}
                  className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedules;
