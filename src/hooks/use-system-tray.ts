
import { useEffect, useState } from 'react';
import SystemTrayService from '@/services/SystemTrayService';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { useTimer } from '@/contexts/TimerContext';
import { useAuth } from '@/contexts/AuthContext';

export function useSystemTray() {
  const [isTrayActive, setIsTrayActive] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();
  const user = auth?.user;

  // Initialize system tray
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
        
        // Also send to electron for system-level notification
        if (window.electron) {
          window.electron.send('show-native-notification', {
            title: "Focus Alert",
            body: message
          });
        }
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
  
  // Load user preferences from MongoDB when component mounts
  useEffect(() => {
    const systemTray = SystemTrayService.getInstance();
    
    if (user) {
      // Try to load preferences from MongoDB
      systemTray.loadPreferences(user.id)
        .catch(error => {
          console.error('Failed to load preferences:', error);
        });
    }
  }, [user]);
  
  return { isTrayActive };
}
