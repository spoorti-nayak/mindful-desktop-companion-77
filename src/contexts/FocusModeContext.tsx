
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
    
    // Use standard event listener since SystemTrayService doesn't have a receive method
    window.addEventListener('active-window-changed', handleActiveWindowChanged as EventListener);
    
    // Request the current active window
    if (window.electron) {
      window.electron.send('get-active-window');
    }
    
    return () => {
      window.removeEventListener('active-window-changed', handleActiveWindowChanged as EventListener);
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
    
    // Check if we're switching FROM a whitelisted app TO a non-whitelisted app
    const isComingFromWhitelist = previousActiveWindow && whitelist.includes(previousActiveWindow);
    const isGoingToNonWhitelist = lastActiveWindow && !whitelist.includes(lastActiveWindow);
    
    if (isComingFromWhitelist && isGoingToNonWhitelist) {
      console.log(`Switching from whitelisted app ${previousActiveWindow} to non-whitelisted app ${lastActiveWindow}`);
      handleNonWhitelistedApp(lastActiveWindow);
    }
    // Skip empty app names
    else if (lastActiveWindow.trim() === '') {
      return;
    }
    // If not coming from whitelist but going to non-whitelist
    else if (isGoingToNonWhitelist) {
      console.log(`Switching to non-whitelisted app ${lastActiveWindow}`);
      handleNonWhitelistedApp(lastActiveWindow);
    }
  }, [isFocusMode, lastActiveWindow, whitelist, previousActiveWindow]);
  
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
  
  const handleNonWhitelistedApp = useCallback((appName: string) => {
    // Show notification using the centered toast
    centerToast({
      title: "Focus Alert",
      description: `You're outside your focus zone. ${appName} is not in your whitelist`,
      duration: 10000, // Show longer to ensure user sees it
    });
    
    // Also show notification to the system tray (as backup)
    if (window.electron) {
      window.electron.send('show-native-notification', {
        title: "Focus Mode Alert", 
        body: `You're outside your focus zone. ${appName} is not in your whitelist`
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
