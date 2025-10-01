import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "../../components/sidebar";
import { setClientToken } from "../../spotify";
import Login from "../auth/login";
import Favorites from "../chordscanner";
import Feed from "../feed";
import Library from "../library";
import Player from "../player";
import Trending from "../chordtutor";
import Chords from "../chords";
import SongDetail from "../songDetail";
import ScanScore from "../scanScore";
import BeginnerChords from "../beginnerChords";
import Translate from "../translate";
import Tutorials from "../tutorials";
import Offline from "../offline";
import "./home.css";

export default function Home() {
  const [token, setToken] = useState("");
  const [initializing, setInitializing] = useState(true); // <- NEW

  useEffect(() => {
    const existing = window.localStorage.getItem("token");
    const hash = window.location.hash; // e.g. #access_token=...&token_type=Bearer&expires_in=3600

    if (!existing && hash) {
      // Parse access_token from the hash safely
      const params = new URLSearchParams(hash.slice(1));
      const _token = params.get("access_token");

      if (_token) {
        window.localStorage.setItem("token", _token);
        setToken(_token);
        setClientToken(_token);
        // Remove the hash so you don't land on "/#"
        window.history.replaceState(null, "", window.location.pathname);
      }
    } else if (existing) {
      setToken(existing);
      setClientToken(existing);
    }

    setInitializing(false); // <- allow routing after hash is handled
  }, []);

  // While we’re checking the hash, render nothing (prevents early redirects that would drop the hash)
  if (initializing) return null;

  return (
    <Router>
      {!token ? (
        // Not logged in: show Login; everything else → /login
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        // Logged in: default to /feed and block /login
        <div className="main-body">
          <Sidebar />
          <Routes>
            <Route path="/" element={<Navigate to="/feed" replace />} />
            <Route path="/login" element={<Navigate to="/feed" replace />} />
            <Route path="/library" element={<Library />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/chordtutor" element={<Trending />} />
            <Route path="/player" element={<Player />} />
            <Route path="/chordscanner" element={<Favorites />} />
            <Route path="/chords" element={<Chords />} />
            <Route path="/chords/:songId" element={<SongDetail />} />
            <Route path="/scan-score" element={<ScanScore />} />
            <Route path="/beginner-chords" element={<BeginnerChords />} />
            <Route path="/translate" element={<Translate />} />
            <Route path="/tutorials" element={<Tutorials />} />
            <Route path="/offline" element={<Offline />} />
            <Route path="*" element={<Navigate to="/feed" replace />} />
          </Routes>
        </div>
      )}
    </Router>
  );
}
