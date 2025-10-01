// src/screens/chordtutor/index.js
import React from "react";
import { Link } from "react-router-dom";
import "./Chords.css"; // your existing styling (optional)

const kapampanganSongs = [
  {
    title: "Atin Cu Pung Singsing",
    slug: "atin-cu-pung-singsing",
    chords: "C - G - Am - F",
    songwriter: "Juan Crisostomo Soto",
    video: "https://www.youtube.com/embed/glVKFIiEdiM", // replace with real tutorial url
  },
  { title: "Kapampangan Ku", slug: "kapampangan-ku", chords: "G - D - Em - C", songwriter: "Unknown", video: "" },
  { title: "Dakal Salamat", slug: "dakal-salamat", chords: "C - G - Em - F", songwriter: "Unknown", video: "" },
  { title: "Masayang Kebaitan", slug: "masayang-kebaitan", chords: "D - G - A - D", songwriter: "Unknown", video: "" },
  { title: "O Caca", slug: "o-caca", chords: "C - F - G - C", songwriter: "Unknown", video: "" },
  { title: "Tuknang", slug: "tuknang", chords: "Am - F - C - G", songwriter: "Unknown", video: "" },
  { title: "Pupul", slug: "pu-pul", chords: "E - A - B - E", songwriter: "Unknown", video: "" },
  { title: "Abe-Abe", slug: "abe-abe", chords: "F - Bb - C - F", songwriter: "Unknown", video: "" }
];

export default function Chords() {
  return (
    <div className="screen-container chords-container">
      <h1 className="chords-title">🎸 Kapampangan Chords Tutorial</h1>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Left: Song list */}
        <div style={{ flex: "1 1 360px", minWidth: 280 }}>
          <h2 style={{ marginTop: 8 }}>Songs</h2>
          <ul className="chords-list" style={{ paddingLeft: 0, listStyle: "none" }}>
            {kapampanganSongs.map((song, index) => (
              <li key={index} className="chord-item" style={{
                marginBottom: 12,
                padding: 12,
                borderRadius: 8,
                border: "1px solid #eee",
                background: "#000"
              }}>
                <Link to={`/chords/${song.slug}`} className="song-link" style={{ textDecoration: "none", color: "inherit" }}>
                  <h3 className="song-title" style={{ margin: 0 }}>{song.title}</h3>
                </Link>
                <p className="song-chords" style={{ margin: "6px 0 0", color: "#555" }}>{song.chords}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Tutorials (merged) */}
        <div style={{ flex: "1 1 420px", minWidth: 320 }}>
          <h2 style={{ marginTop: 8 }}>Tutorials</h2>

          {/* Static tutorial items */}
          <div style={{ display: "grid", gap: 12 }}>

            <div style={{ padding: 12, borderRadius: 8, border: "1px solid #eee", background: "#fff" }}>
              <h4 style={{ margin: "0 0 8px" }}>Balen a Pari (Medly) - Kapampangan cover</h4>
              <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                <iframe
                  src="https://www.youtube.com/embed/glVKFIiEdiM"
                  title="Balen a Pari (Medly)"
                  style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", border: 0 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
              <Link to="http://localhost:3000/chordtutor" style={{ color: "#0a58ca" }}>← Browse songs to see more</Link>

          </div>
        </div>
      </div>
    </div>
  );
}
