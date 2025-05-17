
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Rule } from "@/contexts/CustomRulesContext";
import { motion, AnimatePresence } from "framer-motion";

export function RichMediaPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  const [displayType, setDisplayType] = useState<'dialog' | 'alert'>('dialog');
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  
  // Listen for rule-based popups and focus-mode popups
  useEffect(() => {
    // Handler for rule-based popups
    const handleShowCustomRulePopup = (event: CustomEvent<Rule>) => {
      console.log("Received show-custom-rule-popup event", event.detail);
      setCurrentRule(event.detail);
      
      // Choose display type based on rule condition or action
      if (
        event.detail.condition.type === "app_switch" || 
        event.detail.name.toLowerCase().includes("focus")
      ) {
        setDisplayType('alert');
      } else {
        setDisplayType('dialog');
      }
      
      setIsOpen(true);
      
      // Ensure the notification is shown system-wide
      if (window.electron) {
        window.electron.send('show-native-notification', {
          title: event.detail.name,
          body: event.detail.action.text,
          notificationId: `custom-rule-${event.detail.id}`
        });
      }
      
      // Auto-dismiss if configured
      if (event.detail.action.autoDismiss && event.detail.action.dismissTime) {
        setTimeout(() => {
          setIsOpen(false);
        }, event.detail.action.dismissTime * 1000);
      }
    };

    // Enhanced handler for focus mode popups (from main process)
    const handleShowFocusPopup = (event: CustomEvent<{
      title: string;
      body: string;
      notificationId: string;
      mediaType: 'image' | 'video';
      mediaContent: string;
    }>) => {
      console.log("Received show-focus-popup event", event.detail);
      
      // Create a synthetic rule object to reuse the same popup system
      const focusRule: Rule = {
        id: event.detail.notificationId,
        name: event.detail.title,
        condition: {
          type: "app_switch",
          threshold: 0, 
          timeWindow: 0
        },
        action: {
          type: "notification",
          text: event.detail.body,
          media: {
            type: event.detail.mediaType,
            content: event.detail.mediaContent
          },
          autoDismiss: true,
          dismissTime: 8
        },
        isActive: true
      };
      
      setCurrentRule(focusRule);
      setDisplayType('alert'); // Always use alert dialog for focus popups for maximum visibility
      setIsOpen(true);
      
      // Send command to show system-level overlay popup via Electron
      if (window.electron) {
        console.log("Sending show-focus-popup command to Electron main process");
        window.electron.send('show-focus-popup', event.detail);
      }
      
      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        setIsOpen(false);
      }, 8000);
    };
    
    // Add event listeners
    window.addEventListener('show-custom-rule-popup', 
      handleShowCustomRulePopup as EventListener
    );
    
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
      window.removeEventListener('show-custom-rule-popup', 
        handleShowCustomRulePopup as EventListener
      );
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
    setIsImageLoaded(true);
  };
  
  const handleImageError = () => {
    console.error("Failed to load image:", currentRule?.action.media?.content);
    setIsImageLoaded(true); // Still mark as loaded to show the dialog
  };
  
  if (!currentRule) return null;
  
  const dialogContent = (
    <>
      <div className="relative">
        {currentRule.action.media?.type === 'image' && (
          <div className="w-full h-64 overflow-hidden">
            <img
              src={currentRule.action.media.content}
              alt="Rule media"
              className="w-full h-full object-cover"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        )}
        
        {currentRule.action.media?.type === 'video' && (
          <div className="w-full h-64 overflow-hidden">
            <video
              src={currentRule.action.media.content}
              autoPlay
              muted
              loop
              className="w-full h-full object-cover"
              onLoadedData={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 rounded-full bg-background/80 hover:bg-background/90"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>
      
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{currentRule.name}</h3>
          <p className="text-muted-foreground">
            {currentRule.action.text}
          </p>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={() => setIsOpen(false)}>
            Got it
          </Button>
        </div>
      </div>
    </>
  );
  
  // Render different container types based on the display type
  return (
    <>
      {displayType === 'dialog' && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="min-w-[500px] p-0 overflow-hidden bg-background rounded-lg border shadow-lg animate-in fade-in-0 zoom-in-95">
            {dialogContent}
          </DialogContent>
        </Dialog>
      )}
      
      {displayType === 'alert' && (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
          <AlertDialogContent className="min-w-[500px] p-0 overflow-hidden bg-background rounded-lg border shadow-lg">
            {dialogContent}
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
