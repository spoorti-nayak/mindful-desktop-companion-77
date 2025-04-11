
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Eye, EyeOff, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface EyeCareReminderProps {
  className?: string;
}

export function EyeCareReminder({ className }: EyeCareReminderProps) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isResting, setIsResting] = useState(false);
  const [restProgress, setRestProgress] = useState(0);
  const { toast } = useToast();

  // 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds
  const workDuration = 20 * 60; // 20 minutes in seconds
  const restDuration = 20; // 20 seconds
  
  const resetTimer = () => {
    setTimeElapsed(0);
    setIsResting(false);
    setRestProgress(0);
  };

  const toggleActive = () => {
    setIsActive(!isActive);
    if (!isActive) {
      resetTimer();
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive) {
      interval = setInterval(() => {
        if (isResting) {
          // During rest period
          const newRestProgress = ((restDuration - timeElapsed) / restDuration) * 100;
          setRestProgress(newRestProgress);
          
          if (timeElapsed >= restDuration) {
            // Rest period ended
            toast({
              title: "Rest completed!",
              description: "Your eyes should feel refreshed now.",
            });
            resetTimer();
          } else {
            setTimeElapsed(timeElapsed + 1);
          }
        } else {
          // During work period
          if (timeElapsed >= workDuration) {
            // Work period ended, start rest
            toast({
              title: "Time for an eye break!",
              description: "Look at something 20 feet away for 20 seconds.",
            });
            setTimeElapsed(0);
            setIsResting(true);
            setRestProgress(100);
          } else {
            setTimeElapsed(timeElapsed + 1);
          }
        }
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeElapsed, isResting, toast]);

  const workProgress = ((workDuration - timeElapsed) / workDuration) * 100;

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-center space-x-2">
          <Eye className="h-5 w-5" />
          <span>Eye Care</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <div
          className={cn(
            "flex h-32 w-32 flex-col items-center justify-center rounded-full border-4",
            isResting 
              ? "border-attention-warm-300 animate-breathe bg-attention-warm-50" 
              : "border-attention-blue-300 bg-attention-blue-50"
          )}
        >
          {isResting ? (
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-lg font-semibold">Rest Eyes</span>
              <span className="text-sm">{restDuration - timeElapsed}s</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-lg font-semibold">Next Break</span>
              <span className="text-sm">
                {Math.floor((workDuration - timeElapsed) / 60)}:
                {String((workDuration - timeElapsed) % 60).padStart(2, "0")}
              </span>
            </div>
          )}
        </div>

        <Progress 
          value={isResting ? restProgress : workProgress} 
          className={cn(
            "h-2 w-full", 
            isResting ? "bg-attention-warm-100" : "bg-attention-blue-100"
          )} 
        />

        <div className="flex space-x-2">
          <Button
            variant={isActive ? "secondary" : "outline"}
            size="sm"
            onClick={toggleActive}
            className="rounded-full"
          >
            {isActive ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" /> Pause
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" /> Resume
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetTimer}
            className="rounded-full"
          >
            <Clock className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Using the 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds
        </div>
      </CardContent>
    </Card>
  );
}
