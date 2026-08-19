import { useEffect, useState } from "react";

const STORAGE = "sattendorf-plan";

export function usePlanPicks() {
  const [picks, setPicks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE) || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(picks));
  }, [picks]);

  const setPick = (date, id) => {
    setPicks((prev) => {
      const next = { ...prev };
      if (!id) delete next[date];
      else next[date] = id;
      return next;
    });
  };

  return {
    picks,
    setPick,
    reset: () => setPicks({}),
    dirty: Object.keys(picks).length > 0,
  };
}
