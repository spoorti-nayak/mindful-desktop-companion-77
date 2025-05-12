
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Rule } from "@/contexts/CustomRulesContext";

export function RichMediaPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  
  useEffect(() => {
    const handleShowPopup = (event: CustomEvent<Rule>) => {
      console.log("Received show-custom-rule-popup event", event.detail);
      setCurrentRule(event.detail);
      setIsOpen(true);
      
      // Auto-dismiss if configured
      if (event.detail.action.autoDismiss && event.detail.action.dismissTime) {
        setTimeout(() => {
          setIsOpen(false);
        }, event.detail.action.dismissTime * 1000);
      }
    };
    
    // Add event listener
    window.addEventListener('show-custom-rule-popup', 
      handleShowPopup as EventListener
    );
    
    return () => {
      window.removeEventListener('show-custom-rule-popup', 
        handleShowPopup as EventListener
      );
    };
  }, []);
  
  if (!currentRule) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="min-w-[500px] p-0 overflow-hidden bg-background rounded-lg border shadow-lg animate-in fade-in-0 zoom-in-95">
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
      </DialogContent>
    </Dialog>
  );
}
