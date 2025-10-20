import React, { useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";
import { usePlayer } from "./PlayerContext";
import "./footerPlayer.css";

export default function FooterPlayer() {
  const { current, isPlaying, setIsPlaying, queue, index, playByIndex, clearPlayer } = usePlayer();
  const playerRef = useRef(null);
  const [progress, setProgress] = useState({ played: 0, playedSeconds: 0, loaded: 0, loadedSeconds: 0, duration: 0 });
  const [seeking, setSeeking] = useState(false);

  // Basic controls
  const handlePrev = () => {
    if (queue.length === 0) return;
    const i = index - 1 < 0 ? queue.length - 1 : index - 1;
    playByIndex(i);
  };
  const handleNext = () => {
    if (queue.length === 0) return;
    const i = (index + 1) % queue.length;
    playByIndex(i);
  };

  const formatTime = (s = 0) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className={`footer-player ${current ? "visible" : "hidden"}`}>
      {current && (
        <>
          <div className="fp-left">
            <img src={current.image} alt={current.title} />
            <div className="fp-meta">
              <div className="fp-title">{current.title}</div>
              <div className="fp-sub">Local track</div>
            </div>
          </div>
          <div className="fp-center">
            <button className="fp-btn" onClick={handlePrev} aria-label="Previous">⏮️</button>
            <button className="fp-btn play" onClick={() => setIsPlaying((p) => !p)} aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? "⏸️" : "▶️"}
            </button>
            <button className="fp-btn" onClick={handleNext} aria-label="Next">⏭️</button>

            {/* Progress */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:12, minWidth:260 }}>
              <span style={{ color:"#b3b3b3", fontSize:12, width:32, textAlign:"right"}}>{formatTime(progress.playedSeconds)}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={progress.played}
                onMouseDown={() => setSeeking(true)}
                onChange={(e) => setProgress((p) => ({ ...p, played: parseFloat(e.target.value) }))}
                onMouseUp={() => {
                  setSeeking(false);
                  if (playerRef.current) playerRef.current.seekTo(progress.played, "fraction");
                }}
                style={{ width: 200 }}
                aria-label="Seek"
              />
              <span style={{ color:"#b3b3b3", fontSize:12, width:40 }}>{formatTime((progress.duration || 0) - (progress.playedSeconds || 0))}</span>
            </div>
          </div>
          <div className="fp-right">
            <div className="fp-queue">{index + 1}/{queue.length}</div>
            <button className="fp-btn" aria-label="Close player" onClick={clearPlayer} title="Close">✕</button>
          </div>

          {/* Hidden ReactPlayer; controls via context */}
          <div className="fp-hidden">
            <ReactPlayer
              ref={playerRef}
              url={current.audio}
              playing={isPlaying}
              controls={false}
              width={0}
              height={0}
              onEnded={handleNext}
              onProgress={(p) => {
                if (!seeking) setProgress((old) => ({ ...old, ...p }));
              }}
              onDuration={(d) => setProgress((p) => ({ ...p, duration: d }))}
            />
          </div>
        </>
      )}
    </div>
  );
}
