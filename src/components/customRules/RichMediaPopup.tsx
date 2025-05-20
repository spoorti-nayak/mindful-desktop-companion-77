
import React, { useEffect, useState } from "react";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { X, Focus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusMode } from "@/contexts/FocusModeContext";

export function RichMediaPopup() {
  const { customImage, customText } = useFocusMode();
  const [isOpen, setIsOpen] = useState(false);
  const [notificationData, setNotificationData] = useState<{
    title: string;
    body: string;
    notificationId: string;
    appName?: string;
    mediaContent?: string;
  } | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [lastShownAppId, setLastShownAppId] = useState<string | null>(null);
  
  // Listen for focus-mode popups
  useEffect(() => {
    // Handler for focus mode popups
    const handleShowFocusPopup = (event: CustomEvent<{
      title: string;
      body: string;
      notificationId: string;
      appName?: string;
      mediaType?: string;
      mediaContent?: string;
    }>) => {
      console.log("Received show-focus-popup event", event.detail);
      
      // Extract app ID to prevent duplicate popups
      const appIdMatch = event.detail.notificationId.match(/focus-mode-(.*?)-\d+/);
      const currentAppId = appIdMatch ? appIdMatch[1] : null;
      
      // If this is the same app we just showed a popup for, don't show another one
      if (currentAppId && currentAppId === lastShownAppId) {
        console.log("Skipping duplicate popup for app:", currentAppId);
        return;
      }
      
      // Update the last shown app ID
      if (currentAppId) {
        setLastShownAppId(currentAppId);
      }
      
      // Set notification data - Use the mediaContent from the event if provided
      setNotificationData({
        title: event.detail.title,
        body: event.detail.body,
        notificationId: event.detail.notificationId,
        appName: event.detail.appName,
        mediaContent: event.detail.mediaContent
      });
      
      setIsOpen(true);
      setIsImageLoaded(false);
      
      console.log("Opening focus popup for app:", event.detail.appName);
      console.log("With custom media:", event.detail.mediaContent || "None provided");
      
      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        setIsOpen(false);
      }, 8000);
      
      // Send confirmation that popup was displayed
      const confirmEvent = new CustomEvent('focus-popup-displayed', {
        detail: {
          notificationId: event.detail.notificationId,
          timestamp: Date.now()
        }
      });
      window.dispatchEvent(confirmEvent);
    };
    
    // Handle notification dismissed events
    const handleNotificationDismissed = (event: CustomEvent<string>) => {
      console.log("Notification dismissed event received:", event.detail);
      if (notificationData && event.detail === notificationData.notificationId) {
        setIsOpen(false);
        setLastShownAppId(null);
      }
    };
    
    window.addEventListener('show-focus-popup', 
      handleShowFocusPopup as EventListener
    );
    
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
  }, [lastShownAppId, notificationData]);
  
  // Handle image loading
  const handleImageLoad = () => {
    console.log("Image loaded successfully");
    setIsImageLoaded(true);
  };
  
  const handleImageError = () => {
    console.error("Failed to load image");
    setIsImageLoaded(true); // Still mark as loaded to show the dialog
  };
  
  const handleDismiss = () => {
    setIsOpen(false);
    setLastShownAppId(null);
    
    // Dispatch an event that the notification was dismissed
    if (notificationData) {
      const dismissEvent = new CustomEvent('notification-dismissed', {
        detail: notificationData.notificationId
      });
      window.dispatchEvent(dismissEvent);
    }
  };
  
  if (!notificationData) return null;
  
  // Determine which image to display - prefer the one from the event, fallback to context
  const displayImage = notificationData.mediaContent || customImage;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
          <AlertDialogContent 
            className="p-0 overflow-hidden bg-background rounded-lg border shadow-lg max-w-md w-full"
            style={{ borderRadius: '12px' }}
          >
            {/* Image Display - Use the mediaContent from notification or fallback to context */}
            {displayImage && (
              <div className="overflow-hidden flex justify-center w-full">
                <img
                  src={displayImage}
                  alt="Focus reminder"
                  className="w-full object-contain max-h-[240px] rounded-t-lg"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              </div>
            )}
            
            <div className="p-6 space-y-4 relative">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 rounded-full bg-background/80 hover:bg-background/90"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Focus className="h-5 w-5 text-amber-400" />
                  <h3 className="text-xl font-semibold">{notificationData.title}</h3>
                </div>
                
                {/* Message about whitelist - display exactly what's provided in the body */}
                <p className="text-muted-foreground">
                  {notificationData.body}
                </p>
              </div>
              
              <div className="flex justify-end pt-2">
                <Button onClick={handleDismiss}>
                  Dismiss
                </Button>
              </div>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </AnimatePresence>
  );
}
