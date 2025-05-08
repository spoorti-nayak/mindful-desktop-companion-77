
// This service handles system tray functionality and active window monitoring

class SystemTrayService {
  private static instance: SystemTrayService;
  private lastActiveWindow: string | null = null;
  private windowSwitches: number = 0;
  private switchThreshold: number = 5; // Number of switches before showing refocus notification
  private switchTimeframe: number = 60000; // 1 minute timeframe
  private switchTimer: NodeJS.Timeout | null = null;
  private listeners: Array<(message: string, isFocusAlert: boolean) => void> = [];
  private isDesktopApp: boolean = false;
  private apiBaseUrl: string = 'http://localhost:5000/api';
  private trayIconState: 'default' | 'active' | 'rest' = 'default';
  private lastNotificationTime: number = 0;
  private notificationCooldown: number = 300000; // 5 minutes cooldown between notifications

  private constructor() {
    console.log("System tray service initialized");
    
    // Check if running in Electron or similar desktop environment
    this.isDesktopApp = this.checkIsDesktopApp();
    
    if (this.isDesktopApp) {
      this.initializeDesktopMonitoring();
    } else {
      // Fall back to simulation for web preview
      this.startWindowMonitoring();
    }
  }

  // Detect if we're running in a desktop environment
  private checkIsDesktopApp(): boolean {
    // Check for Electron or similar desktop app environment
    return !!(window as any).electron || !!(window as any).process?.versions?.electron;
  }

  // Allow external components to check if we're in desktop mode
  public isDesktopEnvironment(): boolean {
    return this.isDesktopApp;
  }

  // Initialize real monitoring for desktop environments
  private initializeDesktopMonitoring(): void {
    console.log("Initializing real desktop monitoring");
    
    // This would connect to native APIs via Electron IPC in a real app
    if (this.isDesktopApp && (window as any).electron) {
      // Example: Listen for active window changes from main process
      (window as any).electron.receive('active-window-changed', (windowInfo: any) => {
        this.handleRealWindowSwitch(windowInfo.title);
      });
      
      // Example: Listen for blink detection events
      (window as any).electron.receive('blink-detected', () => {
        this.notifyEyeCare();
      });
      
      // Set up eye care notification handler
      (window as any).electron.receive('eye-care-reminder', () => {
        this.notifyEyeCareBreak();
      });

      // Force a test notification on initialization
      setTimeout(() => {
        this.notifyTest();
      }, 3000);
    }
  }

  public static getInstance(): SystemTrayService {
    if (!SystemTrayService.instance) {
      SystemTrayService.instance = new SystemTrayService();
    }
    return SystemTrayService.instance;
  }

  // Simulated window monitoring for web preview
  private startWindowMonitoring(): void {
    // For demo purposes, we'll simulate window switches with random "apps"
    const mockApps = ["YouTube", "Instagram", "Twitter", "Gmail", "Notepad", "VS Code", "Spotify"];
    
    // Every 5-15 seconds, simulate a window switch
    setInterval(() => {
      const newWindow = mockApps[Math.floor(Math.random() * mockApps.length)];
      
      if (this.lastActiveWindow !== newWindow) {
        this.handleWindowSwitch(newWindow);
      }
    }, Math.random() * 10000 + 5000);
  }

  // Handle window switch for simulated environment
  private handleWindowSwitch(newWindow: string): void {
    console.log(`Active window changed to: ${newWindow}`);
    
    if (this.lastActiveWindow === newWindow) return;
    
    this.lastActiveWindow = newWindow;
    this.windowSwitches++;
    
    // Reset timer if exists
    if (this.switchTimer) {
      clearTimeout(this.switchTimer);
    }
    
    // Set new timer to reset counter after timeframe
    this.switchTimer = setTimeout(() => {
      this.windowSwitches = 0;
    }, this.switchTimeframe);
    
    // Check if we've exceeded the threshold - only notify on frequent switches
    if (this.windowSwitches >= this.switchThreshold) {
      // Only send notification if cooldown period has passed
      const now = Date.now();
      if (now - this.lastNotificationTime > this.notificationCooldown) {
        this.notifyFocusNeeded();
        this.lastNotificationTime = now;
      }
      this.windowSwitches = 0; // Reset after notification
    }
  }

  // Handle real window switch data from desktop APIs
  private handleRealWindowSwitch(windowTitle: string): void {
    console.log(`Real active window changed to: ${windowTitle}`);
    this.handleWindowSwitch(windowTitle); // Reuse existing logic
  }

  private notifyTest(): void {
    const message = "System tray notification test - if you see this, notifications are working!";
    
    // Show as native notification when in desktop mode
    if (this.isDesktopApp && (window as any).electron) {
      console.log("Sending test notification via IPC");
      (window as any).electron.send('show-native-notification', {
        title: "Notification Test", 
        body: message
      });
    }
    
    this.listeners.forEach(listener => listener(message, true));
  }

  private notifyFocusNeeded(): void {
    const message = "You seem distracted. Try focusing on one task at a time.";
    
    // Show as native notification when in desktop mode
    if (this.isDesktopApp && (window as any).electron) {
      console.log("Sending focus notification via IPC");
      (window as any).electron.send('show-native-notification', {
        title: "Focus Reminder", 
        body: message
      });
    }
    
    this.listeners.forEach(listener => listener(message, true));
  }

  private notifyEyeCare(): void {
    const message = "Remember to blink regularly to reduce eye strain.";
    
    // Show as native notification when in desktop mode
    if (this.isDesktopApp && (window as any).electron) {
      console.log("Sending eye care notification via IPC");
      (window as any).electron.send('show-native-notification', {
        title: "Blink Reminder", 
        body: message
      });
    }
    
    this.listeners.forEach(listener => listener(message, true));
  }
  
  private notifyEyeCareBreak(): void {
    const message = "Time to rest your eyes! Look 20ft away for 20 seconds.";
    
    // Show as native notification when in desktop mode
    if (this.isDesktopApp && (window as any).electron) {
      console.log("Sending eye care break notification via IPC");
      (window as any).electron.send('show-native-notification', {
        title: "Eye Care Break", 
        body: message
      });
    }
    
    // Update tray icon to rest mode
    this.setTrayIcon('rest');
    
    this.listeners.forEach(listener => listener(message, true));
  }

  public addNotificationListener(callback: (message: string, isFocusAlert: boolean) => void): void {
    this.listeners.push(callback);
  }

  public removeNotificationListener(callback: (message: string, isFocusAlert: boolean) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Save user preferences to MongoDB
  public async savePreferences(userId: string, preferences: any): Promise<boolean> {
    if (!userId) return false;
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/preferences/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences)
      });
      
      return response.ok;
    } catch (error) {
      console.error('Failed to save preferences:', error);
      return false;
    }
  }
  
  // Load user preferences from MongoDB
  public async loadPreferences(userId: string): Promise<any> {
    if (!userId) return null;
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/preferences/${userId}`);
      
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to load preferences:', error);
      return null;
    }
  }

  // In a real app, these methods would control the system tray via Electron
  public showTrayIcon(): void {
    if (this.isDesktopApp && (window as any).electron) {
      console.log("Showing system tray icon via IPC");
      (window as any).electron.send('show-tray');
    }
    console.log("System tray icon shown");
  }

  public hideTrayIcon(): void {
    if (this.isDesktopApp && (window as any).electron) {
      console.log("Hiding system tray icon via IPC");
      (window as any).electron.send('hide-tray');
    }
    console.log("System tray icon hidden");
  }

  public setTrayTooltip(tooltip: string): void {
    if (this.isDesktopApp && (window as any).electron) {
      console.log(`Setting tray tooltip to: ${tooltip}`);
      (window as any).electron.send('set-tray-tooltip', tooltip);
    }
    console.log(`Set tray tooltip to: ${tooltip}`);
  }
  
  // Method to set the tray icon state
  public setTrayIcon(state: 'default' | 'active' | 'rest'): void {
    if (this.trayIconState === state) return; // No change needed
    
    this.trayIconState = state;
    if (this.isDesktopApp && (window as any).electron) {
      console.log(`Setting tray icon state to: ${state}`);
      (window as any).electron.send('set-tray-icon', state);
    }
    console.log(`Set tray icon state to: ${state}`);
  }
}

export default SystemTrayService;
