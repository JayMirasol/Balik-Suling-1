// src/screens/songDetails.js
import React, { useMemo, useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import "./songDetail.css"; // ensure this path/name matches your project
import { saveOffline, getOffline } from "../shared/offlineStore";
import { FaCloudDownloadAlt, FaCheckCircle } from "react-icons/fa";

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
[bersu 1]
C       G       Am       F
Atin cu pung singsing
C       G       Am       F
Metung yang timpalan
C       G       Am       F
King indu cu'ng ibat king kapan
C       G       C
Ming ku ping pamagsadyan

[Koro]
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
[bersu 1]
G       C       G       D
Kapampangan ku, maragul a tau
G       C       G       D
Alang sukat keka
G       C       G       D
Metung yang kayang salita
G       C       G       D
Kasali ku king tungkuling dakal

[Koro]
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
[bersu 1]
C       G       F       C
Masayang kebaitan, metung yang buhay
C       G       F       C
Atin yang kabuntalan king puso
C       G       F       C
Tunggal pasyalan, masalese
C       G       F       C
Masayang kebaitan, atin yang pamagaral

[Koro]
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
[bersu 1]
C       G       F       C
O caca, king bayung yaman
C       G       F       C
Megalang balas sa lalam ning lupa
C       G       F       C
Makakapamung masalese
C       G       F       C
Keng pamung siang paput dinatang

[Koro]
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
[bersu 1]
C       G       Am       F
Tuknang, manimbeng kanu
C       G       Am       F
Makabayu kayang titugot
C       G       Am       F
Atin yang dala ning paralan
C       G       C
Iti yang agpang king metung a bayung siko

[Koro]
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
[bersu 1]
C       G       Am       F
Pupul, pusu kong namut
C       G       Am       F
Ala yang sasabian keng siglong laging sayang
C       G       Am       F
Keng bisa, sabayang a pamung kamatayan
C       G       C
Kada kamatayan, akalasan ning kakaluguran

[Koro]
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
[bersu 1]
G       C       G       D
Abe-abe, makanyan ku't keka
G       C       G       D
Pamagbai, kabuntalan
G       C       G       D
Atin yang kasulatan ning ama
G       C       G       D
Salin edwan, pasyalan mu't kayan

[Koro]
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
[bersu 1]
G       C       G       D
Dakal salamat, O Dios
G       C       G       D
King pamikakaluguran
G       C       G       D
Keng kayang palinisan
G       C       G       D
Pamanimuna ning kayang luwal

[Koro]
G       C       G       D
Dakal salamat, O Dios
G       C       G       D
Keng pamikakaluguran
G       C       G       D
Pamanimuna ning kayang luwal
    `.trim(),
  },
};

// Translations for selected songs, EN & TL
const TRANSLATIONS = {
  "atin-cu-pung-singsing": {
    tl: `
[Taludtod 1]
C       G       Am       F
May singsing ako
C       G       Am       F
Ito ay isang papel
C       G       Am       F
Sa aking ina mula sa kapitan
C       G       C
Maghahanda na ako

[Koro]
C       G       Am       F
Nasa katawan ko ako
C       G       Am       F
Mayroon akong singsing, maayos
C       G       Am       F
Kantahin ang isang sigcud, walang pangalan
C       G       C
Nasa katawan ko ako
    `.trim(),
    en: `
[Verse 1]
C       G       Am       F
I have a ring
C       G       Am       F
It is a role
C       G       Am       F
To my mother from the captain
C       G       C
I'm going to prepare

[Chorus]
C       G       Am       F
I'm in my body
C       G       Am       F
I have a ring, well
C       G       Am       F
Sing a sigcud, no name
C       G       C
I'm in my body
    `.trim(),
  },
  "kapampangan-ku": {
    tl: `
[Taludtod 1]
C       G       Am       F
Ako ay isang Kapampangan, isang mahusay na tao
C       G       Am       F
Karapat -dapat ka
C       G       Am       F
Isa sa kanyang mga salita
C       G       C
Marami akong bibilhin

[Koro]
C       G       Am       F
Kapampangan ako, hindi ko naaalala
C       G       Am       F
Mga lumang taon na ang nakalilipas
C       G       Am       F
Master
C       G       C
Pag -aalaga sa iyo
    `.trim(),
    en: `
[Verse 1]
C       G       Am       F
I am a Kapampangan, a great man
C       G       Am       F
You deserve
C       G       Am       F
One of his words
C       G       C
I'm going to buy a lot

[Chorus]
C       G       Am       F
I'm Kapampangan, I don't remember
C       G       Am       F
Old years ago
C       G       Am       F
Master
C       G       C
Care for you
    `.trim(),
  },
  "masayang-kebaitan": {
    tl: `
[Taludtod 1]
C       G       F       C
Maligayang kabaitan, isang buhay
C       G       F       C
May patutunguhan ng puso
C       G       F       C
Sa paligid ng pagbisita, maingat
C       G       F       C
Maligayang kaarawan, mayroong isang pag -aaral

[Koro]
C       G       F       C
Ang pagiging kapaki -pakinabang, para sa maayos
C       G       F       C
Maligayang kabaitan, sa harap
    `.trim(),
    en: `
[Verse 1]
C       G       F       C
Happy kindness, a life
C       G       F       C
There is a destination of heart
C       G       F       C
Around visit, carefully
C       G       F       C
Happy birthday, there is a study

[Chorus]
C       G       F       C
Helpfulness, for well
C       G       F       C
Happy kindness, in front
    `.trim(),
  },

  "dakal-salamat": {
    tl: `
[Taludtod 1]
G       C       G       D
Salamat, O Diyos
G       C       G       D
sa pagkakaibigan
G       C       G       D
sa paglilinis nito
G       C       G       D
Pamumuno sa kanya sa labas

[Koro]
G       C       G       D
Salamat, O Diyos
G       C       G       D
sa pagkakaibigan
G       C       G       D
Pamumuno sa kanya sa labas
    `.trim(),
    en: `
[Verse 1]
G       C       G       D
Thank you, O God
G       C       G       D
in friendship
G       C       G       D
in its cleaning
G       C       G       D
Leadership of his outside

[Chorus]
G       C       G       D
Thank you, O God
G       C       G       D
in friendship
G       C       G       D
Leadership of his outside
    `.trim(),
  },

  "o-caca": {
    tl: `
[Taludtod 1]
G       C       G       D
O Caca, sa isang bagong nilalaman
G       C       G       D
Ito ay iginagalang na buhangin sa ilalim ng mukha
G       C       G       D
umaangkop
G       C       G       D
Noong nakaraan, dumating ang niyebe

[Koro]
G       C       G       D
O Caca, muli sa oras
G       C       G       D
paglilingkod
    `.trim(),
    en: `
[Verse 1]
G       C       G       D
O caca, in a new contentd
G       C       G       D
It was revered sand under the face
G       C       G       D
fitting
G       C       G       D
In the past, the snow came

[Chorus]
G       C       G       D
Or caca, again in time
G       C       G       D
ministration
    `.trim(),
  },

  "tuknang": {
    tl: `
[Taludtod 1]
C       G       Am       F
Huminto, kaya
C       G       Am       F
makabagong
C       G       Am       F
May sanhi ng diskarte
C       G       Am       F
Ito ay ayon sa isang bagong siko

[Koro]
C       G       Am       F
Pagbigkas
C       G       Am       F
Tiwala sa sarili
    `.trim(),
    en: `
[Verse 1]
C       G       Am       F
Stop, so
C       G       Am       F
innovative
C       G       Am       F
There is a cause of the approach
C       G       Am       F
This is according to a new elbow

[Chorus]
C       G       Am       F
pronunciation
C       G       Am       F
Self-real
    `.trim(),
  },

  "pu-pul": {
    tl: `
[Taludtod 1]
C       G       Am       F
Magtipon, puso ko
C       G       Am       F
Walang sasabihin tungkol sa buntong -hininga palagi
C       G       Am       F
Sa kaso, ang unang kamatayan
C       G       Am       F
Mahal na Kamatayan, maaaring pigilan ng kaibigan

[Koro]
C       G       Am       F
Marami sa pagdadala
C       G       Am       F
Mga tambak na inalipin
    `.trim(),
    en: `
[Verse 1]
C       G       Am       F
gather, my heart
C       G       Am       F
There is nothing to say about the sigh always
C       G       Am       F
In the case, the first death
C       G       Am       F
Dear death, the friend can resist

[Chorus]
C       G       Am       F
There is a lot in the bring
C       G       Am       F
Heaps of being enslaved
    `.trim(),
  },

  "abe-abe": {
    tl: `
[Taludtod 1]
G       C       G       D
Sama -sama, gusto ko iyon sa iyo
G       C       G       D
pagpapatupad
G       C       G       D
Mayroong pagsulat ng bahay
G       C       G       D
Ocline Edwan, bisitahin ka at ito ay mabuti

[Koro]
G       C       G       D
Magkasama, sa loob ng araw ng pagkakaiba -iba
G       C       G       D
Magkasama, sa loob ng araw ng pagkakaiba -iba
    `.trim(),
    en: `
[Verse 1]
G       C       G       D
Together, I’m like that to you
G       C       G       D
execution
G       C       G       D
There is a writing of the home
G       C       G       D
Ocline edwan, visit you and it is good

[Chorus]
G       C       G       D
Together, within the day of variation
G       C       G       D
Together, the right of the party
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

  // Translate state and derived lyrics
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [selectedLang, setSelectedLang] = useState("original"); // original | tl | en

  // Offline saved state & feedback (toast)
  const [isSaved, setIsSaved] = useState(false);
  const [saveNote, setSaveNote] = useState("");
  const [saveType, setSaveType] = useState("success"); // success | info | error

  const offlineId = song?.slug || song?.title;

  useEffect(() => {
    let cancelled = false;
    async function checkSaved() {
      if (!offlineId) return;
      try {
        const existing = await getOffline(offlineId);
        if (!cancelled) setIsSaved(!!existing);
      } catch (e) {
        // ignore
      }
    }
    checkSaved();
    return () => {
      cancelled = true;
    };
  }, [offlineId]);

  const displayedLyrics = useMemo(() => {
    if (!song) return "";
    if (selectedLang === "original") return song.lyrics;
    const t = TRANSLATIONS[key]?.[selectedLang];
    return t || song.lyrics; // fallback until other translations are added
  }, [song, key, selectedLang]);

  const contentText = useMemo(() => {
    if (!song) return "";
    return `${song.title}\nSongwriter: ${song.songwriter}\n\n${displayedLyrics}`;
  }, [song, displayedLyrics]);

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
            :root { --ink: #111; }
            html, body { height: 100%; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial; padding: 24px; color: var(--ink); position: relative; }
            .content { position: relative; z-index: 1; }
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              opacity: 0.07; /* subtle in print */
              width: 70vw;
              max-width: 700px;
              z-index: 0;
              pointer-events: none;
            }
            .header { margin-bottom: 8px; }
            h1 { margin: 0 0 6px; font-size: 22px; }
            .meta { margin: 0 0 12px; color: #555; font-size: 13px; }
            pre { white-space: pre-wrap; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 14px; line-height: 1.35; }
            @media print {
              body { margin: 12mm; padding: 0; }
              @page { margin: 12mm; }
              .watermark { opacity: 0.07; }
            }
          </style>
        </head>
        <body>
          <!-- Watermark image anchored to page center; repeats on each printed page in most browsers -->
          <img class="watermark" src="/bs-logo.png" alt="Balik Suling logo watermark" />

          <div class="content">
            <div class="header">
              <h1>${escapeHtml(song.title)}</h1>
              <div class="meta"><strong>Songwriter:</strong> ${escapeHtml(song.songwriter)}</div>
            </div>
            <pre>${escapeHtml(displayedLyrics)}</pre>
          </div>
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
      if (isSaved) {
        setSaveType("info");
        setSaveNote("Already saved to Offline.");
        setTimeout(() => setSaveNote(""), 2500);
        return;
      }
      await saveOffline({
        id: offlineId,
        title: song.title,
        artist: song.songwriter || "Unknown Artist",
        chords: song.lyrics, // store original lyrics; can switch to displayedLyrics if desired
        video: song.video || "",
      });
      setIsSaved(true);
      setSaveType("success");
      setSaveNote("Saved to Offline.");
      setTimeout(() => setSaveNote(""), 3000);
    } catch (error) {
      console.error("Failed to save song offline:", error);
      setSaveType("error");
      setSaveNote("Failed to save offline. Please try again.");
      setTimeout(() => setSaveNote(""), 3500);
    }
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
          <button
            onClick={handleSaveOffline}
            style={isSaved ? buttonSaved : buttonGhost}
            aria-pressed={isSaved}
            title={isSaved ? "Already saved to Offline" : "Save for offline access"}
          >
            {isSaved ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FaCheckCircle /> Saved Offline
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FaCloudDownloadAlt /> Save Offline
              </span>
            )}
          </button>
          {/* Translate menu */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowLangMenu((s) => !s)} style={buttonGhost}>Translate Lyrics</button>
            {showLangMenu && (
              <div style={{ position: "absolute", top: "100%", right: 0, background: "#fff", color: "#000", border: "1px solid #ddd", borderRadius: 8, padding: 8, zIndex: 10, minWidth: 180 }}>
                <div
                  style={{
                    padding: "6px 8px",
                    cursor: "pointer",
                    border: selectedLang === "original" ? "1px solid #2a6" : "1px solid transparent",
                    borderRadius: 6,
                  }}
                  onClick={() => { setSelectedLang("original"); setShowLangMenu(false); }}
                >
                  Original (Kapampangan)
                </div>
                <div
                  style={{
                    padding: "6px 8px",
                    cursor: "pointer",
                    opacity: TRANSLATIONS[key]?.tl ? 1 : 0.6,
                    border: selectedLang === "tl" ? "1px solid #2a6" : "1px solid transparent",
                    borderRadius: 6,
                    marginTop: 6,
                  }}
                  onClick={() => { setSelectedLang("tl"); setShowLangMenu(false); }}
                >
                  Tagalog
                </div>
                <div
                  style={{
                    padding: "6px 8px",
                    cursor: "pointer",
                    opacity: TRANSLATIONS[key]?.en ? 1 : 0.6,
                    border: selectedLang === "en" ? "1px solid #2a6" : "1px solid transparent",
                    borderRadius: 6,
                    marginTop: 6,
                  }}
                  onClick={() => { setSelectedLang("en"); setShowLangMenu(false); }}
                >
                  English
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {saveNote && (
        <div
          aria-live="polite"
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            background:
              saveType === "success" ? "#2a6" : saveType === "info" ? "#0a58ca" : "#cc0000",
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
          <span>{saveNote}</span>
          <button
            onClick={() => setSaveNote("")}
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

      <div style={{ display: "flex", gap: 24, marginTop: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Left: lyrics/chords */}
        <div style={{ flex: "1 1 520px", minWidth: 320 }}>
          <div style={{ padding: 12, borderRadius: 8, border: "1px solid #eee", background: "#000", color: "#fff" }}>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 15 }}>
              {displayedLyrics}
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
  border: "1px solid #fff",
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

const buttonSaved = {
  padding: "8px 12px",
  background: "#e9f7ef",
  color: "#1f5133",
  border: "1px solid #2a6",
  borderRadius: 8,
  cursor: "default",
  fontWeight: 700,
};

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
