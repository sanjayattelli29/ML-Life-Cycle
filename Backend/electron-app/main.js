// electron-app/main.js
const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const { fileURLToPath } = require('url');

// Note: __dirname is available by default in CommonJS, so you don't need fileURLToPath
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      contextIsolation: true, // Enable for security
      nodeIntegration: false, // Disable for security
      webSecurity: true, // Enable for proper auth handling
      allowRunningInsecureContent: false, // Better security
      enableRemoteModule: false,
      sandbox: false
    }
  });

  const appUrl = "https://ml-life-cycle.netlify.app";

  // Map of service endpoints for API redirection
  const serviceMap = {
    'metrics': 'http://127.0.0.1:1289',
    'preprocessing': 'http://127.0.0.1:1290',
    'gans': 'http://127.0.0.1:4321',
    'ml': 'http://127.0.0.1:5000'
  };

  // Get the default session
  const defaultSession = session.defaultSession;

  // Clear any existing handlers
  defaultSession.webRequest.onBeforeRequest(null);
  defaultSession.webRequest.onBeforeSendHeaders(null);
  defaultSession.webRequest.onHeadersReceived(null);

  // 1. Handle API request redirection (for your local services only)
  defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    const url = new URL(details.url);
    
    // Don't redirect if it's already a local request, auth request, or offline.html
    if (url.hostname === '127.0.0.1' || 
        url.hostname === 'localhost' ||
        details.url.includes('offline.html') ||
        details.url.includes('/api/auth/') ||
        details.url.includes('/_next/') ||
        details.url.includes('/favicon.ico')) {
      callback({});
      return;
    }

    // Check if this is a local service API request that needs redirection
    for (const [service, localUrl] of Object.entries(serviceMap)) {
      if (url.pathname.includes(`/api/${service}`)) {
        const newUrl = details.url.replace(
          `https://ml-life-cycle.netlify.app/api/${service}`,
          localUrl
        );
        console.log(`Redirecting API call: ${details.url} -> ${newUrl}`);
        callback({ redirectURL: newUrl });
        return;
      }
    }

    // For all other requests, proceed normally
    callback({});
  });

  // 2. Modify request headers only when necessary
  defaultSession.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details, callback) => {
    let requestHeaders = { ...details.requestHeaders };
    
    // Set proper Origin for your Netlify app requests
    if (details.url.includes('ml-life-cycle.netlify.app')) {
      requestHeaders['Origin'] = 'https://ml-life-cycle.netlify.app';
      requestHeaders['Referer'] = 'https://ml-life-cycle.netlify.app/';
    }

    // For local API calls, set appropriate headers
    if (details.url.includes('127.0.0.1') || details.url.includes('localhost')) {
      requestHeaders['Origin'] = 'https://ml-life-cycle.netlify.app';
      requestHeaders['Host'] = new URL(details.url).host;
    }
    
    callback({ requestHeaders });
  });

  // 3. Handle response headers for CORS (only for local services)
  defaultSession.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, callback) => {
    let responseHeaders = { ...details.responseHeaders };

    // Only add CORS headers for local API services
    if (details.url.includes('127.0.0.1') || details.url.includes('localhost')) {
      responseHeaders = {
        ...responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': ['GET, POST, PUT, DELETE, OPTIONS'],
        'Access-Control-Allow-Headers': ['*'],
        'Access-Control-Allow-Credentials': ['true']
      };
    }

    // Handle preflight OPTIONS requests for local services
    if (details.method === 'OPTIONS' && 
        (details.url.includes('127.0.0.1') || details.url.includes('localhost'))) {
      callback({
        responseHeaders,
        statusLine: 'HTTP/1.1 200 OK'
      });
      return;
    }

    callback({ responseHeaders });
  });

  // 4. Set up proper permissions for authentication
  defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // Allow necessary permissions for authentication
    const allowedPermissions = [
      'notifications',
      'geolocation',
      'media',
      'mediaKeySystem',
      'midi',
      'midiSysex'
    ];
    
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // 5. Handle external links and popups (important for OAuth)
  win.webContents.setWindowOpenHandler(({ url }) => {
    // Allow your main app and local services
    if (url.startsWith('https://ml-life-cycle.netlify.app') || 
        url.match(/http:\/\/(localhost|127\.0\.0\.1):(5000|1289|1290|4321)/)) {
      return { action: 'allow' };
    }
    
    // Allow OAuth providers (Google, GitHub, etc.)
    if (url.includes('accounts.google.com') ||
        url.includes('github.com/login') ||
        url.includes('oauth') ||
        url.includes('auth')) {
      return { 
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 600,
          height: 700,
          modal: true,
          parent: win,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        }
      };
    }
    
    return { action: 'deny' };
  });

  // 6. Enable dev tools for debugging (remove in production)
  win.webContents.openDevTools();

  // 7. Handle navigation events
  win.webContents.on('will-navigate', (event, url) => {
    console.log('Navigating to:', url);
    
    // Allow navigation within your app and auth providers
    if (url.startsWith('https://ml-life-cycle.netlify.app') ||
        url.includes('accounts.google.com') ||
        url.includes('github.com') ||
        url.includes('oauth') ||
        url.includes('auth')) {
      return; // Allow navigation
    }
    
    // Block other external navigation
    event.preventDefault();
  });

  // 8. Log requests for debugging
  defaultSession.webRequest.onCompleted({ urls: ['*://*/*'] }, (details) => {
    if (details.url.includes('/api/auth/') || details.statusCode >= 400) {
      console.log('Request completed:', details.url, 'Status:', details.statusCode);
    }
  });

  // 9. Handle load failures with retry logic
  let failedLoadAttempts = 0;
  const MAX_RETRIES = 3;

  const loadAppWithRetry = () => {
    win.loadURL(appUrl).catch(error => {
      console.error('Failed to load app:', error);
      if (error.code && (error.code.includes('ERR_INTERNET_DISCONNECTED') ||
          error.code.includes('ERR_NAME_NOT_RESOLVED'))) {
        win.loadFile(path.join(__dirname, "offline.html"));
      }
    });
  };

  win.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.log('Load failed:', errorCode, errorDescription, 'URL:', validatedURL);
    
    // Don't retry for auth-related URLs or if we've exceeded retries
    if (validatedURL.includes('/api/auth/') || failedLoadAttempts >= MAX_RETRIES) {
      if (failedLoadAttempts >= MAX_RETRIES) {
        win.loadFile(path.join(__dirname, "offline.html"));
      }
      return;
    }
    
    failedLoadAttempts++;
    setTimeout(() => loadAppWithRetry(), 2000);
  });

  // 10. Handle certificate errors for local development
  win.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
    // Allow localhost certificates
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
  });

  // 11. Load the application
  loadAppWithRetry();

  // 12. Handle app focus for better user experience
  win.on('focus', () => {
    // Refresh session when window gains focus (helps with auth state)
    win.webContents.executeJavaScript(`
      if (typeof window !== 'undefined' && window.location) {
        console.log('Window focused, current URL:', window.location.href);
      }
    `).catch(() => {}); // Ignore errors if page not ready
  });

  return win;
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle app security
app.on('web-contents-created', (event, contents) => {
  // Prevent new window creation for security
  contents.on('new-window', (event, url) => {
    event.preventDefault();
  });
  
  // Prevent navigation to external sites
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('https://ml-life-cycle.netlify.app') &&
        !url.includes('accounts.google.com') &&
        !url.includes('github.com') &&
        !url.includes('oauth') &&
        !url.includes('auth')) {
      event.preventDefault();
    }
  });
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const win = windows[0];
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}