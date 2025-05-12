
import { useEffect, useState } from 'react';
import SystemTrayService from '@/services/SystemTrayService';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { useTimer } from '@/contexts/TimerContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusMode } from '@/contexts/FocusModeContext';

export function useSystemTray() {
  const [isTrayActive, setIsTrayActive] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();
  const user = auth?.user;
  const { isFocusMode, whitelist } = useFocusMode();

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
        
        // We no longer need to send duplicate notifications to electron
        // since they are now handled directly by the main process
        // This prevents double notifications
      } else {
        // Use bottom-right toast for system notifications
        sonnerToast(message);
      }
    };
    
    systemTray.addNotificationListener(notificationHandler);
    
    // Listen for notification dismissed events
    const handleNotificationDismissed = (e: Event) => {
      const notificationId = (e as CustomEvent<string>).detail;
      if (notificationId && window.electron) {
        // Sync the dismissed state back to the main process
        window.electron.send('notification-dismissed', notificationId);
      }
    };
    
    window.addEventListener('notification-dismissed', handleNotificationDismissed as EventListener);
    
    return () => {
      // Cleanup
      systemTray.removeNotificationListener(notificationHandler);
      systemTray.hideTrayIcon();
      window.removeEventListener('notification-dismissed', handleNotificationDismissed as EventListener);
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

  // Sync focus mode settings with system tray service
  useEffect(() => {
    const systemTray = SystemTrayService.getInstance();
    
    // Update focus mode settings in SystemTrayService
    systemTray.setFocusMode(isFocusMode);
    systemTray.setFocusModeWhitelist(whitelist);
    
  }, [isFocusMode, whitelist]);
  
  return { isTrayActive };
}
