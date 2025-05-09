
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface AppUsageItem {
  name: string;
  time: string;
  type: "productive" | "distraction" | "communication";
}

interface AppUsageListProps {
  className?: string;
}

export function AppUsageList({ className }: AppUsageListProps) {
  const [appUsageData, setAppUsageData] = useState<AppUsageItem[]>([]);
  const { user } = useAuth();
  
  useEffect(() => {
    // In a real implementation, this would fetch from a backend API
    // For now, we're just initializing with empty data for new users
    setAppUsageData([]);
  }, [user]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>App Usage Today</CardTitle>
      </CardHeader>
      <CardContent>
        {appUsageData.length > 0 ? (
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
                <div className="text-sm font-medium">{app.time}</div>
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
