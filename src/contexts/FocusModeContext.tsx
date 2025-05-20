import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import SystemTrayService from '@/services/SystemTrayService';
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';

interface FocusModeContextType {
  isFocusMode: boolean;
  toggleFocusMode: () => void;
  whitelist: string[];
  addToWhitelist: (app: string) => void;
  removeFromWhitelist: (app: string) => void;
  dimInsteadOfBlock: boolean;
  toggleDimOption: () => void;
  currentActiveApp: string | null;
  isCurrentAppWhitelisted: boolean;
  customImage: string | null;
  customText: string | null;
  updateCustomText: (text: string) => void;
  updateCustomImage: (imageUrl: string | null) => void;
  testFocusModePopup: () => void;
}

const FocusModeContext = createContext<FocusModeContextType | undefined>(undefined);

// Define useFocusMode hook only once at the top level
export const useFocusMode = () => {
  const context = useContext(FocusModeContext);
  if (context === undefined) {
    throw new Error('useFocusMode must be used within a FocusModeProvider');
  }
  return context;
};

// Constants for improved notification management
const NOTIFICATION_COOLDOWN = 1500; // 1.5 seconds cooldown between notifications
const DEFAULT_WHITELIST_APPS = ['Mindful Desktop Companion', 'Electron', 'electron', 'chrome-devtools']; 
// Idle timeout - trigger notification after this amount of time in a different app
const IDLE_RESET_TIMEOUT = 30000; // 30 seconds
// App switch memory - don't show duplicate notifications until this time passes
const APP_SWITCH_MEMORY = 60000; // 60 seconds

export const FocusModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  // Use user?.id as userId, defaulting to 'guest' if not available
  const userId = user?.id || 'guest';
  
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
  const [customText, setCustomText] = useState<string | null>(null); // For custom notification text
  const [wasInWhitelistedApp, setWasInWhitelistedApp] = useState(false);
  
  // Track when we switched from whitelisted app to non-whitelisted
  const [lastNotifiedApp, setLastNotifiedApp] = useState<string | null>(null);
  
  // New state for the Live Whitelist Match Preview feature
  const [currentActiveApp, setCurrentActiveApp] = useState<string | null>(null);
  const [isCurrentAppWhitelisted, setIsCurrentAppWhitelisted] = useState(false);
  
  // Enhanced window info from active-win
  const [activeWindowInfo, setActiveWindowInfo] = useState<any>(null);
  
  // Track the last time a notification was shown for each app
  const appNotificationTimestamps = useRef<Record<string, number>>({});
  const [processedAppSwitches, setProcessedAppSwitches] = useState<Map<string, number>>(new Map());
  
  // Track if we already processed a switch to avoid duplicate popups
  const [processedSwitches, setProcessedSwitches] = useState<Set<string>>(new Set());
  
  // Store the timestamp of the last popup shown to implement cooldown
  const lastPopupShownTime = useRef<number>(0);
  
  // Track the last time each app was active to implement idle reset
  const appLastActiveTime = useRef<Record<string, number>>({});
  
  // Debounce for handling non-whitelisted app notifications
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHandlingNotificationRef = useRef<boolean>(false);

  // Load custom text and image on initial mount
  useEffect(() => {
    console.log("Loading focus mode preferences for user:", userId);
    
    const savedCustomText = localStorage.getItem(`focusModeCustomText-${userId}`);
    if (savedCustomText) {
      console.log("Found saved custom text:", savedCustomText);
      setCustomText(savedCustomText);
    } else {
      // Default text
      const defaultText = "You're outside your focus zone. {app} is not in your whitelist.";
      console.log("Setting default custom text:", defaultText);
      setCustomText(defaultText);
      localStorage.setItem(`focusModeCustomText-${userId}`, defaultText);
    }

    const savedCustomImage = localStorage.getItem(`focusModeCustomImage-${userId}`);
    if (savedCustomImage) {
      console.log("Found saved custom image URL:", savedCustomImage);
      setCustomImage(savedCustomImage);
    } else {
      // Default image
      const defaultImage = 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b';
      console.log("Setting default custom image:", defaultImage);
      setCustomImage(defaultImage);
      localStorage.setItem(`focusModeCustomImage-${userId}`, defaultImage);
    }
  }, [userId]);

  // Add this new effect to prevent window glitching when focus mode is toggled
  useEffect(() => {
    // Send stabilize message to main process when focus mode changes
    if (window.electron) {
      // Small delay to avoid race conditions
      const stabilizeTimer = setTimeout(() => {
        window.electron.send('stabilize-window', { 
          isFocusMode,
          timestamp: Date.now()
        });
      }, 100);
      
      return () => clearTimeout(stabilizeTimer);
    }
  }, [isFocusMode]);

  // Load saved whitelist from localStorage on initial mount
  useEffect(() => {
    const savedWhitelist = localStorage.getItem(`focusModeWhitelist-${userId}`);
    if (savedWhitelist) {
      try {
        // Merge with default whitelist apps to ensure Electron app is always whitelisted
        const savedApps = JSON.parse(savedWhitelist);
        setWhitelist([...new Set([...savedApps, ...DEFAULT_WHITELIST_APPS])]);
      } catch (e) {
        console.error("Failed to parse whitelist:", e);
        setWhitelist([...DEFAULT_WHITELIST_APPS]);
      }
    } else {
      // Set default whitelist if none exists
      setWhitelist([...DEFAULT_WHITELIST_APPS]);
    }
    
    const savedDimOption = localStorage.getItem(`focusModeDimOption-${userId}`);
    if (savedDimOption) {
      try {
        setDimInsteadOfBlock(JSON.parse(savedDimOption) === true);
      } catch (e) {
        console.error("Failed to parse dim option:", e);
      }
    }
    
    const savedFocusMode = localStorage.getItem(`focusModeEnabled-${userId}`);
    if (savedFocusMode === 'true') {
      setIsFocusMode(true);
    }
    
    // Register for active window change events using custom event listener
    const handleActiveWindowChanged = (event: CustomEvent<any>) => {
      const windowInfo = event.detail;
      
      // Extract the complete window info
      const newWindow = typeof windowInfo === 'string' ? windowInfo : windowInfo.title;
      
      // Store the complete window info
      setActiveWindowInfo(windowInfo);
      
      // Extract app name from window info for better matching
      let appName;
      if (typeof windowInfo === 'object') {
        // Get the most reliable identifier for the app
        appName = windowInfo.owner?.name || windowInfo.appName || extractAppName(windowInfo.title);
        setCurrentActiveApp(appName);
      } else {
        appName = extractAppName(windowInfo);
        setCurrentActiveApp(appName);
      }
      
      console.log("Window changed to:", newWindow);
      console.log("App name detected:", appName);
      
      // Update previous window info and current window info
      setPreviousActiveWindow(lastActiveWindow);
      setLastActiveWindow(newWindow);
      
      // Record the time this app was last active
      if (appName) {
        appLastActiveTime.current[appName] = Date.now();
      }
      
      // Check if this app is whitelisted and update the state
      const isWhitelisted = isAppInWhitelist(appName, whitelist);
      setIsCurrentAppWhitelisted(isWhitelisted);
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
      
      // Clear any existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [lastActiveWindow, currentAlertApp, checkInterval, userId]);
  
  // Save whitelist whenever it changes
  useEffect(() => {
    try {
      // Always ensure the Electron app is whitelisted
      const updatedWhitelist = [...new Set([...whitelist, ...DEFAULT_WHITELIST_APPS])];
      localStorage.setItem(`focusModeWhitelist-${userId}`, JSON.stringify(updatedWhitelist));
      
      // Update the state if we added any new default apps
      if (updatedWhitelist.length !== whitelist.length) {
        setWhitelist(updatedWhitelist);
      }
    } catch (e) {
      console.error("Failed to save whitelist:", e);
    }
  }, [whitelist, userId]);
  
  // Save dim option whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(`focusModeDimOption-${userId}`, JSON.stringify(dimInsteadOfBlock));
    } catch (e) {
      console.error("Failed to save dim option:", e);
    }
  }, [dimInsteadOfBlock, userId]);
  
  // Save focus mode state
  useEffect(() => {
    try {
      localStorage.setItem(`focusModeEnabled-${userId}`, isFocusMode ? 'true' : 'false');
    } catch (e) {
      console.error("Failed to save focus mode state:", e);
    }
  }, [isFocusMode, userId]);

  // Save custom text whenever it changes
  useEffect(() => {
    if (customText) {
      try {
        localStorage.setItem(`focusModeCustomText-${userId}`, customText);
      } catch (e) {
        console.error("Failed to save custom text:", e);
      }
    }
  }, [customText, userId]);
  
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
    setLastNotifiedApp(null);
    setProcessedSwitches(new Set());
    
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
  
  // Enhanced effect to handle app switches with improved idle detection
  useEffect(() => {
    if (!isFocusMode || !lastActiveWindow) return;
    
    // Get app name from active window info if available, otherwise extract from title
    let currentAppName;
    if (activeWindowInfo && typeof activeWindowInfo === 'object') {
      currentAppName = activeWindowInfo.owner?.name || 
                       activeWindowInfo.appName || 
                       extractAppName(activeWindowInfo.title);
    } else {
      currentAppName = extractAppName(lastActiveWindow);
    }
    
    // Always check against updated whitelist that includes default apps
    const mergedWhitelist = [...new Set([...whitelist, ...DEFAULT_WHITELIST_APPS])];
    const isCurrentAppWhitelisted = isAppInWhitelist(currentAppName, mergedWhitelist);
    
    // Create a unique ID for this switch to prevent duplicates
    const switchId = `${previousActiveWindow}-to-${currentAppName}-${Date.now()}`;
    
    // If switching to a non-whitelisted app
    if (!isCurrentAppWhitelisted && currentAppName) {
      const now = Date.now();
      const lastActiveTime = appLastActiveTime.current[currentAppName] || 0;
      const timeSinceLastActive = now - lastActiveTime;
      
      // Conditions for showing a notification:
      // 1. We're coming from a whitelisted app (wasInWhitelistedApp)
      // 2. We're switching from a different non-whitelisted app (lastNotifiedApp != currentAppName)
      // 3. This app has been inactive for longer than the idle timeout (IDLE_RESET_TIMEOUT)
      // 4. This is a new app switch (not already processed)
      const isIdleReset = timeSinceLastActive > IDLE_RESET_TIMEOUT;
      const isNewAppSwitch = (wasInWhitelistedApp || 
                            (lastNotifiedApp && lastNotifiedApp !== currentAppName));
      
      // Show notification if any of the conditions are met and we haven't already processed this switch
      if ((isIdleReset || isNewAppSwitch) && !processedSwitches.has(switchId)) {
        // Debounce the notification to prevent spamming
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        
        if (!isHandlingNotificationRef.current) {
          isHandlingNotificationRef.current = true;
          
          // Only show notification if cooldown period has passed
          if (now - lastPopupShownTime.current >= NOTIFICATION_COOLDOWN) {
            console.log(`Showing notification for app switch after debounce: ${switchId}`);
            handleNonWhitelistedApp(currentAppName);
            lastPopupShownTime.current = now;
            
            // Mark this switch as processed
            setProcessedSwitches(prev => {
              const updated = new Set(prev);
              updated.add(switchId);
              return updated;
            });
          }
          
          // Reset flag after delay
          debounceTimerRef.current = setTimeout(() => {
            isHandlingNotificationRef.current = false;
          }, NOTIFICATION_COOLDOWN);
        }
      }
    }
    
    // Update tracking state for next comparison
    setWasInWhitelistedApp(isCurrentAppWhitelisted);
    
  }, [lastActiveWindow, isFocusMode, whitelist, activeWindowInfo, previousActiveWindow, wasInWhitelistedApp, lastNotifiedApp]);
  
  // Function to check if active window is whitelisted and handle notifications
  const checkActiveWindowAgainstWhitelist = useCallback((windowTitle: string) => {
    if (!isFocusMode) return;
    
    // Get app name from active window info if available, otherwise extract from title
    let currentAppName;
    if (activeWindowInfo && typeof activeWindowInfo === 'object') {
      currentAppName = activeWindowInfo.owner?.name || 
                       activeWindowInfo.appName || 
                       extractAppName(activeWindowInfo.title);
    } else {
      currentAppName = extractAppName(windowTitle);
    }
    
    // Also grab executable/process name if available
    let executableName = '';
    if (activeWindowInfo && typeof activeWindowInfo === 'object') {
      if (activeWindowInfo.owner?.path) {
        const pathParts = activeWindowInfo.owner.path.split(/[/\\]/);
        executableName = pathParts[pathParts.length - 1]; // Get the last part of the path
      }
    }
    
    // Always include default whitelist apps
    const mergedWhitelist = [...new Set([...whitelist, ...DEFAULT_WHITELIST_APPS])];
    
    // Check if the current app is in the whitelist using improved matching
    const isCurrentAppWhitelisted = isAppInWhitelist(currentAppName, mergedWhitelist) || 
                                   (executableName && isAppInWhitelist(executableName, mergedWhitelist));
    
    // Update the state for the Live Whitelist Match Preview feature
    setCurrentActiveApp(currentAppName);
    setIsCurrentAppWhitelisted(isCurrentAppWhitelisted);
    
    // If not whitelisted, check if we need to show a notification
    if (!isCurrentAppWhitelisted && currentAppName) {
      // Create a unique switch ID
      const switchId = `${previousActiveWindow}-to-${currentAppName}`;
      
      // Check for app switch events that would trigger notification
      const isNewSwitch = previousActiveWindow !== lastActiveWindow;
      const isFromWhitelistedApp = wasInWhitelistedApp;
      const isDifferentNonWhitelistedApp = lastNotifiedApp && lastNotifiedApp !== currentAppName;
      
      // Check for idle reset (app hasn't been active recently)
      const now = Date.now();
      const lastActiveTime = appLastActiveTime.current[currentAppName] || 0;
      const lastAppNotificationTime = appNotificationTimestamps.current[currentAppName] || 0;
      const timeSinceLastActive = now - lastActiveTime;
      const timeSinceLastNotification = now - lastAppNotificationTime;
      
      // Enhanced criteria for showing notifications:
      // 1. This is a new switch to a non-whitelisted app, OR
      // 2. We're returning to this app after being away for IDLE_RESET_TIMEOUT, OR
      // 3. It's been a long time since we showed a notification for this app
      const isIdleReset = timeSinceLastActive > IDLE_RESET_TIMEOUT;
      const isNotificationReset = timeSinceLastNotification > IDLE_RESET_TIMEOUT;
      
      // Only show notification once per switch
      const switchNotProcessed = !processedSwitches.has(switchId);
      
      // Check if enough time has passed since last notification for this app
      const cooldownElapsed = now - lastAppNotificationTime > NOTIFICATION_COOLDOWN;
      const globalCooldownElapsed = now - lastPopupShownTime.current > NOTIFICATION_COOLDOWN;
      
      if ((isNewSwitch || isIdleReset || isNotificationReset || 
          isFromWhitelistedApp || isDifferentNonWhitelistedApp) && 
          switchNotProcessed && cooldownElapsed && globalCooldownElapsed) {
        
        // Only proceed if we're not currently handling a notification
        if (!isHandlingNotificationRef.current) {
          isHandlingNotificationRef.current = true;
          
          // Use debouncing to prevent rapid-fire notifications
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
          
          debounceTimerRef.current = setTimeout(() => {
            console.log(`Showing notification for app: ${currentAppName} after debounce`);
            handleNonWhitelistedApp(currentAppName);
            lastPopupShownTime.current = Date.now();
            
            // Mark this switch as processed
            setProcessedSwitches(prev => {
              const updated = new Set(prev);
              updated.add(switchId);
              return updated;
            });
            
            // Record notification timestamp for this app
            appNotificationTimestamps.current[currentAppName] = Date.now();
            
            // Reset flag
            isHandlingNotificationRef.current = false;
          }, 100); // Short delay for debounce
        }
      }
    } 
    // If app is now whitelisted but we were showing an alert for it, clear the alert
    else if (showingAlert && currentAlertApp && isAppInWhitelist(currentAlertApp, mergedWhitelist)) {
      console.log("App is now whitelisted, clearing alert");
      setShowingAlert(false);
    }
    
    // If we're in a whitelisted app, we can reset the lastNotifiedApp
    // to ensure we'll get a notification next time we switch to a non-whitelisted app
    if (isCurrentAppWhitelisted) {
      if (lastNotifiedApp !== null) {
        setLastNotifiedApp(null);
      }
      
      // Also update the wasInWhitelistedApp state
      if (!wasInWhitelistedApp) {
        setWasInWhitelistedApp(true);
      }
    }
    
  }, [isFocusMode, whitelist, previousActiveWindow, wasInWhitelistedApp, showingAlert, currentAlertApp, lastNotifiedApp, activeWindowInfo, processedSwitches, lastActiveWindow]);
  
  // Extract the core app name from window title for more reliable matching
  const extractAppName = (windowTitle: string): string => {
    if (!windowTitle) return '';
    
    // Common patterns in window titles
    const appNameMatches = windowTitle.match(/^(.*?)(?:\s[-–—]\s|\s\|\s|\s:|\s\d|$)/);
    return appNameMatches?.[1]?.trim() || windowTitle.trim();
  };
  
  // Significantly improved app matching against whitelist with enhanced fuzzy matching
  const isAppInWhitelist = (appName: string, whitelist: string[]): boolean => {
    if (!appName) return false;
    
    // Normalize the app name for better matching - lowercase and remove special characters
    const normalizedAppName = appName.toLowerCase().replace(/[^\w\s.-]/g, '');
    
    // Try to extract filename or process name if it's an exe
    const processMatch = normalizedAppName.match(/([^\\\/]+)(?:\.exe)?$/i);
    const processName = processMatch ? processMatch[1].toLowerCase() : '';
    
    // Special case for Electron app - always consider it whitelisted
    if (normalizedAppName.includes('electron') || 
        normalizedAppName.includes('mindful desktop companion') ||
        (processName && (processName.includes('electron') || processName.includes('mindful')))) {
      return true;
    }
    
    return whitelist.some(whitelistedApp => {
      // Normalize whitelist entry
      const normalizedWhitelistedApp = whitelistedApp.toLowerCase().replace(/[^\w\s.-]/g, '');
      
      // Direct match
      if (normalizedAppName === normalizedWhitelistedApp) return true;
      
      // Partial matches in either direction
      if (normalizedAppName.includes(normalizedWhitelistedApp) || 
          normalizedWhitelistedApp.includes(normalizedAppName)) {
        return true;
      }
      
      // Process name matches (for .exe files)
      if (processName && (
          normalizedWhitelistedApp.includes(processName) || 
          processName.includes(normalizedWhitelistedApp))) {
        return true;
      }
      
      // Match with bundle ID components (e.g., com.microsoft.vscode)
      if (activeWindowInfo && 
          activeWindowInfo.owner && 
          activeWindowInfo.owner.bundleId) {
        
        const bundleId = activeWindowInfo.owner.bundleId.toLowerCase();
        const bundleParts = bundleId.split('.');
        
        // Check all parts of the bundle ID (e.g., "microsoft", "vscode")
        return bundleParts.some(part => 
          part.includes(normalizedWhitelistedApp) || 
          normalizedWhitelistedApp.includes(part));
      }
      
      // Match executable name parts
      if (activeWindowInfo && activeWindowInfo.owner && activeWindowInfo.owner.path) {
        const pathParts = activeWindowInfo.owner.path.toLowerCase().split(/[/\\]/);
        const exeName = pathParts[pathParts.length - 1]; // Last part is the exe name
        
        if (exeName && (
            exeName.includes(normalizedWhitelistedApp) || 
            normalizedWhitelistedApp.includes(exeName))) {
          return true;
        }
        
        // Also match against executable name without extension
        const exeNameNoExt = exeName.replace(/\.exe$/i, '');
        if (exeNameNoExt && (
            exeNameNoExt.includes(normalizedWhitelistedApp) || 
            normalizedWhitelistedApp.includes(exeNameNoExt))) {
          return true;
        }
      }
      
      // Match window title components (split by spaces, dashes, etc)
      const titleParts = normalizedAppName.split(/[\s-_\.]+/);
      return titleParts.some(part => 
        part.includes(normalizedWhitelistedApp) || 
        normalizedWhitelistedApp.includes(part)
      );
    });
  };
  
  const toggleFocusMode = useCallback(() => {
    const newState = !isFocusMode;
    
    // Send stabilize message first to prevent UI glitches
    if (window.electron) {
      window.electron.send('stabilize-window', { 
        operation: 'pre-focus-toggle',
        timestamp: Date.now()
      });
    }
    
    // Short delay to allow stabilization message to be processed
    setTimeout(() => {
      setIsFocusMode(newState);
      
      // Reset tracking state when toggling focus mode
      setNotificationShown({});
      setWasInWhitelistedApp(false);
      setLastNotifiedApp(null);
      setProcessedSwitches(new Set());
      
      // Reset notification timestamps and flags
      appNotificationTimestamps.current = {};
      lastPopupShownTime.current = 0;
      isHandlingNotificationRef.current = false;
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      
      // Notify user of mode change
      if (newState) {
        // Send to electron main process to update tray icon
        if (window.electron) {
          window.electron.send('toggle-focus-mode', true);
          
          // Add a stabilization message to prevent UI glitches
          window.electron.send('stabilize-window', { 
            isFocusMode: true,
            timestamp: Date.now()
          });
        }
        
        toast.success("Focus Mode activated", {
          description: "You'll be notified when using non-whitelisted apps",
        });
        
        // Immediately check current window against whitelist
        if (lastActiveWindow) {
          const currentAppName = extractAppName(lastActiveWindow);
          const mergedWhitelist = [...new Set([...whitelist, ...DEFAULT_WHITELIST_APPS])];
          const isCurrentAppWhitelisted = isAppInWhitelist(currentAppName, mergedWhitelist);
          
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
          
          // Add a stabilization message to prevent UI glitches
          window.electron.send('stabilize-window', { 
            isFocusMode: false,
            timestamp: Date.now()
          });
        }
        
        // Clear any alert when disabling focus mode
        setShowingAlert(false);
        setCurrentAlertApp(null);
        
        toast.info("Focus Mode deactivated");
      }
    }, 50);
    
  }, [isFocusMode, lastActiveWindow, whitelist]);
  
  const addToWhitelist = useCallback((app: string) => {
    if (!whitelist.includes(app) && app.trim() !== '') {
      // Send stabilize message before making the change
      if (window.electron) {
        window.electron.send('stabilize-window', { 
          operation: 'pre-whitelist-change',
          timestamp: Date.now()
        });
      }
      
      // Schedule the actual state update with a tiny delay
      setTimeout(() => {
        setWhitelist(prev => [...prev, app]);
        
        toast.success(`Added ${app} to whitelist`);
        
        // If we're adding the current app to whitelist, clear any alert
        if (currentAlertApp === app) {
          setShowingAlert(false);
          setCurrentAlertApp(null);
          setLastNotifiedApp(null); // Reset notification tracking
          
          // Also reset notification timestamps for this app
          if (appNotificationTimestamps.current[app]) {
            delete appNotificationTimestamps.current[app];
          }
        }
        
        // If the current active window matches this app, update wasInWhitelistedApp
        if (lastActiveWindow && extractAppName(lastActiveWindow) === app) {
          setWasInWhitelistedApp(true);
        }
        
        // Update the current app whitelist status for live preview
        if (currentActiveApp === app) {
          setIsCurrentAppWhitelisted(true);
        }
        
        // Send stabilize message after making the change
        if (window.electron) {
          window.electron.send('stabilize-window', { 
            operation: 'post-whitelist-change',
            timestamp: Date.now()
          });
        }
      }, 50);
    }
  }, [whitelist, currentAlertApp, lastActiveWindow, currentActiveApp]);
  
  const removeFromWhitelist = useCallback((app: string) => {
    // Don't allow removing default whitelisted apps
    if (DEFAULT_WHITELIST_APPS.some(defaultApp => 
        defaultApp.toLowerCase() === app.toLowerCase() ||
        app.toLowerCase().includes(defaultApp.toLowerCase()) ||
        defaultApp.toLowerCase().includes(app.toLowerCase()))) {
      
      toast.error("Cannot remove essential system app from whitelist");
      return;
    }
    
    // Send stabilize message before making the change
    if (window.electron) {
      window.electron.send('stabilize-window', { 
        operation: 'pre-whitelist-change',
        timestamp: Date.now()
      });
    }
    
    // Schedule the actual state update with a tiny delay
    setTimeout(() => {
      setWhitelist(prev => prev.filter(item => item !== app));
      
      toast.info(`Removed ${app} from whitelist`);
      
      // If we're removing the current app from whitelist and in focus mode,
      // check if we need to show an alert
      if (isFocusMode && lastActiveWindow) {
        const currentAppName = extractAppName(lastActiveWindow);
        if (currentAppName === app) {
          // Update tracking state - we're now in a non-whitelisted app
          setWasInWhitelistedApp(false);
          
          // Show notification for this newly non-whitelisted app
          // Add a slightly longer delay to prevent UI flickering
          setTimeout(() => {
            handleNonWhitelistedApp(currentAppName);
          }, 300);
          
          // Update the current app whitelist status for live preview
          setIsCurrentAppWhitelisted(false);
        }
      }
      
      // Send stabilize message after making the change
      if (window.electron) {
        window.electron.send('stabilize-window', { 
          operation: 'post-whitelist-change',
          timestamp: Date.now()
        });
      }
    }, 50);
  }, [isFocusMode, lastActiveWindow]);
  
  const toggleDimOption = useCallback(() => {
    setDimInsteadOfBlock(prev => !prev);
  }, []);

  // Update custom text for focus mode alerts
  const updateCustomText = useCallback((text: string) => {
    setCustomText(text);
    localStorage.setItem(`focusModeCustomText-${userId}`, text);
  }, [userId]);

  // Update custom image for focus mode alerts
  const updateCustomImage = useCallback((imageUrl: string | null) => {
    setCustomImage(imageUrl);
    if (imageUrl) {
      localStorage.setItem(`focusModeCustomImage-${userId}`, imageUrl);
    } else {
      localStorage.removeItem(`focusModeCustomImage-${userId}`);
    }
  }, [userId]);
  
  const applyDimEffect = () => {
    // In a real implementation, we would dim the screen via Electron
    console.log("Applying dimming effect to screen");
    if (window.electron) {
      window.electron.send('apply-screen-dim', { 
        opacity: 0.7 
      });
    }
  };
  
  // Enhanced handler for non-whitelisted apps to use rich media popup
  const handleNonWhitelistedApp = useCallback((appName: string) => {
    // Skip notification for system apps
    if (DEFAULT_WHITELIST_APPS.some(defaultApp => 
        appName.toLowerCase().includes(defaultApp.toLowerCase()) ||
        defaultApp.toLowerCase().includes(appName.toLowerCase()))) {
      return;
    }
    
    console.log("Handling non-whitelisted app:", appName);
    console.log("Using custom image:", customImage);
    console.log("Using custom text:", customText);
    
    // Update tracking to remember we've shown notification for this app
    setLastNotifiedApp(appName);
    
    // Get the custom image and text from state
    const imageUrl = customImage; // Don't use a default image
    const alertText = customText || `You're outside your focus zone. ${appName} is not in your whitelist.`;
    
    // Set current alert app name and show the alert
    setCurrentAlertApp(appName);
    setShowingAlert(true);
    
    // Create a unique notification ID with timestamp and app name
    const notificationId = `focus-mode-${appName}-${Date.now()}`;
    
    // Use rich media popup for focus mode alerts
    const focusRuleEvent = new CustomEvent('show-focus-popup', { 
      detail: {
        title: "Focus Mode Alert",
        body: alertText.replace('{app}', appName),
        notificationId: notificationId,
        mediaType: imageUrl ? 'image' : 'none',
        mediaContent: imageUrl,
        appName: appName
      }
    });
    
    console.log("Dispatching focus popup event with image:", imageUrl);
    window.dispatchEvent(focusRuleEvent);
    
    // If we're in dim mode, apply dimming effect to the screen
    if (dimInsteadOfBlock) {
      applyDimEffect();
    }
    
    // Update the timestamp for this app's notification
    appNotificationTimestamps.current[appName] = Date.now();
    lastPopupShownTime.current = Date.now();
  }, [customImage, customText, dimInsteadOfBlock]);

  // Test the rich media focus mode popup
  const testFocusModePopup = useCallback(() => {
    // Get the custom image from state
    console.log("Testing focus mode popup with custom image:", customImage);
    
    const imageUrl = customImage;
    const alertText = customText || "You're outside your focus zone. This app is not in your whitelist.";
    const testApp = currentActiveApp || "Test App";
    
    // Create a synthetic event for testing with rich media
    const testEvent = new CustomEvent('show-focus-popup', { 
      detail: {
        title: "Focus Mode Alert",
        body: alertText.replace('{app}', testApp),
        notificationId: `test-focus-popup-${Date.now()}`,
        mediaType: 'image',
        mediaContent: imageUrl,
        appName: testApp
      }
    });
    
    window.dispatchEvent(testEvent);
  }, [customImage, customText, currentActiveApp]);
  
  // Create the context value object
  const contextValue: FocusModeContextType = {
    isFocusMode,
    toggleFocusMode,
    whitelist,
    addToWhitelist,
    removeFromWhitelist,
    dimInsteadOfBlock,
    toggleDimOption,
    currentActiveApp,
    isCurrentAppWhitelisted,
    customImage,
    customText,
    updateCustomText,
    updateCustomImage,
    testFocusModePopup
  };

  return (
    <FocusModeContext.Provider value={contextValue}>
      {children}
    </FocusModeContext.Provider>
  );
};
