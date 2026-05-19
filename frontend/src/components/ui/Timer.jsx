import { useMemo } from "react";

export default function Timer({ seconds }) {
  const formatted = useMemo(() => {
    const total = Math.max(0, Number(seconds) || 0);
    const hrs = String(Math.floor(total / 3600)).padStart(2, "0");
    const mins = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const secs = String(total % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  }, [seconds]);

  return <span className="ui-timer">{formatted}</span>;
}
