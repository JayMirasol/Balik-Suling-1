import React, { useEffect, useState, useRef, useCallback } from "react";
import { getAllOffline, removeOffline } from "../../shared/offlineStore";
import "./offline.css";
import { songs } from "../feed";

export default function Offline() {
  const [items, setItems] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  // Toast notification state
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("success"); // success | info | error
  const showToast = (msg, type = "success", timeout = 2500) => {
    setToastType(type);
    setToastMsg(msg);
    if (timeout) {
      setTimeout(() => setToastMsg(""), timeout);
    }
  };

  // Confirm delete modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [pendingTitle, setPendingTitle] = useState("");

  useEffect(() => {
    getAllOffline().then((savedItems) => {
      const validItems = savedItems.filter((item) => item.title && item.artist);
      setItems(validItems);
    });
  }, []);

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  }, []);

  // Define playTrack before any hooks or callbacks that reference it and memoize for stable deps
  const playTrack = useCallback((index) => {
    const track = items[index];
    const matchedSong = songs.find((song) => song.title === track.title);
    if (matchedSong) {
      setCurrentTrack(track);
      setCurrentIndex(index);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.src = matchedSong.audio;
        audioRef.current.play();
      } else {
        audioRef.current = new Audio(matchedSong.audio);
        audioRef.current.play();
      }
    } else {
      alert("Audio file for this song is not available.");
    }
  }, [items]);

  const handleNext = useCallback(() => {
    const nextIndex = (currentIndex + 1) % items.length;
    playTrack(nextIndex);
  }, [currentIndex, items.length, playTrack]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.addEventListener("timeupdate", updateProgress);
    el.addEventListener("ended", handleNext);
    return () => {
      el.removeEventListener("timeupdate", updateProgress);
      el.removeEventListener("ended", handleNext);
    };
  }, [currentTrack, updateProgress, handleNext]);

  const handlePlayPause = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handlePrevious = () => {
    const prevIndex = (currentIndex - 1 + items.length) % items.length;
    playTrack(prevIndex);
  };

  const requestDelete = (id) => {
    const it = items.find((x) => x.id === id);
    setPendingId(id);
    setPendingTitle(it?.title || "this song");
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingId) return;
    try {
      await removeOffline(pendingId);
      setItems((prev) => prev.filter((x) => x.id !== pendingId));
      setConfirmOpen(false);
      setPendingId(null);
      showToast("Removed from Offline.", "success");
    } catch (e) {
      console.error("Failed to delete offline item", e);
      setConfirmOpen(false);
      showToast("Failed to delete. Please try again.", "error", 3200);
    }
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setPendingId(null);
    showToast("Delete cancelled.", "info", 1800);
  };

  return (
    <div className="screen-container offline">
      <h2>Saved Offline</h2>
      <div>
    {currentTrack && (
        <div className="player-container">
          <div className="player-details">
            <p className="player-title">{currentTrack.title}</p>
            <p className="player-artist">{currentTrack.artist}</p>
          </div>
          <div className="player-controls">
            <button onClick={handlePrevious}>⏮</button>
            <button onClick={handlePlayPause}>{isPlaying ? "⏸" : "▶"}</button>
            <button onClick={handleNext}>⏭</button>
          </div>
          <div className="player-progress">
            <div
              className="progress-bar"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
      <div className="offline-list">
        {items.map((it, index) => (
          <div key={it.id} className="card offline">
            <div className="card-details offline">
              <p className="song-title offline">{it.title}</p>
              <p className="song-artist offline">{it.artist}</p>
            </div>
            <div className="card-actions offline">
              <button className="offline" onClick={() => playTrack(index)}>Play</button>
              <button
                className="offline"
                onClick={() => requestDelete(it.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* Toast notification */}
      {toastMsg && (
        <div
          aria-live="polite"
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            background:
              toastType === "success" ? "#2a6" : toastType === "info" ? "#0a58ca" : "#cc0000",
            color: "#fff",
            padding: "12px 14px",
            borderRadius: 10,
            boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 240,
          }}
        >
          <span>{toastMsg}</span>
          <button
            onClick={() => setToastMsg("")}
            style={{
              marginLeft: "auto",
              background: "transparent",
              border: 0,
              color: "#fff",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
            }}
            aria-label="Dismiss notification"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      {/* Confirm delete modal */}
      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
          }}
        >
          <div
            style={{
              background: "#fff",
              color: "#111",
              borderRadius: 12,
              padding: 20,
              width: "min(92vw, 420px)",
              boxShadow: "0 10px 28px rgba(0,0,0,0.3)",
            }}
          >
            <h3 id="confirm-title" style={{ marginTop: 0, marginBottom: 8 }}>
              Are you sure you want to delete this song?
            </h3>
            <div style={{ opacity: 0.7, marginBottom: 14 }}>{pendingTitle}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={cancelDelete}
                style={{
                  padding: "8px 12px",
                  background: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: "8px 12px",
                  background: "#c62828",
                  color: "#fff",
                  border: "1px solid #c62828",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
