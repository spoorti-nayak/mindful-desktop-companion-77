
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
              eyeCareWorkDuration: preferences.eyeCareSettings.workDuration,
              eyeCareRestDuration: preferences.eyeCareSettings.restDuration
            });
          }
        })
        .catch(error => {
          console.error('Failed to load preferences:', error);
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
  
  // Update tray tooltip with current timer status
  useEffect(() => {
    const systemTray = SystemTrayService.getInstance();
    
    if (isEyeCareActive) {
      if (isEyeCareResting) {
        systemTray.setTrayTooltip(`Eye Rest: ${eyeCareTimeElapsed}s remaining`);
      } else {
        const minutesRemaining = Math.floor(eyeCareTimeElapsed / 60);
        const secondsRemaining = eyeCareTimeElapsed % 60;
        systemTray.setTrayTooltip(`Next Break: ${minutesRemaining}:${String(secondsRemaining).padStart(2, '0')}`);
      }
    }
  }, [isEyeCareActive, isEyeCareResting, eyeCareTimeElapsed]);
}
