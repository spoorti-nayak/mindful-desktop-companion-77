
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Sample data - in a real app this would come from backend tracking
const appUsageData = [
  { name: "Visual Studio Code", time: "2h 15m", type: "productive" },
  { name: "Chrome (Work)", time: "1h 45m", type: "productive" },
  { name: "YouTube", time: "45m", type: "distraction" },
  { name: "Slack", time: "30m", type: "communication" },
  { name: "Twitter", time: "20m", type: "distraction" },
];

interface AppUsageListProps {
  className?: string;
}

export function AppUsageList({ className }: AppUsageListProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>App Usage Today</CardTitle>
      </CardHeader>
      <CardContent>
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
