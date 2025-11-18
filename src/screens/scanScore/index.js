// src/screens/scanScore/index.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
// Use ESM build to avoid CJS subpath resolution issues in some bundlers
import { PDFDocument, StandardFonts, rgb } from "pdf-lib/dist/pdf-lib.esm.js";

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
      
      // Track successful chord scan
      if (data && data.ok) {
        const scannedCount = Number(localStorage.getItem("chordsScannedCount") || 0);
        localStorage.setItem("chordsScannedCount", String(scannedCount + 1));
        window.dispatchEvent(new Event("statsUpdated"));
      }
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

  // removed unused onPing helper

  // PDF export ---------------------------------------------------------------
  // defined later after chords/progression declarations

  // Chords utilities ----------------------------------------------------------
  const chords = useMemo(() => (
    Array.isArray(result?.chords) ? result.chords : []
  ), [result?.chords]);

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

  // PDF export ---------------------------------------------------------------
  const onDownloadPdf = useCallback(async () => {
    try {
      if (!result?.ok) {
        alert("No successful scan to export.");
        return;
      }

      const pdfDoc = await PDFDocument.create();

      // 1) Include the original score sheet
      if (file) {
        if (isPdf(file)) {
          const srcBytes = await file.arrayBuffer();
          const srcDoc = await PDFDocument.load(srcBytes);
          const pageIndices = srcDoc.getPageIndices();
          const copiedPages = await pdfDoc.copyPages(srcDoc, pageIndices);
          copiedPages.forEach((p) => pdfDoc.addPage(p));
        } else if (isImage(file)) {
          const imgBytes = await file.arrayBuffer();
          const page = pdfDoc.addPage([595, 842]); // A4 portrait in points
          const margin = 36;
          const maxW = 595 - margin * 2;
          const maxH = 842 - margin * 2;
          let embedded;
          const lower = (file.type || "").toLowerCase();
          if (lower.includes("png")) embedded = await pdfDoc.embedPng(imgBytes);
          else embedded = await pdfDoc.embedJpg(imgBytes);
          const { width: iw, height: ih } = embedded.size();
          const scale = Math.min(maxW / iw, maxH / ih);
          const w = iw * scale;
          const h = ih * scale;
          const x = (595 - w) / 2;
          const y = (842 - h) / 2;
          page.drawImage(embedded, { x, y, width: w, height: h });
        }
      }

      // 2) Append a section for chords + progression
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pageSize = { w: 595, h: 842 };
      let page = pdfDoc.addPage([pageSize.w, pageSize.h]);
      const margin = 36;
      let y = pageSize.h - margin;
      const lh = 14;
      const drawText = (text, size = 12, color = rgb(0, 0, 0)) => {
        if (y < margin + lh) {
          page = pdfDoc.addPage([pageSize.w, pageSize.h]);
          y = pageSize.h - margin;
        }
        page.drawText(text, { x: margin, y, size, font, color });
        y -= lh + (size > 12 ? 4 : 0);
      };

      drawText("Converted Guitar Chords", 16);

      // Progression
      const tokens = (progression || "").split(" | ").filter(Boolean);
      if (tokens.length) {
        drawText("Progression:", 13, rgb(0.16, 0.66, 0.36));
        const perLine = 8;
        for (let i = 0; i < tokens.length; i += perLine) {
          const line = tokens.slice(i, i + perLine).join(" | ");
          drawText(line);
        }
      } else {
        drawText("Progression: —", 13, rgb(0.16, 0.66, 0.36));
      }

      // Chords by measure
      if (chords.length) {
        y -= 6;
        drawText("Chords by measure:", 13, rgb(0.16, 0.66, 0.36));
        chords.forEach((m) => {
          const mNo = String(m.measure).padStart(2, "0");
          drawText(`m${mNo}: ${m.chord || "—"}`);
          if (Array.isArray(m.notes) && m.notes.length) {
            drawText(`  notes: [${m.notes.join(", ")}]`, 11, rgb(0.33, 0.33, 0.33));
          }
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const baseName = (result?.summary?.filename || file?.name || "scan").replace(/\.[^.]+$/, "");
      a.href = url;
      a.download = `${baseName}-score-and-chords.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error("PDF export failed", err);
      alert("Failed to create PDF. Please try again.");
    }
  }, [result, file, chords, progression]);

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
            Upload a printed score (PDF). We’ll run OMR and display measure-by-measure chords.
          </div>
        </div>
        <div style={styles.row}>
          {/* <button type="button" style={styles.buttonGhost} onClick={onPing}>
            Test API
          </button> */}
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

              {/* PDF export */}
              <div style={{ marginTop: 8 }}>
                <button type="button" style={styles.button} onClick={onDownloadPdf}>
                  Download PDF
                </button>
              </div>

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
