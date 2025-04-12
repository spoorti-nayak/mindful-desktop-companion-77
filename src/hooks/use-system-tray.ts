
import { useEffect, useState } from 'react';
import SystemTrayService from '@/services/SystemTrayService';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { useTimer } from '@/contexts/TimerContext';
import { useAuth } from '@/contexts/AuthContext';

export function useSystemTray() {
  const [isTrayActive, setIsTrayActive] = useState(false);
  const { toast } = useToast();
  const { 
    isEyeCareActive, 
    isEyeCareResting,
    eyeCareTimeElapsed,
    eyeCareWorkDuration,
    eyeCareRestDuration,
    setEyeCareSettings
  } = useTimer();
  const { user } = useAuth();
  
  // Load user preferences from MongoDB when component mounts
  useEffect(() => {
    const systemTray = SystemTrayService.getInstance();
    
    if (user) {
      // Try to load preferences from MongoDB
      systemTray.loadPreferences(user.id)
        .then(preferences => {
          if (preferences?.eyeCareSettings) {
            // Update eye care settings from preferences
            setEyeCareSettings(
              preferences.eyeCareSettings.isActive, 
              preferences.eyeCareSettings.workDuration,
              preferences.eyeCareSettings.restDuration
            );
          }
        })
        .catch(error => {
          console.error('Failed to load preferences:', error);
        });
    }
  }, [user, setEyeCareSettings]);
  
  // Save preferences to MongoDB when they change
  useEffect(() => {
    const systemTray = SystemTrayService.getInstance();
    
    if (user) {
      const preferences = {
        eyeCareSettings: {
          isActive: isEyeCareActive,
          workDuration: eyeCareWorkDuration,
          restDuration: eyeCareRestDuration
        }
      };
      
      systemTray.savePreferences(user.id, preferences)
        .catch(error => {
          console.error('Failed to save preferences:', error);
        });
    }
  }, [user, isEyeCareActive, eyeCareWorkDuration, eyeCareRestDuration]);
  
  useEffect(() => {
    const systemTray = SystemTrayService.getInstance();
    
    // Initialize system tray
    systemTray.showTrayIcon();
    systemTray.setTrayTooltip("Mindful Desktop Companion");
    setIsTrayActive(systemTray.isDesktopEnvironment());
    
    // Add notification listener for focus alerts
    const notificationHandler = (message: string, isFocusAlert: boolean) => {
      if (isFocusAlert) {
        // Use centered toast for focus alerts (eye breaks, focus reminders)
        toast({
          title: "Attention Reminder",
          description: message,
          duration: 8000, // Show longer for important focus notifications
        });
      } else {
        // Use bottom-right toast for system notifications
        sonnerToast(message);
      }
    };
    
    systemTray.addNotificationListener(notificationHandler);
    
    // Update tray tooltip with current timer status
    if (isEyeCareActive) {
      if (isEyeCareResting) {
        systemTray.setTrayTooltip(`Eye Rest: ${eyeCareTimeElapsed}s remaining`);
      } else {
        const minutesRemaining = Math.floor(eyeCareTimeElapsed / 60);
        const secondsRemaining = eyeCareTimeElapsed % 60;
        systemTray.setTrayTooltip(`Next Break: ${minutesRemaining}:${String(secondsRemaining).padStart(2, '0')}`);
      }
    }
    
    return () => {
      // Cleanup
      systemTray.removeNotificationListener(notificationHandler);
      systemTray.hideTrayIcon();
    };
  }, [toast, isEyeCareActive, isEyeCareResting, eyeCareTimeElapsed]);
  
  return { isTrayActive };
}
