import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from '../hooks/use-toast';
import { Play, Settings, Clock, Database, Info } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ActorDetail = () => {
  const { actorId } = useParams();
  const navigate = useNavigate();
  const [actor, setActor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({});

  // Legacy config for Google Maps scraper (backward compatibility)
  const [config, setConfig] = useState({
    searchTerms: '',
    location: '',
    maxResults: 100,
    extractReviews: false,
    extractImages: false
  });

  useEffect(() => {
    fetchActor();
  }, [actorId]);

  useEffect(() => {
    // Initialize form data from actor's input schema
    if (actor && actor.input_schema && actor.input_schema.properties) {
      const initialData = {};
      Object.entries(actor.input_schema.properties).forEach(([key, field]) => {
        if (field.type === 'boolean') {
          initialData[key] = false;
        } else if (field.type === 'number') {
          initialData[key] = field.default || 0;
        } else if (field.type === 'array') {
          initialData[key] = field.default || [];
        } else {
          initialData[key] = field.default || '';
        }
      });
      setFormData(initialData);
    }
  }, [actor]);

  const fetchActor = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/actors/${actorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActor(response.data);
    } catch (error) {
      console.error('Failed to fetch actor:', error);
      toast({
        title: 'Error',
        description: 'Failed to load actor details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const isGoogleMapsScraper = () => {
    return actor && (actor.name.includes('Google Maps') || actor.template_type === 'google_maps');
  };

  const handleLegacyRun = async () => {
    if (!config.searchTerms && !config.location) {
      toast({
        title: 'Configuration required',
        description: 'Please provide search terms or location',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      
      // Parse search terms (comma or newline separated)
      const searchTerms = config.searchTerms
        .split(/[,\n]+/)
        .map(term => term.trim())
        .filter(term => term.length > 0);

      const inputData = {
        search_terms: searchTerms,
        location: config.location,
        max_results: parseInt(config.maxResults),
        extract_reviews: config.extractReviews,
        extract_images: config.extractImages
      };

      const response = await axios.post(
        `${API}/runs`,
        {
          actor_id: actorId,
          input_data: inputData
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast({
        title: 'Run started!',
        description: `${actor.name} is now running. Check the Runs tab for progress.`
      });

      // Navigate to runs page after a short delay
      setTimeout(() => {
        navigate('/runs');
      }, 1500);
    } catch (error) {
      console.error('Failed to start run:', error);
      toast({
        title: 'Failed to start run',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDynamicRun = async () => {
    // Validate required fields
    if (actor.input_schema && actor.input_schema.required) {
      const missingFields = actor.input_schema.required.filter(field => {
        const value = formData[field];
        return !value || (Array.isArray(value) && value.length === 0);
      });

      if (missingFields.length > 0) {
        const fieldNames = missingFields
          .map(f => actor.input_schema.properties[f]?.title || f)
          .join(', ');
        toast({
          title: 'Required fields missing',
          description: `Please fill in: ${fieldNames}`,
          variant: 'destructive'
        });
        return;
      }
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');

      // Log the data being sent to backend for debugging
      console.log('🚀 Creating run with data:', {
        actor_id: actorId,
        actor_name: actor.name,
        input_data: formData
      });

      const response = await axios.post(
        `${API}/runs`,
        {
          actor_id: actorId,
          input_data: formData
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('✅ Run created successfully:', response.data);

      toast({
        title: 'Run started!',
        description: `${actor.name} is now running. Check the Runs tab for progress.`
      });

      // Navigate to runs page after a short delay
      setTimeout(() => {
        navigate('/runs');
      }, 1500);
    } catch (error) {
      console.error('Failed to start run:', error);
      toast({
        title: 'Failed to start run',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderInputField = (fieldName, fieldConfig) => {
    const isRequired = actor.input_schema?.required?.includes(fieldName);
    const label = fieldConfig.title || fieldName;
    const description = fieldConfig.description || '';

    switch (fieldConfig.type) {
      case 'string':
        if (fieldConfig.editor === 'textarea') {
          return (
            <div key={fieldName}>
              <Label htmlFor={fieldName} className="text-base font-semibold mb-2 block">
                {label} {isRequired && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id={fieldName}
                placeholder={fieldConfig.placeholder || `Enter ${label.toLowerCase()}`}
                value={formData[fieldName] || ''}
                onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.value })}
                className="h-32"
                required={isRequired}
              />
              {description && (
                <p className="text-sm text-gray-500 mt-1">{description}</p>
              )}
            </div>
          );
        }
        return (
          <div key={fieldName}>
            <Label htmlFor={fieldName} className="text-base font-semibold mb-2 block">
              {label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={fieldName}
              placeholder={fieldConfig.placeholder || `Enter ${label.toLowerCase()}`}
              value={formData[fieldName] || ''}
              onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.value })}
              required={isRequired}
            />
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={fieldName}>
            <Label htmlFor={fieldName} className="text-base font-semibold mb-2 block">
              {label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={fieldName}
              type="number"
              placeholder={fieldConfig.placeholder || `Enter ${label.toLowerCase()}`}
              value={formData[fieldName] || ''}
              onChange={(e) => setFormData({ ...formData, [fieldName]: parseFloat(e.target.value) || 0 })}
              min={fieldConfig.minimum}
              max={fieldConfig.maximum}
              required={isRequired}
            />
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={fieldName} className="flex items-center space-x-3">
            <input
              id={fieldName}
              type="checkbox"
              checked={formData[fieldName] || false}
              onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.checked })}
              className="w-4 h-4 text-gray-800 border-gray-300 rounded focus:ring-gray-800"
            />
            <Label htmlFor={fieldName} className="text-base font-medium cursor-pointer">
              {label}
            </Label>
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </div>
        );

      case 'array':
        return (
          <div key={fieldName}>
            <Label htmlFor={fieldName} className="text-base font-semibold mb-2 block">
              {label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={fieldName}
              placeholder={fieldConfig.placeholder || `Enter items (one per line)`}
              value={Array.isArray(formData[fieldName]) ? formData[fieldName].join('\n') : ''}
              onChange={(e) => {
                // Split by newlines, trim each item, and filter out empty strings
                const items = e.target.value
                  .split('\n')
                  .map(item => item.trim())
                  .filter(item => item.length > 0);
                setFormData({ ...formData, [fieldName]: items });
              }}
              className="h-32"
              required={isRequired}
            />
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
          </div>
        );

      default:
        return (
          <div key={fieldName}>
            <Label htmlFor={fieldName} className="text-base font-semibold mb-2 block">
              {label} {isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={fieldName}
              placeholder={`Enter ${label.toLowerCase()}`}
              value={formData[fieldName] || ''}
              onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.value })}
              required={isRequired}
            />
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
          </div>
        );
    }
  };

  const renderDynamicForm = () => {
    if (!actor.input_schema || !actor.input_schema.properties || Object.keys(actor.input_schema.properties).length === 0) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-900">
            <strong>⚠️ No input configuration:</strong> This scraper doesn't have input fields defined yet.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {actor.readme && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <div className="whitespace-pre-wrap">{actor.readme}</div>
              </div>
            </div>
          </div>
        )}

        {Object.entries(actor.input_schema.properties).map(([fieldName, fieldConfig]) =>
          renderInputField(fieldName, fieldConfig)
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🕷️</div>
          <p className="text-gray-600">Loading actor...</p>
        </div>
      </div>
    );
  }

  if (!actor) {
    return <div className="p-8">Actor not found</div>;
  }

  // Use legacy form for Google Maps scraper, dynamic form for others
  const useLegacyForm = isGoogleMapsScraper();

  return (
    <div className="flex-1 bg-white">
      {/* Header */}
      <div className="border-b px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg flex items-center justify-center text-2xl">
              {actor.icon}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{actor.name}</h1>
              <p className="text-gray-600 mt-1">{actor.description}</p>
              {actor.category && (
                <Badge variant="outline" className="mt-2">{actor.category}</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="px-3 py-1">
              {actor.runs_count || 0} runs
            </Badge>
            {actor.is_verified && (
              <Badge className="bg-blue-100 text-blue-800">✓ Verified</Badge>
            )}
            {actor.is_featured && (
              <Badge className="bg-purple-100 text-purple-800">⭐ Featured</Badge>
            )}
          </div>
        </div>
        
        {actor.tags && actor.tags.length > 0 && (
          <div className="flex gap-2 mt-4">
            {actor.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="input" className="px-8 py-6">
        <TabsList className="mb-6">
          <TabsTrigger value="input">
            <Play className="w-4 h-4 mr-2" />
            Run Configuration
          </TabsTrigger>
          <TabsTrigger value="info">
            <Info className="w-4 h-4 mr-2" />
            Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-6">
          <div className="max-w-3xl">
            {useLegacyForm ? (
              // Legacy Google Maps Scraper Form
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-900">
                    <strong>💡 Tip:</strong> This scraper extracts businesses, places, and reviews from Google Maps. 
                    Enter your search terms and location to get started.
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label htmlFor="searchTerms" className="text-base font-semibold mb-2 block">
                      Search Terms *
                    </Label>
                    <Textarea
                      id="searchTerms"
                      placeholder="Enter search terms (one per line or comma-separated)\nExample:\nrestaurant\ncoffee shop\npizza"
                      value={config.searchTerms}
                      onChange={(e) => setConfig({ ...config, searchTerms: e.target.value })}
                      className="h-32"
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Enter one or more search terms. Each term will be searched separately.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="location" className="text-base font-semibold mb-2 block">
                      Location *
                    </Label>
                    <Input
                      id="location"
                      placeholder="e.g., New York, NY or London, UK"
                      value={config.location}
                      onChange={(e) => setConfig({ ...config, location: e.target.value })}
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      The location to search in (city, state, country)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="maxResults" className="text-base font-semibold mb-2 block">
                      Maximum Results
                    </Label>
                    <Input
                      id="maxResults"
                      type="number"
                      placeholder="100"
                      value={config.maxResults}
                      onChange={(e) => setConfig({ ...config, maxResults: e.target.value })}
                      min="1"
                      max="500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Maximum number of results to extract per search term (1-500)
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        id="extractReviews"
                        type="checkbox"
                        checked={config.extractReviews}
                        onChange={(e) => setConfig({ ...config, extractReviews: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <Label htmlFor="extractReviews" className="text-base font-medium cursor-pointer">
                        Extract Reviews
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        id="extractImages"
                        type="checkbox"
                        checked={config.extractImages}
                        onChange={(e) => setConfig({ ...config, extractImages: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <Label htmlFor="extractImages" className="text-base font-medium cursor-pointer">
                        Extract Images
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t">
                  <Button
                    onClick={handleLegacyRun}
                    disabled={submitting}
                    className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white px-8"
                    size="lg"
                  >
                    {submitting ? (
                      <>
                        <Clock className="w-5 h-5 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Start Run
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              // Dynamic Form for Custom Scrapers
              <>
                {renderDynamicForm()}

                <div className="mt-8 pt-6 border-t">
                  <Button
                    onClick={handleDynamicRun}
                    disabled={submitting}
                    className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white px-8"
                    size="lg"
                  >
                    {submitting ? (
                      <>
                        <Clock className="w-5 h-5 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Start Run
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="info">
          <div className="max-w-3xl space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-gray-600">{actor.description}</p>
            </div>

            {actor.readme && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Documentation</h3>
                <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-sm text-gray-700">
                  {actor.readme}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-2">Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="font-medium w-32">Category:</span>
                  <span className="text-gray-600">{actor.category}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Visibility:</span>
                  <span className="text-gray-600">{actor.visibility}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Status:</span>
                  <span className="text-gray-600">{actor.status}</span>
                </div>
                {actor.author_name && (
                  <div className="flex">
                    <span className="font-medium w-32">Author:</span>
                    <span className="text-gray-600">{actor.author_name}</span>
                  </div>
                )}
                {actor.version && (
                  <div className="flex">
                    <span className="font-medium w-32">Version:</span>
                    <span className="text-gray-600">{actor.version}</span>
                  </div>
                )}
              </div>
            </div>

            {actor.tags && actor.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Tags</h3>
                <div className="flex gap-2 flex-wrap">
                  {actor.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ActorDetail;