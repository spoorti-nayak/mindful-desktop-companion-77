
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Rule } from "@/contexts/CustomRulesContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function RichMediaPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  const [displayType, setDisplayType] = useState<'dialog' | 'alert' | 'popover'>('dialog');
  
  useEffect(() => {
    // Original handler for rule-based popups
    const handleShowPopup = (event: CustomEvent<Rule>) => {
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

    // New handler for focus mode popups (from main process)
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
          threshold: 0,  // Fix: add the required properties from Rule interface
          timeWindow: 0  // Fix: add the required properties from Rule interface
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
      
      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        setIsOpen(false);
      }, 8000);
    };
    
    // Add event listeners
    window.addEventListener('show-custom-rule-popup', 
      handleShowPopup as EventListener
    );
    
    window.addEventListener('show-focus-popup', 
      handleShowFocusPopup as EventListener
    );
    
    return () => {
      window.removeEventListener('show-custom-rule-popup', 
        handleShowPopup as EventListener
      );
      window.removeEventListener('show-focus-popup', 
        handleShowFocusPopup as EventListener
      );
    };
  }, []);
  
  // Handler for notification dismissed events
  useEffect(() => {
    const handleNotificationDismissed = (event: CustomEvent<string>) => {
      if (currentRule && event.detail === currentRule.id) {
        setIsOpen(false);
      }
    };
    
    window.addEventListener('notification-dismissed', 
      handleNotificationDismissed as EventListener
    );
    
    return () => {
      window.removeEventListener('notification-dismissed', 
        handleNotificationDismissed as EventListener
      );
    };
  }, [currentRule]);
  
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
