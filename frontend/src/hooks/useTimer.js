import { useEffect, useMemo, useState } from "react";

export default function useTimer(initialSeconds = 0) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => {
      setSeconds((previous) => {
        if (previous <= 0) {
          clearInterval(timer);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [running]);

  const formatted = useMemo(() => {
    const hrs = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  }, [seconds]);

  return {
    seconds,
    formatted,
    running,
    isWarning: seconds <= 300,
    isExpired: seconds === 0,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    reset: (next = initialSeconds) => {
      setRunning(false);
      setSeconds(next);
    },
    setSeconds,
  };
}
