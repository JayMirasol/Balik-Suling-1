// src/screens/songDetails.js
import React, { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import "./songDetail.css"; // ensure this path/name matches your project
import { saveOffline } from "../shared/offlineStore"; // optional, keep if available

/**
 * Song details page (robust to route param name).
 * Route can be either /chords/:slug  OR  /chords/:songId
 */

const SONGS = {
  "atin-cu-pung-singsing": {
    title: "Atin Cu Pung Singsing",
    songwriter: "Juan Crisostomo Soto",
    video: "https://www.youtube.com/embed/41C7yFwLGeo",
    lyrics: `
[Verse 1]
C       G       Am       F
Atin cu pung singsing
C       G       Am       F
Metung yang timpalan
C       G       Am       F
King indu cu'ng ibat king kapan
C       G       C
Ming ku ping pamagsadyan

[Chorus]
C       G       Am       F
Caliwan ku king iyong pamikakatawan
C       G       Am       F
Atin cu pung singsing, masalese
C       G       Am       F
Singsing a pilacud, alang kasing lagiu
C       G       C
Caliwan ku king iyong pamikakatawan
    `.trim(),
  },

  "kapampangan-ku": {
    title: "Kapampangan Ku",
    songwriter: "Juan D. Nepomuceno",
    video: "https://www.youtube.com/embed/iQwpE14XHBM",
    lyrics: `
[Verse 1]
G       C       G       D
Kapampangan ku, maragul a tau
G       C       G       D
Alang sukat keka
G       C       G       D
Metung yang kayang salita
G       C       G       D
Kasali ku king tungkuling dakal

[Chorus]
G       C       G       D
Kapampangan ku, e ku agaganaka
G       C       G       D
Matuang banwa
G       C       G       D
Mabalin yang sadiwa
G       C       G       D
Pamagmaragul keka
    `.trim(),
  },

  "masayang-kebaitan": {
    title: "Masayang Kebaitan",
    songwriter: "Benigno R. Natividad",
    video: "https://www.youtube.com/embed/g7doXhRymUY",
    lyrics: `
[Verse 1]
C       G       F       C
Masayang kebaitan, metung yang buhay
C       G       F       C
Atin yang kabuntalan king puso
C       G       F       C
Tunggal pasyalan, masalese
C       G       F       C
Masayang kebaitan, atin yang pamagaral

[Chorus]
C       G       F       C
Tulong tungkuling, keng masalese
C       G       F       C
Masayang kebaitan, king arapan
    `.trim(),
  },

  "o-caca": {
    title: "O Caca",
    songwriter: "Juan D. Nepomuceno",
    video: "https://www.youtube.com/embed/3BRDclX1hLE",
    lyrics: `
[Verse 1]
C       G       F       C
O caca, king bayung yaman
C       G       F       C
Megalang balas sa lalam ning lupa
C       G       F       C
Makakapamung masalese
C       G       F       C
Keng pamung siang paput dinatang

[Chorus]
C       G       F       C
O caca, pasibayu keng panaun
C       G       F       C
Pamagbalangyung katuliran
    `.trim(),
  },

  "tuknang": {
    title: "Tuknang",
    songwriter: "Emmanuel P. Hizon",
    video: "",
    lyrics: `
[Verse 1]
C       G       Am       F
Tuknang, manimbeng kanu
C       G       Am       F
Makabayu kayang titugot
C       G       Am       F
Atin yang dala ning paralan
C       G       C
Iti yang agpang king metung a bayung siko

[Chorus]
C       G       Am       F
Kakabaus, pasyalan
C       G       Am       F
Pamagpakaung keng salikut
    `.trim(),
  },

  "pu-pul": {
    title: "Pupul",
    songwriter: "Pedro A. Mabilangan",
    video: "",
    lyrics: `
[Verse 1]
C       G       Am       F
Pupul, pusu kong namut
C       G       Am       F
Ala yang sasabian keng siglong laging sayang
C       G       Am       F
Keng bisa, sabayang a pamung kamatayan
C       G       C
Kada kamatayan, akalasan ning kakaluguran

[Chorus]
C       G       Am       F
Atin pung kalumbuyan king dala na
C       G       Am       F
Pu-pul a kayang pampasigla
    `.trim(),
  },

  "abe-abe": {
    title: "Abe-Abe",
    songwriter: "Pedro B. Manlapig",
    video: "https://www.youtube.com/embed/vEBn9WzX4CE",
    lyrics: `
[Verse 1]
G       C       G       D
Abe-abe, makanyan ku't keka
G       C       G       D
Pamagbai, kabuntalan
G       C       G       D
Atin yang kasulatan ning ama
G       C       G       D
Salin edwan, pasyalan mu't kayan

[Chorus]
G       C       G       D
Abe-abe, kalub king aldong pamangaliwa
G       C       G       D
Abe-abe, katuliran ning kabuntalan
    `.trim(),
  },

  "dakal-salamat": {
    title: "Dakal Salamat",
    songwriter: "Jose P. David",
    video: "",
    lyrics: `
[Verse 1]
G       C       G       D
Dakal salamat, O Dios
G       C       G       D
King pamikakaluguran
G       C       G       D
Keng kayang palinisan
G       C       G       D
Pamanimuna ning kayang luwal

[Chorus]
G       C       G       D
Dakal salamat, O Dios
G       C       G       D
Keng pamikakaluguran
G       C       G       D
Pamanimuna ning kayang luwal
    `.trim(),
  },
};

export default function SongDetail() {
  // Accept either param name to be robust with different router setups
  const params = useParams();
  const key = params.slug || params.songId || params.id || params.name;

  // Look up by key
  const song = key ? SONGS[key] : null;

  // Debug help if user lands on not-found
  if (!song) {
    console.warn("SongDetail: missing song for key:", key, "available keys:", Object.keys(SONGS).slice(0,20));
  }

  const contentText = useMemo(() => {
    if (!song) return "";
    return `${song.title}\nSongwriter: ${song.songwriter}\n\n${song.lyrics}`;
  }, [song]);

  const handlePrint = () => {
    if (!song) return;
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      window.print();
      return;
    }
    const html = `
      <html>
        <head>
          <title>Print — ${escapeHtml(song.title)}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial; padding: 24px; color: #111; }
            pre { white-space: pre-wrap; font-family: monospace; font-size: 15px; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(song.title)}</h1>
          <div><strong>Songwriter:</strong> ${escapeHtml(song.songwriter)}</div>
          <pre>${escapeHtml(song.lyrics)}</pre>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleSaveOffline = async () => {
    if (!song) return;
    try {
      if (typeof saveOffline === "function") {
        await saveOffline({
          id: `song-${key}`,
          type: "song",
          data: song,
        });
        alert("Saved for offline use.");
        return;
      }
    } catch (e) {
      console.error("saveOffline failed", e);
    }
    const blob = new Blob([contentText], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${key || "song"}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };

  if (!song) {
    return (
      <div className="screen-container">
        <h2>Song not found</h2>
        <p>We couldn't find that song. <Link to="/chords">Go back to the song list</Link>.</p>
      </div>
    );
  }

  return (
    <div className="screen-container" style={{ paddingBottom: 48 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>{song.title}</h1>
          <div style={{ marginTop: 6, color: "#999" }}>Songwriter: {song.songwriter}</div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handlePrint} style={buttonPrimary}>Print</button>
          <button onClick={handleSaveOffline} style={buttonGhost}>Save Offline</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Left: lyrics/chords */}
        <div style={{ flex: "1 1 520px", minWidth: 320 }}>
          <div style={{ padding: 12, borderRadius: 8, border: "1px solid #eee", background: "#000", color: "#fff" }}>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 15 }}>
              {song.lyrics}
            </pre>
          </div>
        </div>

        {/* Right: Video tutorial */}
        <div style={{ width: 570, minWidth: 300 }}>
          <div style={{ padding: 12, borderRadius: 8, border: "1px solid #eee", background: "#000" }}>
            <h4 style={{ marginTop: 0, marginBottom: 8 }}>Video Tutorial</h4>
            {song.video ? (
              <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                <iframe
                  src={song.video}
                  title={`${song.title} tutorial`}
                  style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", border: 0 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div style={{ color: "#666" }}>No video tutorial available for this song.</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <Link to="http://localhost:3000/chordtutor" style={{ color: "#0a58ca" }}>← Back to Kapampangan Chords</Link>
      </div>
    </div>
  );
}

// small helpers
const buttonPrimary = {
  padding: "8px 12px",
  background: "#2a6",
  color: "#fff",
  border: "1px solid #2a6",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 700,
};

const buttonGhost = {
  padding: "8px 12px",
  background: "#fff",
  color: "#111",
  border: "1px solid #ddd",
  borderRadius: 8,
  cursor: "pointer",
};

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
