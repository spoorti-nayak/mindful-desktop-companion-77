
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Send messages from renderer to main
  send: (channel, data) => {
    // List of allowed channels to send to main process
    const validChannels = ['show-tray', 'hide-tray', 'set-tray-tooltip', 'set-tray-icon', 'show-native-notification'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  // Receive messages from main process
  receive: (channel, callback) => {
    // List of allowed channels to receive from main process
    const validChannels = ['active-window-changed', 'blink-detected', 'eye-care-reminder'];
    if (validChannels.includes(channel)) {
      // Remove any existing listeners to prevent memory leaks
      ipcRenderer.removeAllListeners(channel);
      
      // Add a new listener
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  }
});

// Log that preload script has loaded
console.log('Preload script loaded');
