
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Eye, EyeOff, Clock, Activity, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimer } from "@/contexts/TimerContext";
import { useSystemTray } from "@/hooks/use-system-tray";
import { useEyeCareTray } from "@/hooks/use-eye-care-tray"; 
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useBlinkDetection } from "@/hooks/use-blink-detection";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface EyeCareReminderProps {
  className?: string;
}

export function EyeCareReminder({ className }: EyeCareReminderProps) {
  const {
    eyeCareTimeElapsed,
    isEyeCareActive,
    isEyeCareResting,
    eyeCareRestProgress,
    eyeCareWorkDuration,
    eyeCareRestDuration,
    startEyeCareTimer,
    pauseEyeCareTimer,
    resetEyeCareTimer
  } = useTimer();
  
  // Initialize system tray
  const { isTrayActive } = useSystemTray();
  
  // Initialize eye care tray functionality
  useEyeCareTray();
  
  // Initialize blink detection
  const { isDetecting, isSupported, isInitializing, toggleDetection } = useBlinkDetection();
  const [showBlinkAlert, setShowBlinkAlert] = useState(false);
  
  // Set up notifications for eye care events
  useEffect(() => {
    if (isEyeCareResting && eyeCareTimeElapsed === 0) {
      // First frame of rest period - notify user
      toast({
        title: "Eye Care Reminder",
        description: "Time to rest your eyes! Look 20ft away for 20 seconds.",
        duration: 8000,
      });
    } 
    else if (!isEyeCareResting && eyeCareTimeElapsed === 0 && isEyeCareActive) {
      // Rest period just ended - notify user
      toast({
        title: "Eye Care Break Complete",
        description: "You can resume your work now. Next break in 20 minutes.",
        duration: 5000,
      });
    }
  }, [isEyeCareResting, eyeCareTimeElapsed, isEyeCareActive]);
  
  // Show alert when blink detection isn't supported
  useEffect(() => {
    if (!isInitializing && !isSupported && isTrayActive) {
      setShowBlinkAlert(true);
    } else {
      setShowBlinkAlert(false);
    }
  }, [isSupported, isTrayActive, isInitializing]);

  const toggleActive = () => {
    if (isEyeCareActive) {
      pauseEyeCareTimer();
    } else {
      startEyeCareTimer();
    }
  };

  const handleToggleBlinkDetection = async () => {
    if (!isSupported) {
      toast({
        title: "Blink Detection Unavailable",
        description: "Camera access or required models are not available. Blink detection is disabled.",
        duration: 8000,
        variant: "destructive"
      });
      return;
    }
    
    const success = await toggleDetection();
    
    if (success) {
      toast({
        title: "Blink Detection Activated",
        description: "We'll monitor your blink rate and remind you to blink more often.",
        duration: 5000,
      });
    } else {
      toast({
        title: "Blink Detection Deactivated",
        description: "Blink rate monitoring has been turned off.",
        duration: 5000,
      });
    }
  };

  const workProgress = ((eyeCareWorkDuration - eyeCareTimeElapsed) / eyeCareWorkDuration) * 100;
  const workDurationMinutes = Math.floor(eyeCareWorkDuration / 60);

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-center space-x-2">
          <Eye className="h-5 w-5" />
          <span>Eye Care{isTrayActive ? ' (System Tray Active)' : ''}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        {showBlinkAlert && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <AlertTitle>Blink Detection Unavailable</AlertTitle>
            <AlertDescription>
              Blink detection requires camera access and facial detection models.
              These are not available in your current environment.
            </AlertDescription>
          </Alert>
        )}
        
        {isInitializing && (
          <Alert variant="default" className="mb-4 bg-muted">
            <AlertTitle>Initializing blink detection</AlertTitle>
            <AlertDescription>
              Loading facial detection models and checking camera access...
            </AlertDescription>
          </Alert>
        )}
        
        <div
          className={cn(
            "flex h-32 w-32 flex-col items-center justify-center rounded-full border-4",
            isEyeCareResting 
              ? "border-attention-warm-300 animate-breathe bg-attention-warm-50 dark:bg-attention-warm-900/20" 
              : "border-attention-blue-300 bg-attention-blue-50 dark:bg-attention-blue-900/20"
          )}
        >
          {isEyeCareResting ? (
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-lg font-semibold">Rest Eyes</span>
              <span className="text-sm font-bold bg-background/80 dark:bg-background/30 text-foreground px-2 py-0.5 rounded-full shadow-sm">
                {eyeCareRestDuration - eyeCareTimeElapsed}s
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-lg font-semibold">Next Break</span>
              <span className="text-sm font-bold bg-background/80 dark:bg-background/30 text-foreground px-2 py-0.5 rounded-full shadow-sm">
                {Math.floor((eyeCareWorkDuration - eyeCareTimeElapsed) / 60)}:
                {String((eyeCareWorkDuration - eyeCareTimeElapsed) % 60).padStart(2, "0")}
              </span>
            </div>
          )}
        </div>

        <Progress 
          value={isEyeCareResting ? eyeCareRestProgress : workProgress} 
          className={cn(
            "h-2 w-full", 
            isEyeCareResting ? "bg-attention-warm-100" : "bg-attention-blue-100"
          )} 
        />

        <div className="flex space-x-2">
          <Button
            variant={isEyeCareActive ? "secondary" : "outline"}
            size="sm"
            onClick={toggleActive}
            className="rounded-full"
          >
            {isEyeCareActive ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" /> Pause
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" /> Resume
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetEyeCareTimer}
            className="rounded-full"
          >
            <Clock className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>
        
        {/* Blink detection toggle button */}
        <Button
          variant={isDetecting ? "default" : "outline"}
          size="sm"
          onClick={handleToggleBlinkDetection}
          className={cn(
            "rounded-full mt-2",
            (!isSupported || isInitializing) && "opacity-50 cursor-not-allowed"
          )}
          disabled={!isSupported || isInitializing}
        >
          <Activity className="mr-2 h-4 w-4" />
          {isDetecting ? "Disable Blink Detection" : "Enable Blink Detection"}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          {isEyeCareResting 
            ? `Rest your eyes for ${eyeCareRestDuration} seconds` 
            : `Work for ${workDurationMinutes} minutes before taking an eye break`}
        </div>
        
        <div className="text-xs text-muted-foreground mt-2">
          {isTrayActive 
            ? "Eye care reminders will show even when minimized" 
            : "Running in browser mode - minimize to tray disabled"}
        </div>
        
        {isDetecting && (
          <div className="text-xs text-green-500 flex items-center">
            <Activity className="h-3 w-3 mr-1 animate-pulse" />
            Actual blink detection active - monitoring your blink rate
          </div>
        )}
      </CardContent>
    </Card>
  );
}
