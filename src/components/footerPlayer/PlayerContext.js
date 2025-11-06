import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";

// Minimal player context for local feed songs
const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [queue, setQueue] = useState([]); // [{ title, image, audio }]
  const [index, setIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const STORAGE_KEY = "bs_player_v1";

  const current = index >= 0 && index < queue.length ? queue[index] : null;

  const playTrack = useCallback((track, newQueue) => {
    if (Array.isArray(newQueue) && newQueue.length) {
      setQueue(newQueue);
      const i = newQueue.findIndex((t) => t.title === track.title);
      setIndex(i >= 0 ? i : 0);
    } else {
      setQueue([track]);
      setIndex(0);
    }
    setIsPlaying(true);
  }, []);

  const playByIndex = useCallback((i) => {
    if (i >= 0 && i < queue.length) {
      setIndex(i);
      setIsPlaying(true);
    }
  }, [queue.length]);

  const clearPlayer = useCallback(() => {
    setIsPlaying(false);
    setIndex(-1);
    setQueue([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const value = useMemo(() => ({
    queue,
    index,
    current,
    isPlaying,
    setIsPlaying,
    setIndex,
    setQueue,
    playTrack,
    playByIndex,
    clearPlayer,
  }), [queue, index, current, isPlaying, playTrack, playByIndex, clearPlayer]);

  // Restore from localStorage on first mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(saved?.queue) && saved.queue.length > 0) {
        setQueue(saved.queue);
        const i = typeof saved.index === "number" ? saved.index : 0;
        setIndex(i >= 0 && i < saved.queue.length ? i : 0);
        // Do not auto-play on restore to respect browser autoplay policies
        setIsPlaying(false);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage when queue/index change
  useEffect(() => {
    try {
      if (queue && queue.length) {
        const payload = { queue, index };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, [queue, index]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
