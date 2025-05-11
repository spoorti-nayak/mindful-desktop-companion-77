
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => {
    // List of allowed channels to send data to main process
    const validSendChannels = [
      'show-tray', 
      'hide-tray', 
      'set-tray-tooltip', 
      'set-tray-icon',
      'show-native-notification',
      'toggle-focus-mode',
      'save-timer-settings',
      'get-active-window' // Added channel to get active window
    ];
    
    if (validSendChannels.includes(channel)) {
      console.log(`Sending IPC message: ${channel}`, data);
      ipcRenderer.send(channel, data);
    } else {
      console.warn(`Attempted to send to unauthorized channel: ${channel}`);
    }
  },
  receive: (channel, func) => {
    // List of allowed channels to receive data from main process
    const validReceiveChannels = [
      'active-window-changed', 
      'blink-detected',
      'eye-care-reminder',
      'focus-mode-changed',
      'timer-settings-saved'
    ];
    
    if (validReceiveChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` 
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      
      // Return a function to remove the listener to avoid memory leaks
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    } else {
      console.warn(`Attempted to receive from unauthorized channel: ${channel}`);
    }
  }
});

console.log('Preload script loaded successfully');
