
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Eye, EyeOff, Clock, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimer } from "@/contexts/TimerContext";
import { useSystemTray } from "@/hooks/use-system-tray";
import { useEyeCareTray } from "@/hooks/use-eye-care-tray"; 
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useBlinkDetection } from "@/hooks/use-blink-detection";
import { Slider } from "@/components/ui/slider";

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
    resetEyeCareTimer,
    updateTimerSettings
  } = useTimer();
  
  // Local state for settings
  const [workDuration, setWorkDuration] = useState(eyeCareWorkDuration / 60); // Convert to minutes
  const [restDuration, setRestDuration] = useState(eyeCareRestDuration); // Already in seconds
  const [showSettings, setShowSettings] = useState(false);

  // Initialize system tray
  const { isTrayActive } = useSystemTray();
  
  // Initialize eye care tray functionality
  useEyeCareTray();
  
  // Initialize blink detection
  const { isDetecting, toggleDetection } = useBlinkDetection();
  
  // Set up notifications for eye care events
  useEffect(() => {
    if (isEyeCareResting && eyeCareTimeElapsed === 0) {
      // First frame of rest period - notify user
      toast({
        title: "Eye Care Reminder",
        description: "Time to rest your eyes! Look 20ft away for 20 seconds.",
        duration: 8000,
      });
      
      // Send a notification via system tray as well
      if (window.electron) {
        window.electron.send('show-native-notification', {
          title: "Eye Care Break",
          body: "Time to rest your eyes! Look 20ft away for 20 seconds."
        });
      }
    } 
    else if (!isEyeCareResting && eyeCareTimeElapsed === 0 && isEyeCareActive) {
      // Rest period just ended - notify user
      toast({
        title: "Eye Care Break Complete",
        description: "You can resume your work now. Next break in 20 minutes.",
        duration: 5000,
      });
      
      // Send a notification via system tray as well
      if (window.electron) {
        window.electron.send('show-native-notification', {
          title: "Eye Care Break Complete",
          body: "You can resume your work now. Next break in 20 minutes."
        });
      }
    }
  }, [isEyeCareResting, eyeCareTimeElapsed, isEyeCareActive]);

  const toggleActive = () => {
    if (isEyeCareActive) {
      pauseEyeCareTimer();
    } else {
      startEyeCareTimer();
    }
  };

  const handleToggleBlinkDetection = async () => {
    const success = await toggleDetection();
    
    if (success) {
      toast({
        title: "Blink Reminders Activated",
        description: "You'll receive reminders to blink every 20 minutes.",
        duration: 5000,
      });
      
      // Send a notification via system tray as well
      if (window.electron) {
        window.electron.send('show-native-notification', {
          title: "Blink Reminders Activated",
          body: "You'll receive reminders to blink every 20 minutes."
        });
      }
    } else {
      toast({
        title: "Blink Reminders Deactivated",
        description: "20-minute blink reminders have been turned off.",
        duration: 5000,
      });
    }
  };
  
  // Handle saving settings
  const saveSettings = () => {
    updateTimerSettings({
      eyeCareWorkDuration: workDuration * 60, // Convert minutes to seconds
      eyeCareRestDuration: restDuration,
    });
    
    setShowSettings(false);
    resetEyeCareTimer();
    
    toast({
      title: "Settings Saved",
      description: `Eye care timer set to ${workDuration} minutes work, ${restDuration} seconds rest.`,
      duration: 3000,
    });
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
        {showSettings ? (
          <div className="w-full space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Work Duration: {workDuration} minutes
              </label>
              <Slider 
                min={1} 
                max={60} 
                step={1} 
                value={[workDuration]}
                onValueChange={(values) => setWorkDuration(values[0])}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Rest Duration: {restDuration} seconds
              </label>
              <Slider 
                min={10} 
                max={60} 
                step={5} 
                value={[restDuration]}
                onValueChange={(values) => setRestDuration(values[0])}
              />
            </div>
            
            <div className="flex justify-center space-x-2 pt-4">
              <Button onClick={saveSettings} size="sm">
                Save Settings
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="rounded-full"
              >
                Settings
              </Button>
            </div>
            
            {/* Blink detection toggle button */}
            <Button
              variant={isDetecting ? "default" : "outline"}
              size="sm"
              onClick={handleToggleBlinkDetection}
              className="rounded-full mt-2"
            >
              <Activity className="mr-2 h-4 w-4" />
              {isDetecting ? "Disable Blink Reminders" : "Enable Blink Reminders"}
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
                Blink reminders active - every 20 minutes
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
