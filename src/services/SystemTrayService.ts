
// This is a mock implementation for web preview
// In a real desktop app, you would use Electron's Tray API

class SystemTrayService {
  private static instance: SystemTrayService;
  private lastActiveWindow: string | null = null;
  private windowSwitches: number = 0;
  private switchThreshold: number = 5; // Number of switches before showing refocus notification
  private switchTimeframe: number = 60000; // 1 minute timeframe
  private switchTimer: NodeJS.Timeout | null = null;
  private listeners: Array<(message: string, isFocusAlert: boolean) => void> = [];

  private constructor() {
    console.log("System tray service initialized");
    this.startWindowMonitoring();
  }

  public static getInstance(): SystemTrayService {
    if (!SystemTrayService.instance) {
      SystemTrayService.instance = new SystemTrayService();
    }
    return SystemTrayService.instance;
  }

  // In a real app, this would use native APIs to detect active windows
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

  private handleWindowSwitch(newWindow: string): void {
    console.log(`Active window changed to: ${newWindow}`);
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
      this.notifyFocusNeeded();
      this.windowSwitches = 0; // Reset after notification
    }
  }

  private notifyFocusNeeded(): void {
    const message = "You seem distracted. Try focusing on one task at a time.";
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

  // In a real app, these methods would control the system tray
  public showTrayIcon(): void {
    console.log("System tray icon shown");
  }

  public hideTrayIcon(): void {
    console.log("System tray icon hidden");
  }

  public setTrayTooltip(tooltip: string): void {
    console.log(`Set tray tooltip to: ${tooltip}`);
  }
}

export default SystemTrayService;
