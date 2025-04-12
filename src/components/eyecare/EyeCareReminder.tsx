
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Eye, EyeOff, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimer } from "@/contexts/TimerContext";

interface EyeCareReminderProps {
  className?: string;
}

export function EyeCareReminder({ className }: EyeCareReminderProps) {
  const {
    eyeCareTimeElapsed,
    isEyeCareActive,
    isEyeCareResting,
    eyeCareRestProgress,
    eyeCareWorkDuration,
    eyeCareRestDuration,
    startEyeCareTimer,
    pauseEyeCareTimer,
    resetEyeCareTimer
  } = useTimer();

  const toggleActive = () => {
    if (isEyeCareActive) {
      pauseEyeCareTimer();
    } else {
      startEyeCareTimer();
    }
  };

  const workProgress = ((eyeCareWorkDuration - eyeCareTimeElapsed) / eyeCareWorkDuration) * 100;

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
            isEyeCareResting 
              ? "border-attention-warm-300 animate-breathe bg-attention-warm-50" 
              : "border-attention-blue-300 bg-attention-blue-50"
          )}
        >
          {isEyeCareResting ? (
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-lg font-semibold">Rest Eyes</span>
              <span className="text-sm">{eyeCareRestDuration - eyeCareTimeElapsed}s</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-lg font-semibold">Next Break</span>
              <span className="text-sm">
                {Math.floor((eyeCareWorkDuration - eyeCareTimeElapsed) / 60)}:
                {String((eyeCareWorkDuration - eyeCareTimeElapsed) % 60).padStart(2, "0")}
              </span>
            </div>
          )}
        </div>

        <Progress 
          value={isEyeCareResting ? eyeCareRestProgress : workProgress} 
          className={cn(
            "h-2 w-full", 
            isEyeCareResting ? "bg-attention-warm-100" : "bg-attention-blue-100"
          )} 
        />

        <div className="flex space-x-2">
          <Button
            variant={isEyeCareActive ? "secondary" : "outline"}
            size="sm"
            onClick={toggleActive}
            className="rounded-full"
          >
            {isEyeCareActive ? (
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
            onClick={resetEyeCareTimer}
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
