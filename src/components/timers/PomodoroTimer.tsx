
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw } from "lucide-react";
import { useTimer } from "@/contexts/TimerContext";

interface TimerProps {
  className?: string;
}

export function PomodoroTimer({ className }: TimerProps) {
  const { 
    pomodoroMinutes, 
    pomodoroSeconds, 
    isPomodoroActive, 
    isPomodoroBreak, 
    pomodoroProgress,
    startPomodoroTimer,
    pausePomodoroTimer,
    resetPomodoroTimer
  } = useTimer();

  const toggleTimer = () => {
    if (isPomodoroActive) {
      pausePomodoroTimer();
    } else {
      startPomodoroTimer();
    }
  };

  const formatTime = (min: number, sec: number): string => {
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-center">
          {isPomodoroBreak ? "Break Time" : "Focus Time"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-4 border-muted">
          <div className="animate-pulse-gentle text-3xl font-bold">
            {formatTime(pomodoroMinutes, pomodoroSeconds)}
          </div>
          <div className="absolute -bottom-2 w-full px-4">
            <Progress value={pomodoroProgress} className="h-2" />
          </div>
        </div>

        <div className="flex space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTimer}
            className="h-10 w-10 rounded-full"
          >
            {isPomodoroActive ? <Pause size={20} /> : <Play size={20} />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => resetPomodoroTimer(isPomodoroBreak)}
            className="h-10 w-10 rounded-full"
          >
            <RotateCcw size={20} />
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          {isPomodoroBreak
            ? "Take a break and rest your eyes"
            : "Stay focused on your task"}
        </div>
      </CardContent>
    </Card>
  );
}
