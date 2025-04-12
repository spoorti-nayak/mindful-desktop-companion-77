
import { useEffect, useState } from 'react';
import SystemTrayService from '@/services/SystemTrayService';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { useTimer } from '@/contexts/TimerContext';

export function useSystemTray() {
  const [isTrayActive, setIsTrayActive] = useState(false);
  const { toast } = useToast();
  const { 
    isEyeCareActive, 
    isEyeCareResting,
    eyeCareTimeElapsed
  } = useTimer();
  
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
