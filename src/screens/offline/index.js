import React, { useEffect, useState, useRef } from "react";
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

  useEffect(() => {
    getAllOffline().then((savedItems) => {
      const validItems = savedItems.filter((item) => item.title && item.artist);
      setItems(validItems);
    });
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener("timeupdate", updateProgress);
      audioRef.current.addEventListener("ended", handleNext);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener("timeupdate", updateProgress);
        audioRef.current.removeEventListener("ended", handleNext);
      }
    };
  }, [audioRef.current]);

  const updateProgress = () => {
    if (audioRef.current) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % items.length;
    playTrack(nextIndex);
  };

  const handlePrevious = () => {
    const prevIndex = (currentIndex - 1 + items.length) % items.length;
    playTrack(prevIndex);
  };

  const playTrack = (index) => {
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
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this song?")) {
      await removeOffline(id);
      setItems(items.filter((x) => x.id !== id));
    }
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
                onClick={() => handleDelete(it.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}
