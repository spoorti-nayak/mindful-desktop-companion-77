
import { useEffect, useState } from 'react';
import SystemTrayService from '@/services/SystemTrayService';
import { useToast } from '@/hooks/use-toast';

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
    const notificationHandler = (message: string) => {
      toast({
        title: "Focus Reminder",
        description: message,
        duration: 8000, // Show longer for important focus notifications
      });
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
