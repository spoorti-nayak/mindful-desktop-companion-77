
import { createContext, useContext, useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";

interface TimerContextState {
  // Pomodoro Timer state
  pomodoroMinutes: number;
  pomodoroSeconds: number;
  isPomodoroActive: boolean;
  isPomodoroBreak: boolean;
  pomodoroDuration: number;
  pomodoroBreakDuration: number;
  pomodoroProgress: number;
  
  // Eye Care Timer state
  eyeCareTimeElapsed: number;
  isEyeCareActive: boolean;
  isEyeCareResting: boolean;
  eyeCareRestProgress: number;
  eyeCareWorkDuration: number;
  eyeCareRestDuration: number;
  
  // Functions
  startPomodoroTimer: () => void;
  pausePomodoroTimer: () => void;
  resetPomodoroTimer: (isBreakTime?: boolean) => void;
  
  startEyeCareTimer: () => void;
  pauseEyeCareTimer: () => void;
  resetEyeCareTimer: () => void;
}

const TimerContext = createContext<TimerContextState | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  
  // Pomodoro Timer state
  const [pomodoroMinutes, setPomodoroMinutes] = useState(() => {
    const saved = localStorage.getItem("pomodoroMinutes");
    return saved ? parseInt(saved) : 25;
  });
  const [pomodoroSeconds, setPomodoroSeconds] = useState(() => {
    const saved = localStorage.getItem("pomodoroSeconds");
    return saved ? parseInt(saved) : 0;
  });
  const [isPomodoroActive, setIsPomodoroActive] = useState(() => {
    const saved = localStorage.getItem("isPomodoroActive");
    return saved ? saved === "true" : false;
  });
  const [isPomodoroBreak, setIsPomodoroBreak] = useState(() => {
    const saved = localStorage.getItem("isPomodoroBreak");
    return saved ? saved === "true" : false;
  });
  const [pomodoroProgress, setPomodoroProgress] = useState(() => {
    const saved = localStorage.getItem("pomodoroProgress");
    return saved ? parseFloat(saved) : 100;
  });
  const [pomodoroDuration] = useState(() => {
    const saved = localStorage.getItem("pomodoroDuration");
    return saved ? parseInt(saved) : 25;
  });
  const [pomodoroBreakDuration] = useState(() => {
    const saved = localStorage.getItem("pomodoroBreakDuration");
    return saved ? parseInt(saved) : 5;
  });
  
  // Eye Care Timer state
  const [eyeCareTimeElapsed, setEyeCareTimeElapsed] = useState(() => {
    const saved = localStorage.getItem("eyeCareTimeElapsed");
    return saved ? parseInt(saved) : 0;
  });
  const [isEyeCareActive, setIsEyeCareActive] = useState(() => {
    const saved = localStorage.getItem("isEyeCareActive");
    return saved ? saved === "true" : false;
  });
  const [isEyeCareResting, setIsEyeCareResting] = useState(() => {
    const saved = localStorage.getItem("isEyeCareResting");
    return saved ? saved === "true" : false;
  });
  const [eyeCareRestProgress, setEyeCareRestProgress] = useState(() => {
    const saved = localStorage.getItem("eyeCareRestProgress");
    return saved ? parseFloat(saved) : 0;
  });
  const [eyeCareWorkDuration] = useState(20 * 60); // 20 minutes
  const [eyeCareRestDuration] = useState(20); // 20 seconds

  // Save Pomodoro state to localStorage
  useEffect(() => {
    localStorage.setItem("pomodoroMinutes", pomodoroMinutes.toString());
    localStorage.setItem("pomodoroSeconds", pomodoroSeconds.toString());
    localStorage.setItem("isPomodoroActive", isPomodoroActive.toString());
    localStorage.setItem("isPomodoroBreak", isPomodoroBreak.toString());
    localStorage.setItem("pomodoroProgress", pomodoroProgress.toString());
    localStorage.setItem("pomodoroDuration", pomodoroDuration.toString());
    localStorage.setItem("pomodoroBreakDuration", pomodoroBreakDuration.toString());
  }, [pomodoroMinutes, pomodoroSeconds, isPomodoroActive, isPomodoroBreak, pomodoroProgress, pomodoroDuration, pomodoroBreakDuration]);

  // Save Eye Care state to localStorage
  useEffect(() => {
    localStorage.setItem("eyeCareTimeElapsed", eyeCareTimeElapsed.toString());
    localStorage.setItem("isEyeCareActive", isEyeCareActive.toString());
    localStorage.setItem("isEyeCareResting", isEyeCareResting.toString());
    localStorage.setItem("eyeCareRestProgress", eyeCareRestProgress.toString());
  }, [eyeCareTimeElapsed, isEyeCareActive, isEyeCareResting, eyeCareRestProgress]);

  // Pomodoro Timer Logic
  useEffect(() => {
    const totalSeconds = isPomodoroBreak 
      ? pomodoroBreakDuration * 60 
      : pomodoroDuration * 60;
      
    let interval: NodeJS.Timeout | null = null;

    if (isPomodoroActive) {
      interval = setInterval(() => {
        if (pomodoroSeconds === 0) {
          if (pomodoroMinutes === 0) {
            clearInterval(interval as NodeJS.Timeout);
            // Timer completed
            if (isPomodoroBreak) {
              toast({
                title: "Break time is over!",
                description: "Time to get back to work!",
              });
              resetPomodoroTimer(false);
            } else {
              toast({
                title: "Great job! Time for a break",
                description: "Take a moment to rest your eyes and stretch.",
              });
              resetPomodoroTimer(true);
            }
            return;
          }
          setPomodoroMinutes(pomodoroMinutes - 1);
          setPomodoroSeconds(59);
        } else {
          setPomodoroSeconds(pomodoroSeconds - 1);
        }

        // Calculate progress
        const currentTotalSeconds = pomodoroMinutes * 60 + pomodoroSeconds;
        const newProgress = (currentTotalSeconds / totalSeconds) * 100;
        setPomodoroProgress(newProgress);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPomodoroActive, pomodoroMinutes, pomodoroSeconds, isPomodoroBreak, 
      pomodoroDuration, pomodoroBreakDuration, toast]);

  // Eye Care Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isEyeCareActive) {
      interval = setInterval(() => {
        if (isEyeCareResting) {
          // During rest period
          const newRestProgress = ((eyeCareRestDuration - eyeCareTimeElapsed) / eyeCareRestDuration) * 100;
          setEyeCareRestProgress(newRestProgress);
          
          if (eyeCareTimeElapsed >= eyeCareRestDuration) {
            // Rest period ended
            toast({
              title: "Rest completed!",
              description: "Your eyes should feel refreshed now.",
            });
            resetEyeCareTimer();
          } else {
            setEyeCareTimeElapsed(eyeCareTimeElapsed + 1);
          }
        } else {
          // During work period
          if (eyeCareTimeElapsed >= eyeCareWorkDuration) {
            // Work period ended, start rest
            toast({
              title: "Time for an eye break!",
              description: "Look at something 20 feet away for 20 seconds.",
            });
            setEyeCareTimeElapsed(0);
            setIsEyeCareResting(true);
            setEyeCareRestProgress(100);
          } else {
            setEyeCareTimeElapsed(eyeCareTimeElapsed + 1);
          }
        }
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isEyeCareActive, eyeCareTimeElapsed, isEyeCareResting, eyeCareRestDuration, 
      eyeCareWorkDuration, toast]);

  // Pomodoro Timer functions
  const startPomodoroTimer = () => setIsPomodoroActive(true);
  const pausePomodoroTimer = () => setIsPomodoroActive(false);
  
  const resetPomodoroTimer = (isBreakTime: boolean = false) => {
    setIsPomodoroActive(false);
    if (isBreakTime) {
      setPomodoroMinutes(pomodoroBreakDuration);
      setIsPomodoroBreak(true);
    } else {
      setPomodoroMinutes(pomodoroDuration);
      setIsPomodoroBreak(false);
    }
    setPomodoroSeconds(0);
    setPomodoroProgress(100);
  };
  
  // Eye Care Timer functions
  const startEyeCareTimer = () => setIsEyeCareActive(true);
  const pauseEyeCareTimer = () => setIsEyeCareActive(false);
  
  const resetEyeCareTimer = () => {
    setEyeCareTimeElapsed(0);
    setIsEyeCareResting(false);
    setEyeCareRestProgress(0);
  };

  return (
    <TimerContext.Provider value={{
      // Pomodoro Timer state
      pomodoroMinutes,
      pomodoroSeconds,
      isPomodoroActive,
      isPomodoroBreak,
      pomodoroDuration,
      pomodoroBreakDuration,
      pomodoroProgress,
      
      // Eye Care Timer state
      eyeCareTimeElapsed,
      isEyeCareActive,
      isEyeCareResting,
      eyeCareRestProgress,
      eyeCareWorkDuration,
      eyeCareRestDuration,
      
      // Functions
      startPomodoroTimer,
      pausePomodoroTimer,
      resetPomodoroTimer,
      
      startEyeCareTimer,
      pauseEyeCareTimer,
      resetEyeCareTimer
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
}
