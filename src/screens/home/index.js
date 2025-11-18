import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Sidebar from "../../components/sidebar";
import { setClientToken, SPOTIFY_REDIRECT_URI } from "../../spotify";
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
import Feedback from "../feedback";
import Profile from "../profile";
import AdminPanel from "../admin";
import "./home.css";
import { PlayerProvider } from "../../components/footerPlayer/PlayerContext";
import { usePlayer } from "../../components/footerPlayer/PlayerContext";
import FooterPlayer from "../../components/footerPlayer/FooterPlayer";

export default function Home() {
  const [token, setToken] = useState("");
  const [initializing, setInitializing] = useState(true); // <- NEW

  useEffect(() => {
    const existing = window.localStorage.getItem("token");
    const hash = window.location.hash; // e.g. #access_token=... (old implicit flow)

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
    } else if (!existing) {
      // New PKCE flow: look for ?code= in the URL
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      const error = searchParams.get("error");

      if (error) {
        // If Spotify sent an error, just clear URL and stay on login
        window.history.replaceState(null, "", window.location.pathname);
        setInitializing(false);
        return;
      }

      if (code) {
        const verifier = sessionStorage.getItem("pkce_code_verifier");
        (async () => {
          try {
            // Use local backend in development, Netlify function in production
            const tokenEndpoint = process.env.NODE_ENV === 'production' 
              ? "/.netlify/functions/spotify-token"
              : `${process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8001'}/spotify-token`;
            
            const resp = await fetch(tokenEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code,
                code_verifier: verifier,
                redirect_uri: SPOTIFY_REDIRECT_URI || window.location.origin,
              }),
            });
            const data = await resp.json();
            if (data && data.access_token) {
              window.localStorage.setItem("token", data.access_token);
              setToken(data.access_token);
              setClientToken(data.access_token);
              try { sessionStorage.removeItem("pkce_code_verifier"); } catch {}
              // Strip ?code= from URL
              window.history.replaceState(null, "", window.location.pathname);
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error("Failed to exchange Spotify code:", e);
          } finally {
            setInitializing(false);
          }
        })();
        return; // wait until above finishes
      }

      setInitializing(false);
    } else if (existing) {
      setToken(existing);
      setClientToken(existing);
      setInitializing(false);
    }

    // setInitializing(false); // moved into branches above
  }, []);

  // Listen for explicit logout events to clear token immediately
  useEffect(() => {
    const onLoggedOut = () => {
      setToken("");
    };
    window.addEventListener("app:loggedOut", onLoggedOut);
    return () => window.removeEventListener("app:loggedOut", onLoggedOut);
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
        <PlayerProvider>
          <div className="main-body" style={{ paddingBottom: 72 }}>
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
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="*" element={<Navigate to="/feed" replace />} />
            </Routes>
          </div>
          <AutoHideFooterPlayer />
        </PlayerProvider>
      )}
    </Router>
  );
}

// A small helper component that hides the footer player on non-audio pages
function AutoHideFooterPlayer() {
  const location = useLocation();
  const { clearPlayer } = usePlayer();

  useEffect(() => {
    // List pages where the player should be hidden
    const hideOn = [
      "/chordtutor",
      "/chordscanner",
      "/scan-score",
      "/translate",
      "/beginner-chords",
      "/offline",
    ];
    const shouldHide = hideOn.some((p) => location.pathname.startsWith(p));
    if (shouldHide) {
      clearPlayer();
    }
  }, [location, clearPlayer]);

  return <FooterPlayer />;
}
