// src/screens/scanScore/index.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";

export default function ScanScore() {
  const [file, setFile] = useState(null);
  const [objectUrl, setObjectUrl] = useState(null); // for image/pdf preview
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // If REACT_APP_API_BASE is set (e.g., http://127.0.0.1:8001) we'll use it; otherwise CRA proxy.
  const base = process.env.REACT_APP_API_BASE || "";

  // Clean up object URL when file changes/unmounts
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  // Helpers -------------------------------------------------------------------
  const formatBytes = (b) =>
    typeof b === "number" ? (b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`) : "—";

  const isImage = (f) => !!f && f.type?.startsWith("image/");
  const isPdf = (f) => !!f && (f.type === "application/pdf" || /\.pdf$/i.test(f.name || ""));
  const ext = (f) => (f?.name || "").split(".").pop()?.toLowerCase() || "";

  const buildUrl = (p) => (base ? `${base}${p}` : p);

  const reset = () => {
    setFile(null);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
    setResult(null);
    setBusy(false);
  };

  const setChosenFile = (f) => {
    if (!f) {
      reset();
      return;
    }
    setFile(f);
    setResult(null);
    if (objectUrl) URL.revokeObjectURL(objectUrl);

    // Preview images and PDFs
    if (isImage(f) || isPdf(f)) {
      const url = URL.createObjectURL(f);
      setObjectUrl(url);
    } else {
      setObjectUrl(null);
    }
  };

  const onFileChange = (e) => setChosenFile(e.target.files?.[0] || null);

  // Drag & drop
  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) setChosenFile(f);
  };

  // Network -------------------------------------------------------------------
  const onUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const url = buildUrl("/omr/scan");
      const { data } = await axios.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 180_000, // allow time for OMR
      });
      setResult(data);
    } catch (err) {
      console.error("UPLOAD ERROR", {
        message: err?.message,
        code: err?.code,
        status: err?.response?.status,
        url: err?.config?.url,
      });
      setResult({
        ok: false,
        error: err?.response
          ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
          : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  const onPing = async () => {
    try {
      const { data } = await axios.get(buildUrl("/health"));
      alert(JSON.stringify(data));
    } catch (err) {
      alert(`Ping failed: ${String(err)}`);
    }
  };

  // Chords utilities ----------------------------------------------------------
  const chords = Array.isArray(result?.chords) ? result.chords : [];

  const progression = useMemo(() => {
    if (!result?.ok || !chords.length) return "";
    return chords.map((m) => m.chord || "—").join(" | ");
  }, [result, chords]);

  const copyText = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied!");
    } catch {
      alert("Copy failed — select and copy manually.");
    }
  }, []);

  const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const chordGrid = chunk(chords, 4); // 4 measures per row

  // Styles (inline) -----------------------------------------------------------
  const styles = {
    page: {
      maxWidth: 960,
      margin: "24px auto 64px",
      padding: 16,
      fontFamily:
        "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      color: "#111",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    title: { fontSize: 24, fontWeight: 700, margin: 0, marginRight: 320 },
    subtitle: { fontSize: 14, opacity: 0.7, marginTop: 4, color: "#ffffff"},
    row: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
    button: {
      padding: "10px 14px",
      borderRadius: 8,
      border: "1px solid #ccc",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 600,
    },
    buttonPrimary: {
      padding: "10px 14px",
      borderRadius: 8,
      border: "1px solid #2a6",
      background: "#2a6",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700,
    },
    buttonGhost: {
      padding: "8px 10px",
      borderRadius: 8,
      border: "1px dashed #bbb",
      background: "#fafafa",
      cursor: "pointer",
      fontWeight: 600,
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: "not-allowed",
    },
    hint: { fontSize: 12, opacity: 0.75 },
    dropzone: {
      marginTop: 12,
      padding: 24,
      borderRadius: 12,
      border: dragOver ? "2px solid #2a6" : "2px dashed #bbb",
      background: dragOver ? "#f2fff7" : "#fafafa",
      textAlign: "center",
    },
    fileInfo: {
      marginTop: 8,
      padding: 12,
      borderRadius: 10,
      background: "#f6f6f6",
      border: "1px solid #e7e7e7",
      fontSize: 14,
    },
    previewWrap: {
      marginTop: 12,
      display: "flex",
      gap: 16,
      alignItems: "flex-start",
      flexWrap: "wrap",
    },
    previewImg: {
      maxWidth: "45%",
      borderRadius: 10,
      border: "1px solid #ddd",
      display: "block",
    },
    previewPdf: {
      width: 420,
      height: 560,
      border: "1px solid #ddd",
      borderRadius: 10,
    },
    resultCard: (ok) => ({
      marginTop: 16,
      padding: 16,
      borderRadius: 12,
      background: ok ? "#eefaf0" : "#ffefef",
      border: `1px solid ${ok ? "#bfe5c8" : "#ffc9c9"}`,
    }),
    label: { fontWeight: 700, color: "#2a6"},
    labelSuccess: { fontWeight: 700, color: "#2a6"},
    labelFailed: { fontWeight: 700, color: "rgba(113, 5, 5, 1)"},
    link: { color: "#0a58ca", textDecoration: "none" },
    chordsHeader: { marginTop: 14, marginBottom: 6, fontSize: 18, fontWeight: 700 },
    chordsGridRow: {
      display: "flex",
      gap: 8,
      marginBottom: 8,
      flexWrap: "wrap",
    },
    chordCell: {
      flex: "1 1 180px",
      minWidth: 140,
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid #ddd",
      background: "#fff",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      lineHeight: 1.6,
    },
    progressionBox: {
      border: "1px dashed #aaa",
      borderRadius: 8,
      padding: 10,
      background: "#fff",
      overflowX: "auto",
      whiteSpace: "nowrap",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    },
    details: {
      marginTop: 10,
      padding: 10,
      borderRadius: 10,
      background: "#fff",
      border: "1px solid #eee",
      fontSize: 13,
      color: "#333",
    },
    tipBox: {
      marginTop: 10,
      padding: 12,
      borderRadius: 10,
      background: "#f9fbff",
      border: "1px solid #dbe7ff",
      fontSize: 13,
    },
  };

  return (
    <div className="screen-container">
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Scan Score → Guitar Chords</h2>
          <div style={styles.subtitle}>
            Upload a printed score (PNG/JPG/TIFF/PDF). We’ll run OMR and display measure-by-measure chords.
          </div>
        </div>
        <div style={styles.row}>
          <button type="button" style={styles.buttonGhost} onClick={onPing}>
            Test API
          </button>
          <button
            type="button"
            style={{ ...styles.buttonGhost }}
            onClick={reset}
            disabled={busy}
          >
            Clear
          </button>
        </div>
      </div>

      {/* File input + dropzone */}
      <form onSubmit={onUpload}>
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          style={styles.dropzone}
          aria-label="Drop a score file here"
        >
          <div style={{ marginBottom: 8 }}>
            <strong>Drop a score file here</strong> — or choose a file:
          </div>
          <input
            type="file"
            accept="image/*,.pdf,.omr"
            onChange={onFileChange}
            style={{ display: "inline-block" }}
          />
          <div style={{ marginTop: 8, ...styles.hint }}>
            Tip: Use a clean, printed page at ~300–400 dpi for best results.
          </div>
        </div>

        {file && (
          <div style={styles.fileInfo}>
            <div>
              <span style={styles.label}>Selected:</span> {file.name} ({formatBytes(file.size)})
            </div>
            <div>
              <span style={styles.label}>Type:</span> {file.type || `.${ext(file)}`}
            </div>
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <button
            type="submit"
            disabled={!file || busy}
            style={{ ...styles.buttonPrimary, ...(busy || !file ? styles.buttonDisabled : {}) }}
          >
            {busy ? "Scanning…" : "Scan"}
          </button>
        </div>
      </form>

      {/* Preview (image or PDF) */}
      {objectUrl && (
        <div style={styles.previewWrap}>
          {isImage(file) ? (
            <img src={objectUrl} alt="Preview" style={styles.previewImg} />
          ) : isPdf(file) ? (
            <embed src={objectUrl} type="application/pdf" style={styles.previewPdf} />
          ) : null}
          <div style={styles.tipBox}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Instructions before you scan:</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Printed pages (not handwriting)</li>
              <li>Straight, high-contrast, ~300–400 dpi</li>
              <li>Full systems visible (not single-staff snippets)</li>
            </ul>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={styles.resultCard(!!result.ok)}>
          {result.ok ? (
            <>
              <div style={{ marginBottom: 6 }}>
                <span style={styles.labelSuccess}>Upload Successfully Converted !</span>
              </div>

              <div>
                <span style={styles.label}>Score Sheet:</span>{" "}
                <strong>{result.summary?.filename ?? "—"}</strong>
              </div>
              <div>
                <span style={styles.label}>Size:</span> {formatBytes(result.summary?.bytes)}
              </div>

              {/* MusicXML link */}
              {result.musicxmlUrl && (
                <div style={{ marginTop: 8 }}>
                  <a
                    href={buildUrl(result.musicxmlUrl)}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.link}
                  >
                    Download MusicXML
                  </a>
                </div>
              )}

              {/* Chords */}
              {chords.length ? (
                <>
                  <div style={styles.chordsHeader}>Converted Guitar Chords</div>

                  {/* Grid view (4 measures per row) */}
                  <div>
                    {chordGrid.map((row, i) => (
                      <div key={i} style={styles.chordsGridRow}>
                        {row.map((m) => (
                          <div key={m.measure} style={styles.chordCell}>
                            <div>
                              <span style={{ opacity: 0.7 }}>m{String(m.measure).padStart(2, "0")}:</span>{" "}
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

                  {/* Compact progression line + copy */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ marginBottom: 4 }}><span style={styles.label}>Progression:</span></div>
                    <div style={styles.progressionBox}>{progression || "—"}</div>
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        style={styles.button}
                        onClick={() => progression && copyText(progression)}
                        disabled={!progression}
                      >
                        Copy progression
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ marginTop: 10 }}>
                  No chords detected. Try a printed page at ~300–400 dpi (no handwriting).
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ marginBottom: 6 }}>
                <span style={styles.labelFailed}>Upload failed !</span>
              </div>
              <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{String(result.error)}</pre>

              {/* Optional details from backend (Audiveris logs) */}
              {result.details && (
                <div style={styles.details}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Details</div>
                  <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{String(result.details)}</pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  </div>
  );
}
