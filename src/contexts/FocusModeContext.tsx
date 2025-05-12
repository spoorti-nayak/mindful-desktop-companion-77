
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import SystemTrayService from '@/services/SystemTrayService';
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";

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
    
    // Register for active window change events using custom event listener
    const handleActiveWindowChanged = (event: CustomEvent<string>) => {
      setPreviousActiveWindow(lastActiveWindow);
      setLastActiveWindow(event.detail);
    };
    
    // Track dismissed notifications
    const handleNotificationDismissed = (event: CustomEvent<string>) => {
      setLastNotificationDismissed(event.detail);
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
  }, [lastActiveWindow]);
  
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
  
  // Monitor active window changes when focus mode is active
  useEffect(() => {
    if (!isFocusMode || !lastActiveWindow) return;
    
    // Extract just the app name for better matching
    const currentAppName = extractAppName(lastActiveWindow);
    const previousAppName = previousActiveWindow ? extractAppName(previousActiveWindow) : null;
    
    // Check if the current app is in the whitelist (using more flexible matching)
    const isCurrentAppWhitelisted = isAppInWhitelist(currentAppName, whitelist);
    const isPreviousAppWhitelisted = previousAppName && isAppInWhitelist(previousAppName, whitelist);
    
    // Track if we've already shown a notification for this app transition
    const notificationKey = `${previousAppName || ''}-to-${currentAppName}`;
    const shouldShowNotification = notificationKey !== lastNotificationDismissed;

    // Only show notification when switching FROM a whitelisted app TO a non-whitelisted app
    // AND we haven't already shown a notification for this transition
    if (isPreviousAppWhitelisted && !isCurrentAppWhitelisted && shouldShowNotification) {
      console.log(`Switching from whitelisted app ${previousAppName} to non-whitelisted app ${currentAppName}`);
      handleNonWhitelistedApp(currentAppName, notificationKey);
    }
  }, [isFocusMode, lastActiveWindow, whitelist, previousActiveWindow, lastNotificationDismissed]);
  
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
    } else {
      // Send to electron main process to update tray icon
      if (window.electron) {
        window.electron.send('toggle-focus-mode', false);
      }
      
      toast.info("Focus Mode deactivated");
    }
  }, [isFocusMode]);
  
  const addToWhitelist = useCallback((app: string) => {
    if (!whitelist.includes(app) && app.trim() !== '') {
      setWhitelist(prev => [...prev, app]);
      toast.success(`Added ${app} to whitelist`);
    }
  }, [whitelist]);
  
  const removeFromWhitelist = useCallback((app: string) => {
    setWhitelist(prev => prev.filter(item => item !== app));
    toast.info(`Removed ${app} from whitelist`);
  }, []);
  
  const toggleDimOption = useCallback(() => {
    setDimInsteadOfBlock(prev => !prev);
  }, []);
  
  const handleNonWhitelistedApp = useCallback((appName: string, notificationKey: string) => {
    // Show notification using the centered toast - this will appear in the web app
    const { dismiss } = centerToast({
      title: "Focus Alert",
      description: `You're outside your focus zone. ${appName} is not in your whitelist`,
      duration: 10000, // Show longer to ensure user sees it
    });

    // Add an event handler for when the toast is dismissed
    const handleDismiss = () => {
      // When user dismisses notification, remember it to avoid duplicate notifications
      setLastNotificationDismissed(notificationKey);
      // Also dispatch an event to let the system know this notification was dismissed
      window.dispatchEvent(new CustomEvent('notification-dismissed', { detail: notificationKey }));
    };

    // Add listener to handle toast dismissal
    setTimeout(() => {
      handleDismiss();
    }, 10000);
    
    // IMPORTANT: This is a system-level notification that will appear regardless of what app is in focus
    if (window.electron) {
      window.electron.send('show-native-notification', {
        title: "Focus Mode Alert", 
        body: `You're outside your focus zone. ${appName} is not in your whitelist`,
        notificationId: notificationKey
      });
    }
    
    // If we're in dim mode, apply dimming effect to the screen
    if (dimInsteadOfBlock) {
      applyDimEffect();
    } else {
      // In a real implementation, this would block or force-close the app
      // For now, we'll just show a more severe warning
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
    </FocusModeContext.Provider>
  );
};
