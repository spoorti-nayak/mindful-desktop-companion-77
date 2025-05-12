
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusMode } from '@/contexts/FocusModeContext';

interface FocusModeAlertProps {
  appName: string;
  onDismiss: () => void;
  imageUrl?: string; // Optional custom image URL
}

export function FocusModeAlert({ 
  appName, 
  onDismiss,
  imageUrl = 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6'
}: FocusModeAlertProps) {
  const [isVisible, setIsVisible] = useState(true);
  const { dimInsteadOfBlock } = useFocusMode();
  
  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, 8000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Tell the main process to show system overlay popup when this component mounts
  useEffect(() => {
    if (window.electron) {
      console.log("FocusModeAlert: Dispatching focus popup event for:", appName);
      
      // Trigger system-wide overlay popup with rich media
      window.electron.send('show-focus-popup', {
        title: "Focus Mode Alert", 
        body: `You're outside your focus zone. ${appName} is not in your whitelist.`,
        notificationId: `focus-alert-${appName}`,
        mediaType: 'image',
        mediaContent: imageUrl
      });
      
      // Also trigger a custom event for in-app components to handle
      const popupEvent = new CustomEvent('show-focus-popup', {
        detail: {
          title: "Focus Mode Alert", 
          body: `You're outside your focus zone. ${appName} is not in your whitelist.`,
          notificationId: `focus-alert-${appName}`,
          mediaType: 'image',
          mediaContent: imageUrl
        }
      });
      
      window.dispatchEvent(popupEvent);
    }
  }, [appName, imageUrl]);
  
  const handleDismiss = () => {
    setIsVisible(false);
    // Delay actual dismissal to allow animation to complete
    setTimeout(() => {
      onDismiss();
    }, 300);
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-black/85 text-white rounded-lg shadow-lg border border-white/10 overflow-hidden max-w-md">
            {/* Display custom image if provided */}
            <div className="w-full h-40 bg-black/50 overflow-hidden">
              <img 
                src={imageUrl} 
                alt="Focus reminder" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-amber-400 font-bold text-lg mb-1">Focus Mode Alert</h3>
                  <p className="text-white/90">
                    You're outside your focus zone. <span className="font-semibold">{appName}</span> is not in your whitelist.
                  </p>
                  {dimInsteadOfBlock ? (
                    <p className="text-xs mt-1 text-white/70">
                      Your screen will be dimmed until you return to an allowed application.
                    </p>
                  ) : (
                    <p className="text-xs mt-1 text-white/70">
                      This application is blocked in Focus Mode.
                    </p>
                  )}
                </div>
                <button 
                  onClick={handleDismiss}
                  className="ml-4 text-white/70 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="bg-white/10 px-4 py-2 flex justify-end">
              <button 
                onClick={handleDismiss}
                className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
