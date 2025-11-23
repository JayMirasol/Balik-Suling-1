// src/screens/feed/index.js
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import './dashboard.css';
import { usePlayer } from "../../components/footerPlayer/PlayerContext";

// images
import atinCuPungSingsingImage from "../../screens/feed/home-music-images/atin-cu-pung-singsing.jpg";
import masayangkebaitanImage from "../../screens/feed/home-music-images/Masayang Kebaitan.jpg";
import ocacaImage from "../../screens/feed/home-music-images/O Caca.jpg";
import tuknang from "../../screens/feed/home-music-images/Tuknang.jpeg";
import pupul from "../../screens/feed/home-music-images/Pupul.jpeg";
import abeabe from "../../screens/feed/home-music-images/Abe-Abe.jpg";

// audio
import atinCuPungSingsingAudio from "../../screens/feed/home-music-audio/ytmp3free.cc_atin-cu-pung-singsing-kapampangan-folk-song-mapeh-7-youtubemp3free.org.mp3";
import masayangkebaitanAudio from "../../screens/feed/home-music-audio/ytmp3free.cc_masayang-kebaitan-keka-youtubemp3free.org.mp3";
import ocacaAudio from "../../screens/feed/home-music-audio/ytmp3free.cc_o-caca-o-caca-kapampangan-youtubemp3free.org.mp3";
import abeabeAudio from "../../screens/feed/home-music-audio/ytmp3free.cc_abe-abe-ver-1-youtubemp3free.org.mp3";

// Song list (you can add an `id` field if you want later)
export const songs = [
  {
    title: "Atin Cu Pung Singsing",
    image: atinCuPungSingsingImage,
    audio: atinCuPungSingsingAudio,
    path: "/chords/atin-cu-pung-singsing",
    youtubeLink: "https://www.youtube.com/watch?v=38cbteSAffE", // Add YouTube link here later
  },
  {
    title: "Masayang Kebaitan",
    image: masayangkebaitanImage,
    audio: masayangkebaitanAudio,
    path: "/chords/masayang-kebaitan",
    youtubeLink: "https://www.youtube.com/watch?v=g7doXhRymUY", // Add YouTube link here later
  },
  {
    title: "O Caca",
    image: ocacaImage,
    audio: ocacaAudio,
    path: "/chords/o-caca",
    youtubeLink: "https://www.youtube.com/watch?v=FDu-3JjTLnE", // Add YouTube link here later
  },
  {
    title: "Tuknang",
    image: tuknang,
    audio: ocacaAudio,
    // audio: tuknangAudio,
    path: "/chords/tuknang",
    youtubeLink: "https://www.youtube.com/watch?v=FDu-3JjTLnE", // Add YouTube link here later
  },
  {
    title: "Pupul",
    image: pupul,
    audio: masayangkebaitanAudio,
    // audio: pupulAudio,
    path: "/chords/pupul",
    youtubeLink: "https://www.youtube.com/watch?v=38cbteSAffE", // Add YouTube link here later
  },
  {
    title: "Abe-Abe",
    image: abeabe,
    audio: abeabeAudio,
    path: "/chords/abe-abe",
    youtubeLink: "https://www.youtube.com/watch?v=Y4zwG40DWiI", // Add YouTube link here later
  },
];

// axios instance: set REACT_APP_API_URL in your frontend .env if your backend runs on a different origin
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "", // default: relative paths (e.g. /api/...)
  timeout: 8000,
});

export default function Dashboard() {
  const [views, setViews] = useState({}); // mapping: { "Atin Cu Pung Singsing": 5, ... }
  const { playTrack, current, isPlaying } = usePlayer();
  const countedOnceRef = useRef({});

  useEffect(() => {

    // Fetch initial view counts
    const fetchViews = async () => {
      try {
        const resp = await api.get("/api/views");
        // Expecting server returns a simple mapping object
        if (resp && resp.data && typeof resp.data === "object") {
          setViews(resp.data);
        }
      } catch (err) {
        console.error("Error fetching views:", err);
      }
    };

    fetchViews();
  }, []);

  // increment on play: always send title and use server response as authoritative
  const incrementView = async (songTitle) => {
    if (!songTitle) return;
    try {
      const resp = await api.post("/api/views/increment", { title: songTitle });
      if (resp && resp.data && (resp.data.views !== undefined && resp.data.views !== null)) {
        const serverCount = Number(resp.data.views);
        setViews((prev) => ({
          ...prev,
          [songTitle]: serverCount,
        }));
        console.log(`View updated (server): ${songTitle} -> ${serverCount}`);
      } else {
        // If server didn't return a count, fall back to incrementing locally to avoid "disappearing" UX
        setViews((prev) => ({
          ...prev,
          [songTitle]: (prev[songTitle] || 0) + 1,
        }));
        console.warn("Increment response missing views; applied local increment for", songTitle);
      }
    } catch (err) {
      console.error("Error calling increment endpoint:", err);
      // fallback local increment so user sees immediate feedback
      setViews((prev) => ({
        ...prev,
        [songTitle]: (prev[songTitle] || 0) + 1,
      }));
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Balik Suling</h1>
        <div className="subtitle">Featured songs · Kapampangan folk and more</div>
      </div>
      <div className="dashboard-song-list">
        {songs.map((song, idx) => {
          const title = song.title;
          const count = views[title] || 0;
          const active = current && current.title === title;

          return (
            <div className={`dashboard-song-card ${active ? "active" : ""}`} key={`${title}-${idx}`}>
              <div className="cover-wrap">
                <Link to={song.path} className="dashboard-song-link" aria-label={`${title} details`}>
                  <img src={song.image} alt={title} className="dashboard-song-image" />
                </Link>
                {song.audio && (
                  <div className="play-overlay">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Start global player and record a listen once per session for this title
                        playTrack({ title, image: song.image, audio: song.audio }, songs);
                        if (!countedOnceRef.current[title]) {
                          countedOnceRef.current[title] = true;
                          incrementView(title);
                          
                          // Track song as learned
                          const learnedCount = Number(localStorage.getItem("songsLearnedCount") || 0);
                          localStorage.setItem("songsLearnedCount", String(learnedCount + 1));
                          window.dispatchEvent(new Event("statsUpdated"));
                        }
                      }}
                      aria-label={`Play ${title}`}
                    >
                      <span className="sr-only">{active && isPlaying ? "Pause" : "Play"}</span>
                      {active && isPlaying ? <span className="pause-icon" /> : <span className="play-icon" />}
                    </button>
                  </div>
                )}
              </div>
              <Link to={song.path} className="dashboard-song-link">
                <div className="dashboard-song-title">{title}</div>
                <div className="dashboard-song-details">View details</div>
              </Link>
              
              {song.youtubeLink && (
                <a 
                  href={song.youtubeLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="youtube-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  🎥 Watch on YouTube
                </a>
              )}
              
              <div className="dashboard-song-views">Listeners: {count}</div>
            </div>
          );
        })}
      </div>
      
      <div className="copyright-notice">
        <div className="copyright-content">
          <h3>📚 Educational Purpose & Copyright Notice</h3>
          <p>
            All musical content featured in Balik Suling is provided for <strong>educational and cultural preservation purposes only</strong>. 
            This platform aims to promote and preserve Kapampangan folk music and cultural heritage.
          </p>
          <p>
            We respect the intellectual property rights of all content creators. If you believe any content 
            infringes on your copyright, please contact us through the Feedback section, and we will promptly 
            address your concerns.
          </p>
          <p className="fair-use">
            This content may be protected by copyright law and is used under fair use principles for 
            educational purposes (17 U.S.C. § 107).
          </p>
        </div>
      </div>
    </div>
  );
}
