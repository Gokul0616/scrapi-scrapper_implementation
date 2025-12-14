// craco.config.js
const path = require("path");
require("dotenv").config();

// Environment variable overrides
const config = {
  disableHotReload: process.env.DISABLE_HOT_RELOAD === "true",
  enableVisualEdits: process.env.REACT_APP_ENABLE_VISUAL_EDITS === "true",
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

// Conditionally load visual editing modules only if enabled
let babelMetadataPlugin;
let setupDevServer;

if (config.enableVisualEdits) {
  babelMetadataPlugin = require("./plugins/visual-edits/babel-metadata-plugin");
  setupDevServer = require("./plugins/visual-edits/dev-server-setup");
}

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

const webpackConfig = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {

      // Disable hot reload completely if environment variable is set
      if (config.disableHotReload) {
        // Remove hot reload related plugins
        webpackConfig.plugins = webpackConfig.plugins.filter(plugin => {
          return !(plugin.constructor.name === 'HotModuleReplacementPlugin');
        });

        // Disable watch mode
        webpackConfig.watch = false;
        webpackConfig.watchOptions = {
          ignored: /.*/, // Ignore all files
        };
      } else {
        // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
          ],
        };
      }

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }

      return webpackConfig;
    },
  },
};

// Only add babel plugin if visual editing is enabled
if (config.enableVisualEdits) {
  webpackConfig.babel = {
    plugins: [babelMetadataPlugin],
  };
}

// Setup dev server
webpackConfig.devServer = (devServerConfig) => {
  // Configure WebSocket dynamically based on REACT_APP_BACKEND_URL
  devServerConfig.client = devServerConfig.client || {};
  devServerConfig.client.overlay = false;
  
  // Extract hostname from REACT_APP_BACKEND_URL to ensure consistency
  let wsHostname = 'localhost';
  let wsProtocol = 'ws';
  let wsPort = 3000;
  
  if (process.env.REACT_APP_BACKEND_URL) {
    try {
      const backendUrl = new URL(process.env.REACT_APP_BACKEND_URL);
      wsHostname = backendUrl.hostname;
      wsProtocol = backendUrl.protocol === 'https:' ? 'wss' : 'ws';
      wsPort = backendUrl.protocol === 'https:' ? 443 : 80;
    } catch (e) {
      console.warn('Failed to parse REACT_APP_BACKEND_URL, using defaults');
    }
  }
  
  // Allow override via WDS_SOCKET_HOST if explicitly set
  if (process.env.WDS_SOCKET_HOST) {
    wsHostname = process.env.WDS_SOCKET_HOST;
  }
  if (process.env.WDS_SOCKET_PORT) {
    wsPort = process.env.WDS_SOCKET_PORT;
  }
  if (process.env.WDS_SOCKET_PROTOCOL) {
    wsProtocol = process.env.WDS_SOCKET_PROTOCOL;
  }
  
  devServerConfig.client.webSocketURL = {
    protocol: wsProtocol,
    hostname: wsHostname,
    port: wsPort,
    pathname: '/ws'
  };

  // Apply visual edits dev server setup if enabled
  if (config.enableVisualEdits && setupDevServer) {
    devServerConfig = setupDevServer(devServerConfig);
  }

  // Add health check endpoints if enabled
  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // Call original setup if exists
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }

      // Setup health endpoints
      setupHealthEndpoints(devServer, healthPluginInstance);

      return middlewares;
    };
  }

  devServerConfig.historyApiFallback = true;
  return devServerConfig;
};

module.exports = webpackConfig;
