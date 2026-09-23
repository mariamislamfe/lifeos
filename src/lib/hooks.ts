"use client";

import { useEffect, useState } from "react";

/** Current time, re-rendering every `intervalMs` (aligned to the minute by default). */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("lifeos:ui:" + key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {}
  }, [key]);
  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem("lifeos:ui:" + key, JSON.stringify(v));
    } catch {}
  };
  return [value, set] as const;
}
