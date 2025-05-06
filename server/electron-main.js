const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, Notification } = require('electron');
const path = require('path');
const activeWin = require('active-win'); // Updated from get-windows
const express = require('express');
const { BlinkDetector } = require('./services/blink-detector');
const { connectDB } = require('./db/mongodb');
const { app: expressApp } = require('./index');
require('dotenv').config(); // Load environment variables from .env file

let mainWindow;
let tray = null;
let activeWindowInterval;
let blinkDetector;
let server;
let isMonitoring = true;

async function createWindow() {
  // Connect to MongoDB
  await connectDB();
  
  // Start Express server
  const PORT = process.env.PORT || 5000;
  server = expressApp.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
  });

  // Create the browser window and show it by default
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true, // Changed to true to show the window on startup
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  // Load the app - in development, load from the Vite dev server on port 8080
  const startUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:8080' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  console.log(`Loading application from: ${startUrl}`);
    
  mainWindow.loadURL(startUrl);

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Initialize system tray
  createTray();
  
  // Start monitoring active windows
  startActiveWindowMonitoring();
  
  // Initialize blink detection
  initializeBlinkDetection();
  
  // Handle window close event - hide instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      showNotification("App Minimized", "Mindful Desktop Companion is still running in the system tray.");
      return false;
    }
    
    return true;
  });
  
  // Add minimize handler to hide to system tray
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
    showNotification("App Minimized", "Mindful Desktop Companion is still running in the system tray.");
  });
}

function createTray() {
  // Use a proper icon path that works in production
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  
  // Create native image from file
  const trayIcon = nativeImage.createFromPath(iconPath);
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  
  // Create context menu
  updateTrayMenu();
  
  tray.setToolTip('Mindful Desktop Companion');
  
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: mainWindow.isVisible() ? 'Hide App' : 'Show App', 
      click: () => mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show() 
    },
    { 
      label: isMonitoring ? 'Pause Monitoring' : 'Resume Monitoring', 
      click: toggleMonitoring 
    },
    { type: 'separator' },
    { label: 'Quit', click: () => {
      app.isQuitting = true;
      app.quit();
    }}
  ]);
  
  tray.setContextMenu(contextMenu);
}

function startActiveWindowMonitoring() {
  activeWindowInterval = setInterval(async () => {
    if (!isMonitoring) return;
    
    try {
      const activeWindow = await activeWin(); // Updated usage for active-win
      if (activeWindow) {
        mainWindow.webContents.send('active-window-changed', {
          title: activeWindow.title,
          owner: activeWindow.owner?.name || 'Unknown',
          path: activeWindow.owner?.path || 'Unknown'
        });
      }
    } catch (error) {
      console.error('Error getting active window:', error);
    }
  }, 1000);
}

function initializeBlinkDetection() {
  blinkDetector = new BlinkDetector();
  blinkDetector.on('blink', () => {
    mainWindow.webContents.send('blink-detected');
  });
  
  if (isMonitoring) {
    blinkDetector.start();
  }
}

function toggleMonitoring() {
  isMonitoring = !isMonitoring;
  
  if (!isMonitoring) {
    if (activeWindowInterval) {
      clearInterval(activeWindowInterval);
      activeWindowInterval = null;
    }
    
    if (blinkDetector) {
      blinkDetector.stop();
    }
  } else {
    startActiveWindowMonitoring();
    
    if (blinkDetector) {
      blinkDetector.start();
    }
  }
  
  // Update the tray menu to reflect the new state
  updateTrayMenu();
}

// Function to show native notifications
function showNotification(title, body) {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title,
      body: body,
      icon: path.join(__dirname, 'assets', 'icon.png')
    });
    
    notification.show();
  }
}

// Handle IPC events from the renderer
ipcMain.on('show-tray', () => {
  if (!tray) createTray();
});

ipcMain.on('hide-tray', () => {
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

ipcMain.on('set-tray-tooltip', (event, tooltip) => {
  if (tray) tray.setToolTip(tooltip);
});

// Add a new handler for setting tray icon
ipcMain.on('set-tray-icon', (event, iconType) => {
  if (!tray) return;
  
  let iconName = 'icon.png';
  if (iconType === 'active') iconName = 'icon-active.png';
  if (iconType === 'rest') iconName = 'icon-rest.png';
  
  const iconPath = path.join(__dirname, 'assets', iconName);
  const trayIcon = nativeImage.createFromPath(iconPath);
  tray.setImage(trayIcon.resize({ width: 16, height: 16 }));
});

// Add handler for native notifications
ipcMain.on('show-native-notification', (event, {title, body}) => {
  showNotification(title, body);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.isQuitting = true;
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (server) {
    server.close();
  }
});

// Ensure the app doesn't quit when all windows are closed
app.on('window-all-closed', (event) => {
  if (process.platform !== 'darwin') {
    // Don't quit the app
    event.preventDefault();
  }
});
