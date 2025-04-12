
import { useEffect, useState } from 'react';
import SystemTrayService from '@/services/SystemTrayService';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

export function useSystemTray() {
  const [isTrayActive, setIsTrayActive] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const systemTray = SystemTrayService.getInstance();
    
    // Initialize system tray
    systemTray.showTrayIcon();
    systemTray.setTrayTooltip("Mindful Desktop Companion");
    setIsTrayActive(true);
    
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
    
    return () => {
      // Cleanup
      systemTray.removeNotificationListener(notificationHandler);
      systemTray.hideTrayIcon();
    };
  }, [toast]);
  
  return { isTrayActive };
}
