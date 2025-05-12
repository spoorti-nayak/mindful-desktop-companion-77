
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import SystemTrayService from '@/services/SystemTrayService';
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { FocusModeAlert } from '@/components/focus/FocusModeAlert';

interface FocusModeContextType {
  isFocusMode: boolean;
  toggleFocusMode: () => void;
  whitelist: string[];
  addToWhitelist: (app: string) => void;
  removeFromWhitelist: (app: string) => void;
  dimInsteadOfBlock: boolean;
  toggleDimOption: () => void;
}

const FocusModeContext = createContext<FocusModeContextType | undefined>(undefined);

export const useFocusMode = () => {
  const context = useContext(FocusModeContext);
  if (context === undefined) {
    throw new Error('useFocusMode must be used within a FocusModeProvider');
  }
  return context;
};

export const FocusModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [dimInsteadOfBlock, setDimInsteadOfBlock] = useState(true);
  const [lastActiveWindow, setLastActiveWindow] = useState<string | null>(null);
  const [previousActiveWindow, setPreviousActiveWindow] = useState<string | null>(null);
  const [lastNotificationDismissed, setLastNotificationDismissed] = useState<string | null>(null);
  const [showingAlert, setShowingAlert] = useState(false);
  const [currentAlertApp, setCurrentAlertApp] = useState<string | null>(null);
  const { toast: centerToast } = useToast();
  
  // Load saved whitelist from localStorage on initial mount only
  useEffect(() => {
    const savedWhitelist = localStorage.getItem('focusModeWhitelist');
    if (savedWhitelist) {
      try {
        setWhitelist(JSON.parse(savedWhitelist));
      } catch (e) {
        console.error("Failed to parse whitelist:", e);
        setWhitelist([]);
      }
    }
    
    const savedDimOption = localStorage.getItem('focusModeDimOption');
    if (savedDimOption) {
      try {
        setDimInsteadOfBlock(JSON.parse(savedDimOption) === true);
      } catch (e) {
        console.error("Failed to parse dim option:", e);
      }
    }
    
    const savedFocusMode = localStorage.getItem('focusModeEnabled');
    if (savedFocusMode === 'true') {
      setIsFocusMode(true);
    }
    
    // Register for active window change events using custom event listener
    const handleActiveWindowChanged = (event: CustomEvent<string>) => {
      const newWindow = event.detail;
      console.log("Window changed to:", newWindow, "Previous:", lastActiveWindow);
      
      setPreviousActiveWindow(lastActiveWindow);
      setLastActiveWindow(newWindow);
    };
    
    // Track dismissed notifications
    const handleNotificationDismissed = (event: CustomEvent<string>) => {
      console.log("Notification dismissed:", event.detail);
      setLastNotificationDismissed(event.detail);
      setShowingAlert(false);
    };
    
    // Use standard event listener since SystemTrayService doesn't have a receive method
    window.addEventListener('active-window-changed', handleActiveWindowChanged as EventListener);
    window.addEventListener('notification-dismissed', handleNotificationDismissed as EventListener);
    
    // Request the current active window
    if (window.electron) {
      window.electron.send('get-active-window');
    }
    
    return () => {
      window.removeEventListener('active-window-changed', handleActiveWindowChanged as EventListener);
      window.removeEventListener('notification-dismissed', handleNotificationDismissed as EventListener);
    };
  }, []);
  
  // Save whitelist whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('focusModeWhitelist', JSON.stringify(whitelist));
    } catch (e) {
      console.error("Failed to save whitelist:", e);
    }
  }, [whitelist]);
  
  // Save dim option whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('focusModeDimOption', JSON.stringify(dimInsteadOfBlock));
    } catch (e) {
      console.error("Failed to save dim option:", e);
    }
  }, [dimInsteadOfBlock]);
  
  // Save focus mode state
  useEffect(() => {
    try {
      localStorage.setItem('focusModeEnabled', isFocusMode ? 'true' : 'false');
    } catch (e) {
      console.error("Failed to save focus mode state:", e);
    }
  }, [isFocusMode]);
  
  // Monitor active window changes when focus mode is active
  useEffect(() => {
    if (!isFocusMode || !lastActiveWindow) return;

    // Extract just the app name for better matching
    const currentAppName = extractAppName(lastActiveWindow);
    
    // Check if the current app is in the whitelist
    const isCurrentAppWhitelisted = isAppInWhitelist(currentAppName, whitelist);
    
    console.log("Focus check:", currentAppName, "Whitelisted:", isCurrentAppWhitelisted);
    
    // Always show notification for non-whitelisted apps when focus mode is active
    if (!isCurrentAppWhitelisted && currentAppName) {
      console.log("Non-whitelisted app detected:", currentAppName);
      handleNonWhitelistedApp(currentAppName);
    } else if (showingAlert) {
      // If we're now in a whitelisted app but still showing an alert, clear it
      setShowingAlert(false);
    }
  }, [isFocusMode, lastActiveWindow, whitelist, showingAlert]);
  
  // Extract the core app name from window title for more reliable matching
  const extractAppName = (windowTitle: string): string => {
    if (!windowTitle) return '';
    
    // Common patterns in window titles
    const appNameMatches = windowTitle.match(/^(.*?)(?:\s[-–—]\s|\s\|\s|\s:|\s\d|$)/);
    return appNameMatches?.[1]?.trim() || windowTitle.trim();
  };
  
  // More flexible app matching against whitelist
  const isAppInWhitelist = (appName: string, whitelist: string[]): boolean => {
    if (!appName) return false;
    
    const normalizedAppName = appName.toLowerCase();
    
    return whitelist.some(whitelistedApp => {
      const normalizedWhitelistedApp = whitelistedApp.toLowerCase();
      return normalizedAppName.includes(normalizedWhitelistedApp) || 
             normalizedWhitelistedApp.includes(normalizedAppName);
    });
  };
  
  const toggleFocusMode = useCallback(() => {
    const newState = !isFocusMode;
    setIsFocusMode(newState);
    
    // Notify user of mode change
    if (newState) {
      // Send to electron main process to update tray icon
      if (window.electron) {
        window.electron.send('toggle-focus-mode', true);
      }
      
      toast.success("Focus Mode activated", {
        description: "You'll be notified when using non-whitelisted apps",
      });
      
      // Immediately check current window against whitelist
      if (lastActiveWindow) {
        const currentAppName = extractAppName(lastActiveWindow);
        const isCurrentAppWhitelisted = isAppInWhitelist(currentAppName, whitelist);
        
        if (!isCurrentAppWhitelisted && currentAppName) {
          // Small delay to allow toast to show first
          setTimeout(() => {
            handleNonWhitelistedApp(currentAppName);
          }, 500);
        }
      }
    } else {
      // Send to electron main process to update tray icon
      if (window.electron) {
        window.electron.send('toggle-focus-mode', false);
      }
      
      // Clear any alert when disabling focus mode
      setShowingAlert(false);
      
      toast.info("Focus Mode deactivated");
    }
  }, [isFocusMode, lastActiveWindow, whitelist]);
  
  const addToWhitelist = useCallback((app: string) => {
    if (!whitelist.includes(app) && app.trim() !== '') {
      setWhitelist(prev => [...prev, app]);
      toast.success(`Added ${app} to whitelist`);
      
      // If we're adding the current app to whitelist, clear any alert
      if (currentAlertApp === app) {
        setShowingAlert(false);
      }
    }
  }, [whitelist, currentAlertApp]);
  
  const removeFromWhitelist = useCallback((app: string) => {
    setWhitelist(prev => prev.filter(item => item !== app));
    toast.info(`Removed ${app} from whitelist`);
    
    // If we're removing the current app from whitelist and in focus mode,
    // check if we need to show an alert
    if (isFocusMode && lastActiveWindow) {
      const currentAppName = extractAppName(lastActiveWindow);
      if (currentAppName === app) {
        handleNonWhitelistedApp(currentAppName);
      }
    }
  }, [isFocusMode, lastActiveWindow]);
  
  const toggleDimOption = useCallback(() => {
    setDimInsteadOfBlock(prev => !prev);
  }, []);
  
  const handleNonWhitelistedApp = useCallback((appName: string) => {
    console.log("Handling non-whitelisted app:", appName);
    
    // Don't show duplicate alerts for the same app
    if (showingAlert && currentAlertApp === appName) {
      console.log("Already showing alert for this app");
      return;
    }
    
    // Set current alert app name and show the alert
    setCurrentAlertApp(appName);
    setShowingAlert(true);
    
    // Show notification using the centered toast
    centerToast({
      title: "Focus Alert",
      description: `You're outside your focus zone. ${appName} is not in your whitelist`,
      duration: 10000, // Show longer to ensure user sees it
    });
    
    // Send a native notification via Electron
    const notificationId = `focus-mode-${appName}`;
    if (window.electron) {
      window.electron.send('show-native-notification', {
        title: "Focus Mode Alert", 
        body: `You're outside your focus zone. ${appName} is not in your whitelist`,
        notificationId: notificationId
      });
    }
    
    // If we're in dim mode, apply dimming effect to the screen
    if (dimInsteadOfBlock) {
      applyDimEffect();
    } else {
      // In a real implementation, this would block or force-close the app
      toast.error("Non-whitelisted app detected", {
        description: "Focus Mode is blocking this application"
      });
    }
  }, [centerToast, dimInsteadOfBlock, showingAlert, currentAlertApp]);
  
  const applyDimEffect = useCallback(() => {
    // In a real implementation with Electron, we would create an overlay
    // For this demo, we'll show a dimming overlay in the web UI
    const existingOverlay = document.getElementById('focus-mode-dim-overlay');
    
    if (!existingOverlay) {
      const overlay = document.createElement('div');
      overlay.id = 'focus-mode-dim-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      overlay.style.zIndex = '9999';
      overlay.style.pointerEvents = 'none'; // Allow clicks to pass through
      overlay.style.transition = 'opacity 0.5s ease';
      
      document.body.appendChild(overlay);
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.style.opacity = '0';
          setTimeout(() => {
            if (overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
            }
          }, 500);
        }
      }, 3000);
    }
  }, []);
  
  // Handle dismissing the alert
  const handleAlertDismiss = useCallback(() => {
    setShowingAlert(false);
    setCurrentAlertApp(null);
  }, []);
  
  const value = {
    isFocusMode,
    toggleFocusMode,
    whitelist,
    addToWhitelist,
    removeFromWhitelist,
    dimInsteadOfBlock,
    toggleDimOption
  };
  
  return (
    <FocusModeContext.Provider value={value}>
      {children}
      {showingAlert && currentAlertApp && (
        <FocusModeAlert 
          appName={currentAlertApp} 
          onDismiss={handleAlertDismiss} 
        />
      )}
    </FocusModeContext.Provider>
  );
};
