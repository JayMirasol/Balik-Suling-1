import React from "react";
import { Link } from "react-router-dom";
import "./chords.css"; // If you want separate CSS
import { saveOffline } from "../shared/offlineStore";

const songs = [
  { id: "atin-cu-pung-singsing", title: "Atin Cu Pung Singsing" },
  { id: "kapampangan-ku", title: "Kapampangan Ku" },
  { id: "dakal-salamat", title: "Dakal Salamat" },
  { id: "masayang-kebaitan", title: "Masayang Kebaitan" },
  { id: "o-caca", title: "O Caca" },
  { id: "tuknang", title: "Tuknang" },
  { id: "pupul", title: "Pupul" },
  { id: "abe-abe", title: "Abe-Abe" },
];

export default function Chords() {
  return (
    <div className="screen-container">
      <h2>Kapampangan Chords Tutorial</h2>
      <ul className="song-list">
        {songs.map((song) => (
          <li key={song.id}>
            <Link to={`/chords/${song.id}`} className="song-link">
              {song.title}
            </Link>

            <button
              className="save-offline-btn"
              onClick={async (e) => {
                // Prevent navigating to the song page when clicking the button
                e.preventDefault();
                try {
                  await saveOffline({
                    id: `song-meta-${song.id}`, // unique key in IndexedDB
                    type: "song-meta",
                    data: song, // { id, title }
                  });
                  alert("Saved song metadata for offline.");
                } catch (err) {
                  console.error(err);
                  alert("Failed to save offline.");
                }
              }}
            >
              Save Offline
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
