
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
  
  // Add tracking variables for real-time monitoring
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [notificationShown, setNotificationShown] = useState<Record<string, boolean>>({});
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [wasInWhitelistedApp, setWasInWhitelistedApp] = useState(false);
  
  // Load custom image from localStorage on initial mount
  useEffect(() => {
    const savedImage = localStorage.getItem('focusModeCustomImage');
    if (savedImage) {
      setCustomImage(savedImage);
    }
  }, []);
  
  // Load saved whitelist from localStorage on initial mount
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
      
      // Only clear alert if it matches the one being dismissed
      if (currentAlertApp && event.detail.includes(currentAlertApp)) {
        setShowingAlert(false);
      }
    };
    
    window.addEventListener('active-window-changed', handleActiveWindowChanged as EventListener);
    window.addEventListener('notification-dismissed', handleNotificationDismissed as EventListener);
    
    // Request the current active window
    if (window.electron) {
      window.electron.send('get-active-window');
    }
    
    return () => {
      window.removeEventListener('active-window-changed', handleActiveWindowChanged as EventListener);
      window.removeEventListener('notification-dismissed', handleNotificationDismissed as EventListener);
      
      // Clear interval when unmounting
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [lastActiveWindow, currentAlertApp, checkInterval]);
  
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
  
  // Start or stop real-time active window monitoring based on focus mode state
  useEffect(() => {
    // Clear any existing interval
    if (checkInterval) {
      clearInterval(checkInterval);
      setCheckInterval(null);
    }
    
    // Reset tracking state when focus mode changes
    setNotificationShown({});
    setWasInWhitelistedApp(false);
    
    // Only start real-time monitoring if focus mode is active
    if (isFocusMode) {
      console.log("Starting real-time active window monitoring");
      
      // Check every 1.5 seconds - balanced between responsiveness and performance
      const interval = setInterval(() => {
        // Request current active window from electron main process
        if (window.electron) {
          window.electron.send('get-active-window');
        }
        
        // Check current window against whitelist if we have a lastActiveWindow value
        if (lastActiveWindow) {
          checkActiveWindowAgainstWhitelist(lastActiveWindow);
        }
      }, 1500);
      
      setCheckInterval(interval);
      
      // Initial check right away when focus mode is enabled
      if (lastActiveWindow) {
        checkActiveWindowAgainstWhitelist(lastActiveWindow);
      }
    } else {
      // Clear any alerts when focus mode is disabled
      setShowingAlert(false);
    }
    
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [isFocusMode]);
  
  // Effect to track app switches between whitelisted and non-whitelisted apps
  useEffect(() => {
    if (!isFocusMode || !lastActiveWindow) return;
    
    const currentAppName = extractAppName(lastActiveWindow);
    const isCurrentAppWhitelisted = isAppInWhitelist(currentAppName, whitelist);
    
    console.log(`App switched to: ${currentAppName}, Whitelisted: ${isCurrentAppWhitelisted}, Was in whitelisted: ${wasInWhitelistedApp}`);
    
    // If switching from whitelisted to non-whitelisted
    if (wasInWhitelistedApp && !isCurrentAppWhitelisted && currentAppName) {
      console.log(`Switching FROM whitelisted TO non-whitelisted app: ${currentAppName}`);
      handleNonWhitelistedApp(currentAppName);
    }
    
    // Update tracking state for next comparison
    setWasInWhitelistedApp(isCurrentAppWhitelisted);
    
  }, [lastActiveWindow, isFocusMode]);
  
  // Function to check if active window is whitelisted and handle notifications
  const checkActiveWindowAgainstWhitelist = useCallback((windowTitle: string) => {
    if (!isFocusMode) return;
    
    // Extract just the app name for better matching
    const currentAppName = extractAppName(windowTitle);
    
    // Check if the current app is in the whitelist
    const isCurrentAppWhitelisted = isAppInWhitelist(currentAppName, whitelist);
    
    console.log("Focus check:", currentAppName, "Whitelisted:", isCurrentAppWhitelisted);
    
    // If not whitelisted, show notification (with additional conditions)
    if (!isCurrentAppWhitelisted && currentAppName) {
      // Check if we need to show a notification (based on app switching pattern)
      const needToShowNotification = wasInWhitelistedApp || 
                                    (previousActiveWindow && 
                                     isAppInWhitelist(extractAppName(previousActiveWindow), whitelist));
      
      if (needToShowNotification) {
        console.log("Showing notification for non-whitelisted app:", currentAppName);
        handleNonWhitelistedApp(currentAppName);
      }
    } 
    // If app is now whitelisted but we were showing an alert for it, clear the alert
    else if (showingAlert && currentAlertApp && isAppInWhitelist(currentAlertApp, whitelist)) {
      console.log("App is now whitelisted, clearing alert");
      setShowingAlert(false);
    }
    
  }, [isFocusMode, whitelist, previousActiveWindow, wasInWhitelistedApp, showingAlert, currentAlertApp]);
  
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
    
    // Reset tracking state when toggling focus mode
    setNotificationShown({});
    setWasInWhitelistedApp(false);
    
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
        
        // Update tracking state based on current app
        setWasInWhitelistedApp(isCurrentAppWhitelisted);
        
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
      setCurrentAlertApp(null);
      
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
        setCurrentAlertApp(null);
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
        // Update tracking state - we're now in a non-whitelisted app
        setWasInWhitelistedApp(false);
        
        // Small delay to allow state update
        setTimeout(() => {
          handleNonWhitelistedApp(currentAppName);
        }, 100);
      }
    }
  }, [isFocusMode, lastActiveWindow]);
  
  const toggleDimOption = useCallback(() => {
    setDimInsteadOfBlock(prev => !prev);
  }, []);
  
  const handleNonWhitelistedApp = useCallback((appName: string) => {
    console.log("Handling non-whitelisted app:", appName);
    
    // Get the custom image from localStorage or use default
    const imageUrl = localStorage.getItem('focusModeCustomImage') || 
                    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6';
    
    // Set current alert app name and show the alert
    setCurrentAlertApp(appName);
    setShowingAlert(true);
    
    // Mark this app as having had a notification shown
    setNotificationShown(prev => ({
      ...prev,
      [appName]: true
    }));
    
    // Custom event to trigger the system-wide popup notification
    if (window.electron) {
      const popupEvent = new CustomEvent('show-focus-popup', {
        detail: {
          title: "Focus Mode Alert", 
          body: `You're outside your focus zone. ${appName} is not in your whitelist.`,
          notificationId: `focus-mode-${appName}`,
          mediaType: 'image',
          mediaContent: imageUrl
        }
      });
      window.dispatchEvent(popupEvent);
      
      // Also send directly to Electron main process
      window.electron.send('show-focus-popup', {
        title: "Focus Mode Alert", 
        body: `You're outside your focus zone. ${appName} is not in your whitelist.`,
        notificationId: `focus-mode-${appName}`,
        mediaType: 'image',
        mediaContent: imageUrl
      });
    }
    
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
  }, [centerToast, dimInsteadOfBlock]);
  
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
  
  // Get the custom image for the alert
  const alertImage = customImage || 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6';
  
  return (
    <FocusModeContext.Provider value={value}>
      {children}
      {showingAlert && currentAlertApp && (
        <FocusModeAlert 
          appName={currentAlertApp} 
          onDismiss={handleAlertDismiss} 
          imageUrl={alertImage}
        />
      )}
    </FocusModeContext.Provider>
  );
};

