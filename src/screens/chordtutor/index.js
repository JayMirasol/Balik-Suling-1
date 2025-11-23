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
    youtubeLink: "", // Add YouTube link here later
    credits: "Tutorial by: MUSICAL CHORDS", // Add creator credits here later
  },
  { 
    title: "Kapampangan Ku", 
    slug: "kapampangan-ku", 
    chords: "G - D - Em - C", 
    songwriter: "Unknown", 
    video: "",
    youtubeLink: "", // Add YouTube link here later
    credits: "Tutorial by: [Creator Name]", // Add creator credits here later
  },
  { 
    title: "Dakal Salamat", 
    slug: "dakal-salamat", 
    chords: "C - G - Em - F", 
    songwriter: "Unknown", 
    video: "",
    youtubeLink: "", // Add YouTube link here later
    credits: "Tutorial by: [Creator Name]", // Add creator credits here later
  },
  { 
    title: "Masayang Kebaitan", 
    slug: "masayang-kebaitan", 
    chords: "D - G - A - D", 
    songwriter: "Unknown", 
    video: "",
    youtubeLink: "", // Add YouTube link here later
    credits: "Tutorial by: [Creator Name]", // Add creator credits here later
  },
  { 
    title: "O Caca", 
    slug: "o-caca", 
    chords: "C - F - G - C", 
    songwriter: "Unknown", 
    video: "",
    youtubeLink: "", // Add YouTube link here later
    credits: "Tutorial by: [Creator Name]", // Add creator credits here later
  },
  { 
    title: "Tuknang", 
    slug: "tuknang", 
    chords: "Am - F - C - G", 
    songwriter: "Unknown", 
    video: "",
    youtubeLink: "", // Add YouTube link here later
    credits: "Tutorial by: [Creator Name]", // Add creator credits here later
  },
  { 
    title: "Pupul", 
    slug: "pu-pul", 
    chords: "E - A - B - E", 
    songwriter: "Unknown", 
    video: "",
    youtubeLink: "", // Add YouTube link here later
    credits: "Tutorial by: [Creator Name]", // Add creator credits here later
  },
  { 
    title: "Abe-Abe", 
    slug: "abe-abe", 
    chords: "F - Bb - C - F", 
    songwriter: "Unknown", 
    video: "",
    youtubeLink: "", // Add YouTube link here later
    credits: "Tutorial by: [Creator Name]", // Add creator credits here later
  }
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
                background: "#233656"
              }}>
                <Link to={`/chords/${song.slug}`} className="song-link" style={{ textDecoration: "none", color: "inherit" }}>
                  <h3 className="song-title" style={{ margin: 0 }}>{song.title}</h3>
                </Link>
                <p className="song-chords" style={{ margin: "6px 0 0", color: "#fff" }}>{song.chords}</p>
                
                {song.youtubeLink && (
                  <a 
                    href={song.youtubeLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: 8,
                      padding: "4px 10px",
                      background: "rgba(255, 0, 0, 0.1)",
                      border: "1px solid rgba(255, 0, 0, 0.3)",
                      borderRadius: 4,
                      color: "#ff0000",
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                      transition: "all 0.3s ease"
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = "rgba(255, 0, 0, 0.2)";
                      e.target.style.transform = "translateY(-2px)";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = "rgba(255, 0, 0, 0.1)";
                      e.target.style.transform = "translateY(0)";
                    }}
                  >
                    🎥 Watch Tutorial
                  </a>
                )}
                
                {song.credits && song.credits !== "Tutorial by: [Creator Name]" && (
                  <p style={{ 
                    margin: "6px 0 0", 
                    color: "rgba(255, 255, 255, 0.6)", 
                    fontSize: 11,
                    fontStyle: "italic"
                  }}>
                    {song.credits}
                  </p>
                )}
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
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "#666", fontStyle: "italic" }}>
                Tutorial by: Simbahan Chords {/* Add creator credits here */}
              </p>
              <a 
                href="https://www.youtube.com/watch?v=glVKFIiEdiM" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: 8,
                  padding: "6px 12px",
                  background: "rgba(255, 0, 0, 0.1)",
                  border: "1px solid rgba(255, 0, 0, 0.3)",
                  borderRadius: 4,
                  color: "#ff0000",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none"
                }}
              >
                🎥 Watch on YouTube
              </a>
            </div>
              <Link to="/chordtutor" style={{ color: "#0056b3" }}>← Browse songs to see more</Link>

          </div>
        </div>
      </div>
    </div>
  );
}
