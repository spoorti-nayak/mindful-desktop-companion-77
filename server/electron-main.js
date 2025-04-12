
const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const activeWin = require('active-win');
const express = require('express');
const { BlinkDetector } = require('./services/blink-detector');
const { connectDB } = require('./db/mongodb');
const { app: expressApp } = require('./index');

let mainWindow;
let tray = null;
let activeWindowInterval;
let blinkDetector;
let server;

async function createWindow() {
  // Connect to MongoDB
  await connectDB();
  
  // Start Express server
  const PORT = process.env.PORT || 5000;
  server = expressApp.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
  });

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  // Load the app - in production, load the bundled app
  const startUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
    
  mainWindow.loadURL(startUrl);

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
      return false;
    }
    
    return true;
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => mainWindow.show() },
    { label: 'Pause Monitoring', click: toggleMonitoring },
    { type: 'separator' },
    { label: 'Quit', click: () => {
      app.isQuitting = true;
      app.quit();
    }}
  ]);
  
  tray.setToolTip('Mindful Desktop Companion');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

function startActiveWindowMonitoring() {
  activeWindowInterval = setInterval(async () => {
    try {
      const result = await activeWin();
      if (result) {
        mainWindow.webContents.send('active-window-changed', {
          title: result.title,
          owner: result.owner.name,
          path: result.owner.path
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
  
  blinkDetector.start();
}

function toggleMonitoring() {
  if (activeWindowInterval) {
    clearInterval(activeWindowInterval);
    activeWindowInterval = null;
    
    if (blinkDetector) {
      blinkDetector.stop();
    }
    
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Show App', click: () => mainWindow.show() },
      { label: 'Resume Monitoring', click: toggleMonitoring },
      { type: 'separator' },
      { label: 'Quit', click: () => {
        app.isQuitting = true;
        app.quit();
      }}
    ]));
  } else {
    startActiveWindowMonitoring();
    
    if (blinkDetector) {
      blinkDetector.start();
    }
    
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Show App', click: () => mainWindow.show() },
      { label: 'Pause Monitoring', click: toggleMonitoring },
      { type: 'separator' },
      { label: 'Quit', click: () => {
        app.isQuitting = true;
        app.quit();
      }}
    ]));
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
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (server) {
    server.close();
  }
});
