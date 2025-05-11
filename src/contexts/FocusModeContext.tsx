
import React, { createContext, useContext, useState, useEffect } from 'react';
import SystemTrayService from '@/services/SystemTrayService';
import { toast } from "sonner";

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
  
  useEffect(() => {
    // Load saved whitelist from localStorage on component mount
    const savedWhitelist = localStorage.getItem('focusModeWhitelist');
    if (savedWhitelist) {
      setWhitelist(JSON.parse(savedWhitelist));
    }
    
    const savedDimOption = localStorage.getItem('focusModeDimOption');
    if (savedDimOption) {
      setDimInsteadOfBlock(JSON.parse(savedDimOption) === true);
    }
    
    // Set up a watcher for non-whitelisted apps when focus mode is active
    if (isFocusMode) {
      const systemTray = SystemTrayService.getInstance();
      const monitoringInterval = setInterval(() => {
        const lastActiveWindow = systemTray.getLastActiveWindow();
        if (lastActiveWindow && !whitelist.includes(lastActiveWindow)) {
          handleNonWhitelistedApp(lastActiveWindow);
        }
      }, 3000); // Check every 3 seconds
      
      return () => clearInterval(monitoringInterval);
    }
  }, [isFocusMode, whitelist]);
  
  // Save whitelist whenever it changes
  useEffect(() => {
    localStorage.setItem('focusModeWhitelist', JSON.stringify(whitelist));
  }, [whitelist]);
  
  // Save dim option whenever it changes
  useEffect(() => {
    localStorage.setItem('focusModeDimOption', JSON.stringify(dimInsteadOfBlock));
  }, [dimInsteadOfBlock]);
  
  const toggleFocusMode = () => {
    const newState = !isFocusMode;
    setIsFocusMode(newState);
    
    // Notify user of mode change
    if (newState) {
      toast.success("Focus Mode activated", {
        description: "You'll be notified when using non-whitelisted apps",
      });
    } else {
      toast.info("Focus Mode deactivated");
    }
  };
  
  const addToWhitelist = (app: string) => {
    if (!whitelist.includes(app)) {
      setWhitelist([...whitelist, app]);
      toast.success(`Added ${app} to whitelist`);
    }
  };
  
  const removeFromWhitelist = (app: string) => {
    setWhitelist(whitelist.filter(item => item !== app));
    toast.info(`Removed ${app} from whitelist`);
  };
  
  const toggleDimOption = () => {
    setDimInsteadOfBlock(!dimInsteadOfBlock);
  };
  
  const handleNonWhitelistedApp = (appName: string) => {
    // Show notification to the user
    toast.warning("You're outside your focus zone", {
      description: `${appName} is not in your whitelist`,
    });
    
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
  };
  
  const applyDimEffect = () => {
    // In a real implementation with Electron, we would create an overlay
    // For this demo, we'll show a dimming overlay in the web UI
    const dimOverlay = document.getElementById('focus-mode-dim-overlay');
    
    if (!dimOverlay) {
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
  };
  
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
