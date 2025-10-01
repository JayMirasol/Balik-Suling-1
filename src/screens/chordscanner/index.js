// src/screens/chordscanner/index.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./ChordScanner.css"; // keep your existing styles (also uses .screen-container)

export default function SongChordScanner() {
  // -------------------- Config --------------------
  // If REACT_APP_API_BASE is set (e.g., http://127.0.0.1:8001) we'll use it; otherwise CRA proxy.
  const base = process.env.REACT_APP_API_BASE || "";
  const buildUrl = (p) => (base ? `${base}${p}` : p);

  // -------------------- OMR (score -> chords) state --------------------
  const [selectedImageUrl, setSelectedImageUrl] = useState(null); // preview URL for image/PDF
  const [omrBusy, setOmrBusy] = useState(false);
  const [omrError, setOmrError] = useState("");
  const [omrDetails, setOmrDetails] = useState("");
  const [omrSummary, setOmrSummary] = useState(null); // { filename, bytes }
  const [omrChords, setOmrChords] = useState([]); // [{measure, chord, notes[]}]
  const [omrMusicXmlUrl, setOmrMusicXmlUrl] = useState("");

  // camera
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // -------------------- Audio (song -> lead-sheet) state --------------------
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [audioSummary, setAudioSummary] = useState(null); // { filename, bytes }
  const [audioFileUrl, setAudioFileUrl] = useState(null); // preview in <audio>
  const [audioChords, setAudioChords] = useState([]); // estimated chords from backend
  const [audioMusicXmlUrl, setAudioMusicXmlUrl] = useState("");

  // -------------------- Effects: camera boot & cleanup --------------------
  useEffect(() => {
    // Start camera when component mounts
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => {
        console.error("Error accessing webcam:", err);
      });
    // Cleanup on unmount
    return () => {
      if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
      if (audioFileUrl) URL.revokeObjectURL(audioFileUrl);
      const s = streamRef.current;
      if (s) {
        s.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------- Helpers --------------------
  const formatBytes = (b) =>
    typeof b === "number" ? (b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`) : "—";

  const isImage = (f) => !!f && f.type?.startsWith("image/");
  const isPdfName = (name) => /\.pdf$/i.test(name || "");
  const setPreviewForFile = (file) => {
    if (!file) {
      if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
      setSelectedImageUrl(null);
      return;
    }
    if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
    if (isImage(file) || isPdfName(file.name)) {
      const url = URL.createObjectURL(file);
      setSelectedImageUrl(url);
    } else {
      setSelectedImageUrl(null);
    }
  };

  const resetOmr = () => {
    setOmrBusy(false);
    setOmrError("");
    setOmrDetails("");
    setOmrSummary(null);
    setOmrChords([]);
    setOmrMusicXmlUrl("");
  };

  const resetAudio = () => {
    setAudioBusy(false);
    setAudioError("");
    setAudioSummary(null);
    setAudioChords([]);
    setAudioMusicXmlUrl("");
  };

  // -------------------- OMR (upload image/PDF) --------------------
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewForFile(file);
    await sendFileToOmr(file);
  };

  // -------------------- OMR (camera capture) --------------------
  const captureFromCamera = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      async (blob) => {
        if (blob) {
          // give the blob a filename so backend sees a useful extension
          const file = new File([blob], "camera_capture.png", { type: "image/png" });
          setPreviewForFile(file);
          await sendFileToOmr(file);
        }
      },
      "image/png",
      1.0
    );
  };

  // -------------------- OMR (send to backend) --------------------
  const sendFileToOmr = async (file) => {
    resetOmr();
    setOmrBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const OMR_ENDPOINT = "/omr/scan"; // alias to /omr/scan
      const { data } = await axios.post(buildUrl(OMR_ENDPOINT), form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 180_000,
      });

      if (!data?.ok) {
        setOmrError(data?.error || "Unknown error");
        if (data?.details) setOmrDetails(String(data.details));
      } else {
        setOmrSummary(data.summary || null);
        setOmrChords(Array.isArray(data.chords) ? data.chords : []);
        setOmrMusicXmlUrl(data.musicxmlUrl || "");
      }
    } catch (err) {
      const msg = err?.response
        ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
        : String(err);
      setOmrError(msg);
    } finally {
      setOmrBusy(false);
    }
  };

  // -------------------- Audio (upload audio -> lead sheet) --------------------
  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    resetAudio();
    if (audioFileUrl) URL.revokeObjectURL(audioFileUrl);
    setAudioFileUrl(URL.createObjectURL(file));

    setAudioBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const AUDIO_ENDPOINT = "/audio/score";
      const { data } = await axios.post(buildUrl(AUDIO_ENDPOINT), form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 180_000,
      });

      if (!data?.ok) {
        setAudioError(data?.error || "Unknown error");
      } else {
        setAudioSummary(data.summary || null);
        setAudioChords(Array.isArray(data.estimatedChords) ? data.estimatedChords : []);
        setAudioMusicXmlUrl(data.musicxmlUrl || "");
      }
    } catch (err) {
      const msg = err?.response
        ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
        : String(err);
      setAudioError(msg);
    } finally {
      setAudioBusy(false);
    }
  };

  // -------------------- API Ping --------------------
  const onPing = async () => {
    try {
      const { data } = await axios.get(buildUrl("/health"));
      alert(JSON.stringify(data));
    } catch (err) {
      alert(`Ping failed: ${String(err)}`);
    }
  };

  // -------------------- Derived: chord progression text --------------------
  const omrProgression = useMemo(() => {
    if (!omrChords.length) return "";
    return omrChords.map((m) => m.chord || "—").join(" | ");
  }, [omrChords]);

  // -------------------- UI --------------------
  return (
    <div className="screen-container scanner-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ margin: 0 }}>🎵 Chord Scanner</h1>
        <button type="button" onClick={onPing} style={btnGhost}>
          Test API
        </button>
      </div>

      {/* 1) Upload image/PDF */}
      <div style={{ marginTop: 12 }}>
        <h2 style={{ margin: "8px 0" }}>Upload a Score Sheet (PNG/JPG/TIFF/PDF)</h2>
        <input type="file" accept="image/*,.pdf" onChange={handleImageUpload} />
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
          Tip: Use a clean, printed page at ~300–400 dpi for best results.
        </div>
      </div>

      {/* Preview (image or PDF) */}
      {selectedImageUrl && (
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginTop: 12 }}>
          {/* Try to guess preview type by URL (we created from File so mimetype is correct) */}
          {selectedImageUrl.endsWith(".pdf") ? (
            <embed
              src={selectedImageUrl}
              type="application/pdf"
              style={{ width: 420, height: 560, border: "1px solid #ddd", borderRadius: 10 }}
            />
          ) : (
            <img
              src={selectedImageUrl}
              alt="Preview"
              style={{ maxWidth: "25%", borderRadius: 10, border: "1px solid #ddd" }}
            />
          )}
        </div>
      )}

      {/* 2) Camera scanner */}
      <div className="camera-section" style={{ marginTop: 20 }}>
        <h2 style={{ margin: "8px 0" }}>Or use Camera Scanner:</h2>
        <div className="camera-wrapper" style={{ position: "relative", display: "inline-block" }}>
          <video ref={videoRef} autoPlay playsInline muted width="300" height="200" />
          {/* optional overlay lines */}
          <div className="camera-overlay" />
          <div className="scan-line" />
        </div>
        <canvas ref={canvasRef} width="300" height="200" style={{ display: "none" }} />
        <div style={{ marginTop: 8 }}>
          <button onClick={captureFromCamera} style={btnPrimary} disabled={omrBusy}>
            📸 Capture & Scan
          </button>
        </div>
      </div>

      {/* OMR results */}
      <div style={{ marginTop: 16 }}>
        {omrBusy && <p>Scanning image, please wait…</p>}

        {omrError && (
          <div style={cardError}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Upload failed</div>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{omrError}</pre>
            {omrDetails && (
              <details style={{ marginTop: 8 }}>
                <summary>Details</summary>
                <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{omrDetails}</pre>
              </details>
            )}
          </div>
        )}

        {!omrBusy && !omrError && (omrSummary || omrChords.length || omrMusicXmlUrl) ? (
          <div style={cardOk}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Score → Guitar Chords</div>
            {omrSummary && (
              <>
                <div>
                  <strong>Score Sheet:</strong> {omrSummary.filename || "—"}
                </div>
                <div>
                  <strong>Size:</strong> {formatBytes(omrSummary.bytes)}
                </div>
              </>
            )}

            {omrMusicXmlUrl && (
              <div style={{ marginTop: 8 }}>
                <a href={buildUrl(omrMusicXmlUrl)} target="_blank" rel="noreferrer">
                  Download MusicXML
                </a>
              </div>
            )}

            {omrChords.length ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Converted Guitar Chords</div>
                {/* grid: 4 measures per row */}
                <ChordGrid measures={omrChords} />
                <div style={{ marginTop: 10 }}>
                  <div style={{ marginBottom: 4 }}>
                    <strong>Progression:</strong>
                  </div>
                  <div style={progressionBox}>{omrProgression}</div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                No chords detected. Try a printed page at ~300–400 dpi (no handwriting).
              </div>
            )}
          </div>
        ) : null}
      </div>

      <hr style={{ margin: "30px 0", borderTop: "2px dashed #aaa" }} />

      {/* Audio -> Music Sheet */}
      <div className="audio-converter">
        <h2 style={{ margin: "8px 0" }}>🎧 Audio/Song to Music Sheet Converter:</h2>
        <input type="file" accept="audio/*" onChange={handleAudioUpload} />
        {audioFileUrl && (
          <audio controls src={audioFileUrl} style={{ marginTop: 10, display: "block" }} />
        )}

        {audioBusy && <p>Analyzing audio, please wait…</p>}

        {audioError && (
          <div style={cardError}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Audio conversion failed</div>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{audioError}</pre>
          </div>
        )}

        {!audioBusy && !audioError && (audioSummary || audioChords.length || audioMusicXmlUrl) ? (
          <div style={cardOk}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Estimated Lead Sheet</div>
            {audioSummary && (
              <>
                <div>
                  <strong>Audio:</strong> {audioSummary.filename || "—"}
                </div>
                <div>
                  <strong>Size:</strong> {formatBytes(audioSummary.bytes)}
                </div>
              </>
            )}

            {audioChords.length ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Estimated Chords</div>
                <div style={progressionBox}>{audioChords.join(" | ")}</div>
              </div>
            ) : null}

            {audioMusicXmlUrl && (
              <div style={{ marginTop: 10 }}>
                <a href={buildUrl(audioMusicXmlUrl)} target="_blank" rel="noreferrer">
                  Download MusicXML
                </a>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** -------------------- small presentational bits -------------------- **/

function ChordGrid({ measures }) {
  // break into rows of 4 measures
  const rows = [];
  for (let i = 0; i < measures.length; i += 4) rows.push(measures.slice(i, i + 4));

  return (
    <div>
      {rows.map((row, i) => (
        <div key={i} style={gridRow}>
          {row.map((m) => (
            <div key={m.measure} style={cell}>
              <div>
                <span style={{ opacity: 0.7 }}>
                  m{String(m.measure).padStart(2, "0")}:
                </span>{" "}
                <strong>{m.chord || "—"}</strong>
              </div>
              {Array.isArray(m.notes) && m.notes.length > 0 && (
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  notes: [{m.notes.join(", ")}]
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** -------------------- inline styles -------------------- **/
const btnPrimary = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #2a6",
  background: "#2a6",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const btnGhost = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px dashed #bbb",
  background: "#fafafa",
  cursor: "pointer",
  fontWeight: 600,
};

const cardOk = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: "#eefaf0",
  border: "1px solid #bfe5c8",
  color: "#000000",
};

const cardError = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: "#000000",
  border: "1px solid #ffc9c9",
  whiteSpace: "pre-wrap",
};

const gridRow = {
  display: "flex",
  gap: 8,
  marginBottom: 8,
  flexWrap: "wrap",
};

const cell = {
  flex: "1 1 180px",
  minWidth: 140,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  lineHeight: 1.6,
};

const progressionBox = {
  border: "1px dashed #aaa",
  borderRadius: 8,
  padding: 10,
  background: "#fff",
  overflowX: "auto",
  whiteSpace: "nowrap",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};
