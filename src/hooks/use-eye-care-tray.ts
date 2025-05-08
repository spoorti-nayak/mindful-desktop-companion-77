
import { useEffect } from 'react';
import SystemTrayService from '@/services/SystemTrayService';
import { useTimer } from '@/contexts/TimerContext';
import { useAuth } from '@/contexts/AuthContext';

export function useEyeCareTray() {
  const { 
    isEyeCareActive, 
    isEyeCareResting,
    eyeCareTimeElapsed,
    eyeCareWorkDuration,
    eyeCareRestDuration,
    updateTimerSettings
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
            // Update eye care settings from preferences using the correct method
            updateTimerSettings({
              pomodoroDuration: 25, // Default value or get from preferences
              pomodoroBreakDuration: 5, // Default value or get from preferences
              eyeCareWorkDuration: preferences.eyeCareSettings.workDuration || 1200, // 20 minutes default
              eyeCareRestDuration: preferences.eyeCareSettings.restDuration || 20 // 20 seconds default
            });
          } else {
            // Set default 20-minute work duration if no preferences found
            updateTimerSettings({
              pomodoroDuration: 25,
              pomodoroBreakDuration: 5,
              eyeCareWorkDuration: 1200, // 20 minutes
              eyeCareRestDuration: 20 // 20 seconds
            });
          }
        })
        .catch(error => {
          console.error('Failed to load preferences:', error);
          // Still set default values on error
          updateTimerSettings({
            pomodoroDuration: 25,
            pomodoroBreakDuration: 5,
            eyeCareWorkDuration: 1200, // 20 minutes 
            eyeCareRestDuration: 20 // 20 seconds
          });
        });
    }
  }, [user, updateTimerSettings]);
  
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
  
  // Update tray tooltip and icon with current timer status
  useEffect(() => {
    const systemTray = SystemTrayService.getInstance();
    
    if (isEyeCareActive) {
      if (isEyeCareResting) {
        systemTray.setTrayTooltip(`Eye Rest: ${eyeCareTimeElapsed}s remaining`);
        systemTray.setTrayIcon('rest');
      } else {
        const minutesRemaining = Math.floor((eyeCareWorkDuration - eyeCareTimeElapsed) / 60);
        const secondsRemaining = (eyeCareWorkDuration - eyeCareTimeElapsed) % 60;
        systemTray.setTrayTooltip(`Next Break: ${minutesRemaining}:${String(secondsRemaining).padStart(2, '0')}`);
        systemTray.setTrayIcon('active');
      }
    } else {
      systemTray.setTrayTooltip('Mindful Desktop Companion');
      systemTray.setTrayIcon('default');
    }
  }, [isEyeCareActive, isEyeCareResting, eyeCareTimeElapsed, eyeCareWorkDuration]);
}
