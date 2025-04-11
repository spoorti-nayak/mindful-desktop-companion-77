
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface TimerProps {
  initialMinutes?: number;
  breakMinutes?: number;
  className?: string;
}

export function PomodoroTimer({
  initialMinutes = 25,
  breakMinutes = 5,
  className,
}: TimerProps) {
  const [minutes, setMinutes] = useState(initialMinutes);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [progress, setProgress] = useState(100);
  const totalSeconds = isBreak ? breakMinutes * 60 : initialMinutes * 60;
  const { toast } = useToast();

  const resetTimer = (isBreakTime: boolean = false) => {
    setIsActive(false);
    if (isBreakTime) {
      setMinutes(breakMinutes);
      setIsBreak(true);
    } else {
      setMinutes(initialMinutes);
      setIsBreak(false);
    }
    setSeconds(0);
    setProgress(100);
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            clearInterval(interval as NodeJS.Timeout);
            // Timer completed
            if (isBreak) {
              toast({
                title: "Break time is over!",
                description: "Time to get back to work!",
              });
              resetTimer(false);
            } else {
              toast({
                title: "Great job! Time for a break",
                description: "Take a moment to rest your eyes and stretch.",
              });
              resetTimer(true);
            }
            return;
          }
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          setSeconds(seconds - 1);
        }

        // Calculate progress
        const currentTotalSeconds = minutes * 60 + seconds;
        const newProgress = (currentTotalSeconds / totalSeconds) * 100;
        setProgress(newProgress);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, minutes, seconds, isBreak, totalSeconds, breakMinutes, initialMinutes, toast]);

  const formatTime = (min: number, sec: number): string => {
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-center">
          {isBreak ? "Break Time" : "Focus Time"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-4 border-muted">
          <div className="animate-pulse-gentle text-3xl font-bold">
            {formatTime(minutes, seconds)}
          </div>
          <div className="absolute -bottom-2 w-full px-4">
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        <div className="flex space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTimer}
            className="h-10 w-10 rounded-full"
          >
            {isActive ? <Pause size={20} /> : <Play size={20} />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => resetTimer(isBreak)}
            className="h-10 w-10 rounded-full"
          >
            <RotateCcw size={20} />
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          {isBreak
            ? "Take a break and rest your eyes"
            : "Stay focused on your task"}
        </div>
      </CardContent>
    </Card>
  );
}
