
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { X, Focus } from "lucide-react";
import { Rule } from "@/contexts/CustomRulesContext";
import { motion, AnimatePresence } from "framer-motion";

export function RichMediaPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  const [displayType, setDisplayType] = useState<'dialog' | 'alert'>('dialog');
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showIcon, setShowIcon] = useState(false);
  
  // Listen for rule-based popups and focus-mode popups
  useEffect(() => {
    // Enhanced handler for focus mode popups (from main process or focus mode context)
    const handleShowFocusPopup = (event: CustomEvent<{
      title: string;
      body: string;
      notificationId: string;
      mediaType: 'image' | 'video';
      mediaContent: string;
      appName?: string;
    }>) => {
      console.log("Received show-focus-popup event", event.detail);
      
      // Create a synthetic rule object to reuse the same popup system
      const focusRule: Rule = {
        id: event.detail.notificationId,
        name: event.detail.title || "Focus Mode Alert",
        condition: {
          type: "app_switch",
          threshold: 0, 
          timeWindow: 0
        },
        action: {
          type: "popup",
          text: event.detail.body || `You're outside your focus zone. ${event.detail.appName || "This app"} is not in your whitelist.`,
          media: {
            type: event.detail.mediaType || 'image',
            content: event.detail.mediaContent
          },
          autoDismiss: true,
          dismissTime: 8
        },
        isActive: true
      };
      
      setCurrentRule(focusRule);
      setDisplayType('alert'); // Always use alert dialog for focus popups for maximum visibility
      setShowIcon(true); // Always show focus icon for focus popups
      setIsOpen(true);
      setIsImageLoaded(false); // Reset image loaded state
      
      console.log("Focus popup with media:", event.detail.mediaContent);
      
      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        setIsOpen(false);
      }, 8000);
      
      // Now we send a confirmation back that the popup was displayed
      // This helps with popup coordination in the main process
      const confirmEvent = new CustomEvent('focus-popup-displayed', {
        detail: {
          notificationId: event.detail.notificationId,
          timestamp: Date.now()
        }
      });
      window.dispatchEvent(confirmEvent);
    };
    
    // Add event listeners
    window.addEventListener('show-focus-popup', 
      handleShowFocusPopup as EventListener
    );
    
    // Handle notification dismissed events
    const handleNotificationDismissed = (event: CustomEvent<string>) => {
      console.log("Notification dismissed event received:", event.detail);
      if (currentRule && event.detail === currentRule.id) {
        setIsOpen(false);
      }
    };
    
    window.addEventListener('notification-dismissed', 
      handleNotificationDismissed as EventListener
    );
    
    return () => {
      window.removeEventListener('show-focus-popup', 
        handleShowFocusPopup as EventListener
      );
      window.removeEventListener('notification-dismissed', 
        handleNotificationDismissed as EventListener
      );
    };
  }, [currentRule]);
  
  // Handle image loading
  const handleImageLoad = () => {
    console.log("Image loaded successfully");
    setIsImageLoaded(true);
  };
  
  const handleImageError = () => {
    console.error("Failed to load image:", currentRule?.action.media?.content);
    setIsImageLoaded(true); // Still mark as loaded to show the dialog
  };
  
  const handleDismiss = () => {
    setIsOpen(false);
    
    // Dispatch an event that the notification was dismissed
    if (currentRule) {
      const dismissEvent = new CustomEvent('notification-dismissed', {
        detail: currentRule.id
      });
      window.dispatchEvent(dismissEvent);
    }
  };
  
  if (!currentRule) return null;
  
  const dialogContent = (
    <>
      <div className="relative">
        {/* Improved Image Display */}
        {currentRule.action.media?.type === 'image' && currentRule.action.media.content && (
          <div className="w-full overflow-hidden flex justify-center">
            <img
              src={currentRule.action.media.content}
              alt="Focus reminder"
              className="max-w-full h-auto object-contain rounded-t-lg"
              style={{ maxHeight: '240px' }}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        )}
        
        {currentRule.action.media?.type === 'video' && currentRule.action.media.content && (
          <div className="w-full overflow-hidden flex justify-center">
            <video
              src={currentRule.action.media.content}
              autoPlay
              muted
              loop
              className="max-w-full h-auto object-contain rounded-t-lg"
              style={{ maxHeight: '240px' }}
              onLoadedData={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 rounded-full bg-background/80 hover:bg-background/90"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>
      
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {showIcon && (
              <Focus className="h-5 w-5 text-amber-400" />
            )}
            <h3 className="text-xl font-semibold">{currentRule.name}</h3>
          </div>
          <p className="text-muted-foreground">
            {currentRule.action.text}
          </p>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={handleDismiss}>
            Dismiss
          </Button>
        </div>
      </div>
    </>
  );
  
  // Render different container types based on the display type
  return (
    <AnimatePresence>
      {displayType === 'alert' && isOpen && (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
          <AlertDialogContent 
            className="min-w-[500px] p-0 overflow-hidden bg-background rounded-lg border shadow-lg animate-in fade-in-0 zoom-in-95"
            style={{ 
              boxShadow: '0 10px 25px -5px rgba(26, 31, 44, 0.1), 0 8px 10px -6px rgba(26, 31, 44, 0.1)'
            }}
          >
            {dialogContent}
          </AlertDialogContent>
        </AlertDialog>
      )}
    </AnimatePresence>
  );
}
