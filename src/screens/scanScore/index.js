// src/screens/scanScore/index.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
// Use ESM build to avoid CJS subpath resolution issues in some bundlers
import { PDFDocument, StandardFonts, rgb } from "pdf-lib/dist/pdf-lib.esm.js";
import "./scanScore.css";

export default function ScanScore() {
  const [mode, setMode] = useState("score"); // "score" or "audio"
  const [file, setFile] = useState(null);
  const [objectUrl, setObjectUrl] = useState(null); // for image/pdf preview
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [imageQuality, setImageQuality] = useState(null);

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
  const isAudio = (f) => !!f && (f.type?.startsWith("audio/") || /\.(mp3|wav|m4a|flac|ogg|aac)$/i.test(f.name || ""));
  const ext = (f) => (f?.name || "").split(".").pop()?.toLowerCase() || "";

  const buildUrl = (p) => (base ? `${base}${p}` : p);

  const reset = () => {
    setFile(null);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
    setResult(null);
    setBusy(false);
    setScanProgress(0);
    setScanStage("");
    setIsScanning(false);
    setImageQuality(null);
  };
  
  // Image quality validation
  const checkImageQuality = useCallback((file) => {
    return new Promise((resolve) => {
      if (!isImage(file)) {
        resolve(null);
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        const pixelCount = width * height;
        
        // Calculate approximate DPI based on typical A4 size assumptions
        // A4 is 8.27 × 11.69 inches (2480 × 3508 pixels at 300 DPI)
        const assumedWidthInches = 8.27;
        const estimatedDPI = Math.round(width / assumedWidthInches);
        
        const quality = {
          width,
          height,
          pixelCount,
          estimatedDPI,
          fileSize: file.size,
          isGoodResolution: estimatedDPI >= 300,
          isAcceptableResolution: estimatedDPI >= 200,
          isPoorResolution: estimatedDPI < 200,
          message: estimatedDPI >= 300 
            ? '✓ Excellent resolution for scanning'
            : estimatedDPI >= 200 
              ? '⚠ Acceptable resolution, but higher is better'
              : '⚠ Low resolution detected - consider using a higher quality scan',
          color: estimatedDPI >= 300 ? '#22aa66' : estimatedDPI >= 200 ? '#ff9800' : '#d32f2f'
        };
        
        resolve(quality);
        URL.revokeObjectURL(img.src);
      };
      
      img.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(img.src);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, []);
  

  const switchMode = (newMode) => {
    setMode(newMode);
    reset();
  };

  const setChosenFile = async (f) => {
    if (!f) {
      reset();
      return;
    }
    setFile(f);
    setResult(null);
    if (objectUrl) URL.revokeObjectURL(objectUrl);

    // Preview images, PDFs, and audio
    if (isImage(f) || isPdf(f) || isAudio(f)) {
      const url = URL.createObjectURL(f);
      setObjectUrl(url);
    } else {
      setObjectUrl(null);
    }
    
    // Check image quality for score mode
    if (mode === "score" && isImage(f)) {
      const quality = await checkImageQuality(f);
      setImageQuality(quality);
    } else {
      setImageQuality(null);
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
    setIsScanning(true);
    setScanProgress(0);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      // Choose endpoint based on mode
      const endpoint = mode === "audio" ? "/audio/chords" : "/omr/scan";
      const url = buildUrl(endpoint);
      
      // Simulate scanning progress for better UX
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev < 90) return prev + Math.random() * 10;
          return prev;
        });
      }, 400);
      
      // Update scanning stages
      const stages = mode === "audio" 
        ? ["Loading audio file...", "Analyzing frequency spectrum...", "Detecting chord patterns...", "Identifying chord progressions...", "Finalizing results..."]
        : ["Loading image...", "Preprocessing: Enhancing contrast...", "Preprocessing: Removing noise...", "Detecting staff lines...", "Reading musical notation...", "Identifying chords...", "Finalizing results..."];
      
      let stageIndex = 0;
      const stageInterval = setInterval(() => {
        if (stageIndex < stages.length) {
          setScanStage(stages[stageIndex]);
          stageIndex++;
        }
      }, mode === "audio" ? 1500 : 2000);
      
      const { data } = await axios.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 180_000, // allow time for processing
      });
      
      clearInterval(progressInterval);
      clearInterval(stageInterval);
      setScanProgress(100);
      setScanStage("Complete!");
      
      // Delay to show completion
      await new Promise(resolve => setTimeout(resolve, 800));
      
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
      setIsScanning(false);
      setScanProgress(0);
      setScanStage("");
    }
  };

  // removed unused onPing helper

  // PDF export ---------------------------------------------------------------
  // defined later after chords/progression declarations

  // Chords utilities ----------------------------------------------------------
  const chords = useMemo(() => {
    // Handle both 'chords' (OMR) and 'measures' (audio) response formats
    if (Array.isArray(result?.chords)) return result.chords;
    if (Array.isArray(result?.measures)) return result.measures;
    return [];
  }, [result?.chords, result?.measures]);

  const progression = useMemo(() => {
    if (!result?.ok) return "";
    // Use progression from response if available, otherwise build from chords
    if (result.progression && result.progression !== "N.C.") {
      return result.progression;
    }
    if (!chords.length) return "";
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
    scannerOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)',
    },
    scannerContainer: {
      background: 'linear-gradient(145deg, #1a1a1a, #2d2d2d)',
      borderRadius: 20,
      padding: '40px 50px',
      maxWidth: 600,
      width: '90%',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      position: 'relative',
      overflow: 'hidden',
    },
    scannerTitle: {
      color: '#fff',
      fontSize: 24,
      fontWeight: 700,
      marginBottom: 10,
      textAlign: 'center',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    },
    scannerStage: {
      color: '#22aa66',
      fontSize: 16,
      fontWeight: 500,
      marginBottom: 25,
      textAlign: 'center',
      minHeight: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    scanLine: {
      position: 'relative',
      height: 200,
      background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
      borderRadius: 12,
      marginBottom: 25,
      border: '2px solid #333',
      overflow: 'hidden',
      boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.8)',
    },
    scanLineInner: {
      position: 'absolute',
      width: '100%',
      height: '4px',
      background: 'linear-gradient(90deg, transparent, #00ff88 50%, transparent)',
      boxShadow: '0 0 20px #00ff88, 0 0 40px #00ff88',
      animation: 'scanAnimation 2.5s ease-in-out infinite',
      top: '10%',
    },
    scanGrid: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0, 255, 136, 0.05) 25%, rgba(0, 255, 136, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 136, 0.05) 75%, rgba(0, 255, 136, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 136, 0.05) 25%, rgba(0, 255, 136, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 136, 0.05) 75%, rgba(0, 255, 136, 0.05) 76%, transparent 77%, transparent)',
      backgroundSize: '50px 50px',
      opacity: 0.3,
    },
    progressBar: {
      width: '100%',
      height: 8,
      background: '#222',
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 15,
      border: '1px solid #333',
      boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)',
    },
    progressFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #00cc66, #00ff88, #00cc66)',
      backgroundSize: '200% 100%',
      animation: 'progressShimmer 2s linear infinite',
      transition: 'width 0.3s ease-out',
      boxShadow: '0 0 10px #00ff88',
    },
    progressText: {
      color: '#aaa',
      fontSize: 14,
      textAlign: 'center',
      fontWeight: 600,
      fontFamily: 'monospace',
    },
    scannerCorner: {
      position: 'absolute',
      width: 40,
      height: 40,
      border: '3px solid #00ff88',
    },
    cornerTL: {
      top: 20,
      left: 20,
      borderRight: 'none',
      borderBottom: 'none',
      boxShadow: '-2px -2px 10px rgba(0, 255, 136, 0.3)',
    },
    cornerTR: {
      top: 20,
      right: 20,
      borderLeft: 'none',
      borderBottom: 'none',
      boxShadow: '2px -2px 10px rgba(0, 255, 136, 0.3)',
    },
    cornerBL: {
      bottom: 20,
      left: 20,
      borderRight: 'none',
      borderTop: 'none',
      boxShadow: '-2px 2px 10px rgba(0, 255, 136, 0.3)',
    },
    cornerBR: {
      bottom: 20,
      right: 20,
      borderLeft: 'none',
      borderTop: 'none',
      boxShadow: '2px 2px 10px rgba(0, 255, 136, 0.3)',
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
      animation: result?.ok ? 'fadeInUp 0.5s ease-out' : 'none',
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
    {/* Scanning Animation Overlay */}
    {isScanning && (
      <div style={styles.scannerOverlay}>
        <div style={styles.scannerContainer}>
          {/* Corner decorations */}
          <div style={{...styles.scannerCorner, ...styles.cornerTL}}></div>
          <div style={{...styles.scannerCorner, ...styles.cornerTR}}></div>
          <div style={{...styles.scannerCorner, ...styles.cornerBL}}></div>
          <div style={{...styles.scannerCorner, ...styles.cornerBR}}></div>
          
          <div style={styles.scannerTitle}>
            {mode === "score" ? "🎼 Scanning Music Score" : "🎵 Analyzing Audio"}
          </div>
          
          <div style={styles.scannerStage}>
            <span style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#00ff88',
              animation: 'pulse 1s ease-in-out infinite',
              marginRight: 8,
              boxShadow: '0 0 10px #00ff88'
            }}></span>
            {scanStage}
          </div>
          
          <div style={styles.scanLine}>
            <div style={styles.scanGrid}></div>
            <div style={styles.scanLineInner}></div>
          </div>
          
          <div style={styles.progressBar}>
            <div style={{
              ...styles.progressFill,
              width: `${scanProgress}%`
            }}></div>
          </div>
          
          <div style={styles.progressText}>
            {Math.round(scanProgress)}% Complete
          </div>
        </div>
      </div>
    )}
    
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            {mode === "score" ? "Scan Score → Guitar Chords" : "Audio → Guitar Chords"}
          </h2>
          <div style={styles.subtitle}>
            {mode === "score"
              ? "Upload a printed score (PDF or high-quality image). We'll run OMR and display measure-by-measure chords."
              : "Upload an audio file (MP3, WAV, etc.). We'll detect chords with timestamps."}
          </div>
        </div>
        <div style={styles.row}>
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

      {/* Mode Toggle */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => switchMode("score")}
          style={{
            ...styles.button,
            ...(mode === "score" ? { background: "#2a6", color: "#fff", borderColor: "#2a6" } : {})
          }}
          disabled={busy}
        >
          📄 Score Sheet
        </button>
        <button
          type="button"
          onClick={() => switchMode("audio")}
          style={{
            ...styles.button,
            ...(mode === "audio" ? { background: "#2a6", color: "#fff", borderColor: "#2a6" } : {})
          }}
          disabled={busy}
        >
          🎵 Audio File
        </button>
      </div>

      {/* File input + dropzone */}
      <form onSubmit={onUpload}>
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`dropzone-enhanced ${dragOver ? 'drag-over' : ''}`}
          style={styles.dropzone}
          aria-label="Drop a file here"
        >
          <div style={{ 
            fontSize: 48, 
            marginBottom: 12,
            opacity: dragOver ? 1 : 0.6,
            transition: 'all 0.3s ease',
            transform: dragOver ? 'scale(1.1)' : 'scale(1)'
          }}>
            {mode === "score" ? "🎼" : "🎵"}
          </div>
          <div style={{ marginBottom: 8, fontSize: 16, fontWeight: 600 }}>
            {dragOver ? (
              <span style={{ color: '#2a6' }}>Drop your file here!</span>
            ) : (
              <span>Drop a {mode === "score" ? "score" : "audio"} file here — or choose a file</span>
            )}
          </div>
          <input
            type="file"
            accept={mode === "score" ? "image/*,.pdf,.omr" : "audio/*,.mp3,.wav,.m4a,.flac,.ogg,.aac"}
            onChange={onFileChange}
            style={{ 
              display: "inline-block",
              padding: '8px 12px',
              background: '#fff',
              border: '1px solid #ccc',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14
            }}
          />
          <div style={{ marginTop: 12, ...styles.hint }}>
            {mode === "score" ? (
              <>
                <strong>📷 For best results:</strong> Use high-resolution scans (~300–400 dpi) with good contrast. 
                Printed music sheets work best. PDFs are automatically optimized.
              </>
            ) : (
              <>
                <strong>🎧 For best results:</strong> Clear recordings work best. Instrumental tracks preferred. 
                Avoid heavy distortion or background noise.
              </>
            )}
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
            {imageQuality && (
              <div style={{ 
                marginTop: 8, 
                padding: 8, 
                background: imageQuality.isGoodResolution ? '#e8f5e9' : imageQuality.isAcceptableResolution ? '#fff3e0' : '#ffebee',
                borderRadius: 6,
                borderLeft: `4px solid ${imageQuality.color}`
              }}>
                <div style={{ fontWeight: 600, color: imageQuality.color, marginBottom: 4 }}>
                  Image Quality Analysis
                </div>
                <div style={{ fontSize: 13, marginBottom: 2 }}>
                  <span style={{ opacity: 0.7 }}>Resolution:</span> {imageQuality.width} × {imageQuality.height} px
                </div>
                <div style={{ fontSize: 13, marginBottom: 2 }}>
                  <span style={{ opacity: 0.7 }}>Estimated DPI:</span> ~{imageQuality.estimatedDPI} dpi
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: imageQuality.color, marginTop: 6 }}>
                  {imageQuality.message}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <button
            type="submit"
            disabled={!file || busy}
            style={{ ...styles.buttonPrimary, ...(busy || !file ? styles.buttonDisabled : {}) }}
          >
            {busy ? (mode === "audio" ? "Analyzing…" : "Scanning…") : (mode === "audio" ? "Analyze Audio" : "Scan")}
          </button>
        </div>
      </form>

      {/* Preview (image, PDF, or audio) */}
      {objectUrl && (
        <div style={styles.previewWrap}>
          {isImage(file) ? (
            <img src={objectUrl} alt="Preview" style={styles.previewImg} />
          ) : isPdf(file) ? (
            <embed src={objectUrl} type="application/pdf" style={styles.previewPdf} />
          ) : isAudio(file) ? (
            <audio controls src={objectUrl} style={{ width: '100%', marginTop: 12 }} />
          ) : null}
          <div style={styles.tipBox}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Instructions before you {mode === "audio" ? "analyze" : "scan"}:</div>
            {mode === "score" ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li><strong>For PDF:</strong> Works best with digital or clean scanned scores</li>
                <li><strong>For Images (PNG/JPG):</strong> Use high-resolution (300+ dpi), high-contrast images</li>
                <li>Printed pages (not handwriting)</li>
                <li>Keep the sheet straight and well-lit (if photographing)</li>
                <li>Ensure full systems are visible (not single-staff snippets)</li>
                <li>Avoid blurry, skewed, or low-quality photos</li>
              </ul>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li><strong>Clear audio:</strong> Works best with clean recordings</li>
                <li><strong>Instrumental preferred:</strong> Vocals can interfere with chord detection</li>
                <li>Avoid heavy distortion or excessive reverb</li>
                <li>Good signal-to-noise ratio improves accuracy</li>
                <li>Supported formats: MP3, WAV, M4A, FLAC, OGG, AAC</li>
              </ul>
            )}
            <div style={{ marginTop: 8, fontSize: 12, fontStyle: 'italic', opacity: 0.8 }}>
              💡 Tip: {mode === "score" ? "If scanning with a phone camera, use document scan apps for better quality" : "Studio recordings give more accurate results than live performances"}
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="result-card-animated" style={styles.resultCard(!!result.ok)}>
          {result.ok ? (
            <>
              <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  display: 'inline-block',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #22aa66, #2a6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 'bold',
                  animation: 'pulse 1s ease-in-out'
                }}>✓</span>
                <span style={styles.labelSuccess}>Upload Successfully Converted !</span>
              </div>

              <div>
                <span style={styles.label}>{mode === "audio" ? "Audio File:" : "Score Sheet:"}</span>{" "}
                <strong>{result.summary?.filename ?? "—"}</strong>
              </div>
              <div>
                <span style={styles.label}>Size:</span> {formatBytes(result.summary?.bytes)}
              </div>
              {mode === "audio" && result.summary?.duration && (
                <div>
                  <span style={styles.label}>Duration:</span> {result.summary.duration}s
                </div>
              )}
              {mode === "audio" && result.summary?.unique_chords && (
                <div>
                  <span style={styles.label}>Unique Chords:</span> {result.summary.unique_chords}
                </div>
              )}

              {/* PDF export */}
              <div style={{ marginTop: 8 }}>
                <button type="button" style={styles.button} onClick={onDownloadPdf}>
                  Download PDF
                </button>
              </div>

              {/* Chords */}
              {chords.length ? (
                <>
                  <div style={styles.chordsHeader}>
                    {mode === "audio" ? "Detected Guitar Chords" : "Converted Guitar Chords"}
                  </div>

                  {/* Grid view (4 measures per row) */}
                  <div>
                    {chordGrid.map((row, i) => (
                      <div key={i} className="chord-grid-row" style={styles.chordsGridRow}>
                        {row.map((m, idx) => (
                          <div key={m.measure} className="chord-reveal" style={{
                            ...styles.chordCell,
                            animationDelay: `${(i * 4 + idx) * 0.1}s`
                          }}>
                            <div>
                              {mode === "audio" && m.time !== undefined ? (
                                <>
                                  <span style={{ opacity: 0.7 }}>{m.time}s:</span>{" "}
                                  <strong style={{ color: '#2a6', fontSize: '1.1em' }}>{m.chord || "—"}</strong>
                                </>
                              ) : (
                                <>
                                  <span style={{ opacity: 0.7 }}>m{String(m.measure).padStart(2, "0")}:</span>{" "}
                                  <strong style={{ color: '#2a6', fontSize: '1.1em' }}>{m.chord || "—"}</strong>
                                </>
                              )}
                            </div>
                            {Array.isArray(m.notes) && m.notes.length > 0 && (
                              <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4, color: '#666' }}>
                                notes: [{m.notes.join(", ")}]
                              </div>
                            )}
                            {mode === "audio" && m.duration && (
                              <div style={{ opacity: 0.6, fontSize: 11, marginTop: 2 }}>
                                ({m.duration}s)
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
