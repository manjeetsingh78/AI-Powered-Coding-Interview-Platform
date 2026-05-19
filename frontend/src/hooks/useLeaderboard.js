import { useEffect, useState } from "react";

import { getLeaderboard } from "../api/analytics.api";

export default function useLeaderboard(refreshMs = 30000) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const result = await getLeaderboard();
      if (mounted && result.ok) {
        setRows(result.data?.leaderboard || result.data?.rows || []);
      }
      if (mounted) setLoading(false);
    };

    load();
    const timer = setInterval(load, refreshMs);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [refreshMs]);

  return { rows, loading };
}
