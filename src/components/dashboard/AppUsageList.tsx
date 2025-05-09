
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import SystemTrayService from "@/services/SystemTrayService";

interface AppUsageItem {
  name: string;
  time: number;
  type: "productive" | "distraction" | "communication";
}

interface AppUsageListProps {
  className?: string;
}

export function AppUsageList({ className }: AppUsageListProps) {
  const [appUsageData, setAppUsageData] = useState<AppUsageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  
  useEffect(() => {
    const systemTray = SystemTrayService.getInstance();
    
    // Subscribe to app usage updates
    const handleAppUsageUpdate = (appUsage: Array<{name: string, time: number, type: string}>) => {
      // Convert to formatted app usage items
      const formattedAppUsage: AppUsageItem[] = appUsage.map(app => ({
        name: app.name,
        time: app.time,
        type: app.type as "productive" | "distraction" | "communication"
      }));
      
      setAppUsageData(formattedAppUsage);
      setIsLoading(false);
    };
    
    systemTray.addAppUsageListener(handleAppUsageUpdate);
    
    // Set loading state to false after a delay if no data arrives
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    
    // Clean up listener
    return () => {
      systemTray.removeAppUsageListener(handleAppUsageUpdate);
      clearTimeout(timeout);
    };
  }, [user]);
  
  // Format milliseconds to time string (e.g. "2h 15m" or "45m" or "30s")
  const formatTime = (ms: number): string => {
    if (ms < 1000) return "just now";
    
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>App Usage Today</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex animate-pulse items-center justify-between rounded-lg border p-3">
                <div className="h-4 w-32 rounded bg-muted"></div>
                <div className="h-4 w-10 rounded bg-muted"></div>
              </div>
            ))}
          </div>
        ) : appUsageData.length > 0 ? (
          <div className="space-y-3">
            {appUsageData.map((app) => (
              <div
                key={app.name}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={cn(
                      "h-3 w-3 rounded-full",
                      app.type === "productive" && "bg-attention-green-400",
                      app.type === "distraction" && "bg-attention-warm-400",
                      app.type === "communication" && "bg-attention-blue-400"
                    )}
                  ></div>
                  <span>{app.name}</span>
                </div>
                <div className="text-sm font-medium">{formatTime(app.time)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground">No app usage data yet</p>
            <p className="text-xs text-muted-foreground mt-2">
              Data will appear as you use applications
            </p>
          </div>
        )}
        
        <div className="mt-4 flex items-center justify-center space-x-6">
          <div className="flex items-center">
            <div className="mr-2 h-3 w-3 rounded-full bg-attention-green-400"></div>
            <span className="text-sm text-muted-foreground">Productive</span>
          </div>
          <div className="flex items-center">
            <div className="mr-2 h-3 w-3 rounded-full bg-attention-warm-400"></div>
            <span className="text-sm text-muted-foreground">Distraction</span>
          </div>
          <div className="flex items-center">
            <div className="mr-2 h-3 w-3 rounded-full bg-attention-blue-400"></div>
            <span className="text-sm text-muted-foreground">Communication</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
