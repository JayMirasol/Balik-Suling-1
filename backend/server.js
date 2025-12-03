// backend/server.js
"use strict";

/**
 * Setup:
 *   npm i express cors multer fast-xml-parser adm-zip @tonaljs/tonal dotenv music-metadata franc
 *
 * .env:
 *   FRONTEND_ORIGIN=http://localhost:3000
 *   AUDIVERIS_CLI="C:\\Program Files\\Audiveris\\Audiveris.exe"
 *   # or the JAR path: AUDIVERIS_CLI="C:\\Program Files\\Audiveris\\app\\audiveris.jar"
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { XMLParser } = require("fast-xml-parser");
const { Chord, Note } = require("@tonaljs/tonal");
const AdmZip = require("adm-zip");
const mm = require("music-metadata");
const franc = require("franc");
const { smartTranslateTokens, fetchTagalogLangEntry } = require("./dict-helpers");

const app = express();

// --- CORS -------------------------------------------------------------------
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

// --- Dirs -------------------------------------------------------------------
const UPLOADS_DIR = path.join(__dirname, "uploads");
const OMR_OUT_ROOT = path.join(__dirname, "omr-out");
const AUDIO_OUT_ROOT = path.join(__dirname, "audio-out");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(OMR_OUT_ROOT, { recursive: true });
fs.mkdirSync(AUDIO_OUT_ROOT, { recursive: true });

app.use("/omr-out", express.static(OMR_OUT_ROOT));
app.use("/audio-out", express.static(AUDIO_OUT_ROOT));

// --- Multer (disk) ----------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + sanitizeFilename(file.originalname)),
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB cap (audio can be bigger)
});

// --- Utils ------------------------------------------------------------------
function sanitizeFilename(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]+/g, "_");
}
function vArray(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}
function listFilesRecursive(dir, exts) {
  const out = [];
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (exts.some((ext) => e.name.toLowerCase().endsWith(ext))) out.push(p);
    }
  };
  walk(dir);
  return out;
}
function mostRecent(paths) {
  if (!paths.length) return null;
  return paths
    .map((p) => ({ p, t: fs.statSync(p).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0].p;
}
function getWorkspaceDirs() {
  // Windows installer typically uses Documents\Audiveris (and \workspace)
  const home = process.env.USERPROFILE || process.env.HOME;
  if (!home) return [];
  const d1 = path.join(home, "Documents", "Audiveris");
  const d2 = path.join(home, "Documents", "Audiveris", "workspace");
  return [d1, d2].filter((d) => fs.existsSync(d));
}
function pickPitchClassFromMusicXmlNote(n) {
  const step = n?.pitch?.step;
  const octave = n?.pitch?.octave;
  if (!step || octave == null) return null;
  const alter = Number(n?.pitch?.alter || 0);
  const acc = alter === 2 ? "##" : alter === 1 ? "#" : alter === -1 ? "b" : alter === -2 ? "bb" : "";
  const full = `${step}${acc}${octave}`;
  return Note.pitchClass(full) || null;
}

// --- Health -----------------------------------------------------------------
app.get("/health", (req, res) =>
  res.json({ ok: true, service: "balik-suling-backend", ts: Date.now() })
);

// --- Spotify Token Exchange (PKCE) -----------------------------------------
app.post("/spotify-token", async (req, res) => {
  try {
    const { code, code_verifier, redirect_uri } = req.body || {};
    const client_id = process.env.SPOTIFY_CLIENT_ID || process.env.REACT_APP_SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || redirect_uri;

    if (!client_id) {
      return res.status(400).json({ error: "Missing SPOTIFY_CLIENT_ID env" });
    }
    if (!code || !code_verifier || !redirectUri) {
      return res.status(400).json({ error: "Missing code, code_verifier, or redirect_uri" });
    }

    const body = new URLSearchParams({
      client_id,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier,
    });

    const tokenResp = await axios.post("https://accounts.spotify.com/api/token", body.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      validateStatus: null,
    });

    return res.status(tokenResp.status).json(tokenResp.data);
  } catch (err) {
    console.error("SPOTIFY TOKEN ERROR", err);
    return res.status(500).json({ error: "Internal Error", details: String(err) });
  }
});

// ============================================================================
// 1) SCORE (image/PDF) -> CHORDS  (OMR via Audiveris)
//    POST /omr/scan  (and alias /chordscan/omr)
// ============================================================================
app.post("/omr/scan", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: "Empty upload" });
    if (!/\.(png|jpg|jpeg|tif|tiff|bmp|pdf|omr)$/i.test(req.file.originalname)) {
      return res.status(400).json({ ok: false, error: "Unsupported file type" });
    }

    const AUDIVERIS = process.env.AUDIVERIS_CLI;
    if (!AUDIVERIS) {
      return res.status(500).json({
        ok: false,
        error: "AUDIVERIS_CLI is not set. Point it to Audiveris.exe or audiveris.jar in backend/.env",
      });
    }

    const jobDir = path.join(OMR_OUT_ROOT, String(Date.now()));
    fs.mkdirSync(jobDir, { recursive: true });

    // For images, apply advanced preprocessing for optimal OMR quality
    let processedFile = req.file.path;
    let preprocessedFiles = []; // Track all preprocessing attempts
    const isImageFile = /\.(png|jpg|jpeg|tif|tiff|bmp)$/i.test(req.file.originalname);
    
    if (isImageFile) {
      const sharp = require('sharp');
      const image = sharp(req.file.path);
      const metadata = await image.metadata();
      console.log(`Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}, channels: ${metadata.channels}, DPI: ${metadata.density || 'unknown'}`);
      
      const isPNG = /\.png$/i.test(req.file.originalname);
      const hasAlpha = metadata.channels === 4 || metadata.hasAlpha;
      
      // Check if image is too small
      const estimatedDPI = Math.round(metadata.width / 8.27); // Assume A4 width
      console.log(`Estimated DPI: ~${estimatedDPI}`);
      
      if (estimatedDPI < 150) {
        console.warn(`⚠ Very low resolution detected (~${estimatedDPI} DPI). Results may be poor.`);
      }
      
      if (isPNG && hasAlpha) {
        console.log(`⚠ PNG with transparency detected - will flatten to white background`);
      }
      
      try {
        // Helper function to create preprocessing pipeline
        const createPipeline = (inputPath) => {
          let pipeline = sharp(inputPath);
          
          // CRITICAL: For PNG files, remove alpha channel and flatten to white background
          if (isPNG || hasAlpha) {
            pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
          }
          
          // Ensure we're working with RGB first, then convert to grayscale
          pipeline = pipeline.toColorspace('srgb');
          
          return pipeline;
        };
        
        // Strategy 1: High-contrast aggressive preprocessing (best for low-quality scans)
        const enhancedPath1 = path.join(jobDir, 'enhanced_aggressive.tiff');
        await createPipeline(req.file.path)
          .resize({ 
            width: 3300,
            height: 4677,
            fit: 'inside', 
            withoutEnlargement: false,
            kernel: 'lanczos3'
          })
          .rotate()
          .grayscale()
          .median(3)
          .normalise({ lower: 1, upper: 99 })
          .linear(1.3, -15) // More aggressive contrast
          .sharpen({ sigma: 2.0, m1: 1.2, m2: 0.4 }) // Stronger sharpening
          .threshold(120) // Lower threshold for more black
          .tiff({ compression: 'lzw', quality: 100 })
          .toFile(enhancedPath1);
        preprocessedFiles.push(enhancedPath1);
        console.log(`✓ Created aggressive preprocessing: ${enhancedPath1}`);
        
        // Strategy 2: Moderate preprocessing (balanced) - Best for most cases
        const enhancedPath2 = path.join(jobDir, 'enhanced_balanced.tiff');
        await createPipeline(req.file.path)
          .resize({ 
            width: 3300,
            height: 4677,
            fit: 'inside', 
            withoutEnlargement: false,
            kernel: 'lanczos3'
          })
          .rotate()
          .grayscale()
          .median(3)
          .normalise({ lower: 2, upper: 98 })
          .linear(1.2, -10)
          .sharpen({ sigma: 1.5, m1: 1.0, m2: 0.5 })
          .threshold(128)
          .tiff({ compression: 'lzw', quality: 100 })
          .toFile(enhancedPath2);
        preprocessedFiles.push(enhancedPath2);
        console.log(`✓ Created balanced preprocessing: ${enhancedPath2}`);
        
        // Strategy 3: Gentle preprocessing (for high-quality scans)
        const enhancedPath3 = path.join(jobDir, 'enhanced_gentle.tiff');
        await createPipeline(req.file.path)
          .resize({ 
            width: 3300,
            height: 4677,
            fit: 'inside', 
            withoutEnlargement: false,
            kernel: 'lanczos3'
          })
          .rotate()
          .grayscale()
          .normalise({ lower: 5, upper: 95 })
          .sharpen({ sigma: 1.0 })
          .tiff({ compression: 'lzw', quality: 100 })
          .toFile(enhancedPath3);
        preprocessedFiles.push(enhancedPath3);
        console.log(`✓ Created gentle preprocessing: ${enhancedPath3}`);
        
        // Strategy 4: Special PNG handling without threshold (for screenshots/digital PNGs)
        if (isPNG) {
          const enhancedPath4 = path.join(jobDir, 'enhanced_png_special.tiff');
          await createPipeline(req.file.path)
            .resize({ 
              width: 3300,
              height: 4677,
              fit: 'inside', 
              withoutEnlargement: false,
              kernel: 'lanczos3'
            })
            .rotate()
            .grayscale()
            .normalise({ lower: 3, upper: 97 })
            .linear(1.15, -8) // Gentler contrast for digital images
            .sharpen({ sigma: 1.2 })
            // No threshold - keep grayscale for digital images
            .tiff({ compression: 'lzw', quality: 100 })
            .toFile(enhancedPath4);
          preprocessedFiles.push(enhancedPath4);
          console.log(`✓ Created PNG-specific preprocessing: ${enhancedPath4}`);
          
          // For PNG, try PNG-specific version first
          processedFile = enhancedPath4;
        } else {
          // Use balanced as primary for JPG
          processedFile = enhancedPath2;
        }
        
        console.log(`✓ Image preprocessing complete with ${preprocessedFiles.length} strategies`);
      } catch (preprocessErr) {
        console.warn('⚠ Image preprocessing failed, using original:', preprocessErr);
        preprocessedFiles = [];
      }
    }

    // Build Audiveris command
    let cmd, cmdArgs, useShell = false;
    if (/\.jar$/i.test(AUDIVERIS)) {
      const jarDir = path.dirname(AUDIVERIS);
      const sep = process.platform === "win32" ? ";" : ":";
      const cp = path.join(jarDir, "lib", "*") + sep + AUDIVERIS;
      cmd = "java";
      cmdArgs = ["-cp", cp, "Audiveris", "-batch", "-export", "-output", jobDir, processedFile];
    } else {
      cmd = AUDIVERIS; // .exe/.bat/.cmd
      cmdArgs = ["-batch", "-export", "-output", jobDir, processedFile];
      useShell = /\.bat$|\.cmd$/i.test(AUDIVERIS);
    }

    let stdout = "", stderr = "";
    const proc = spawn(cmd, cmdArgs, { shell: useShell });
    const killAt = setTimeout(() => { try { proc.kill("SIGKILL"); } catch {} }, 180_000);
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    const code = await new Promise((resolve) => proc.on("exit", resolve));
    clearTimeout(killAt);

    if (code !== 0) {
      const text = (stderr || stdout).slice(0, 4000);
      if (/not recognized|No such file|cannot find/i.test(text)) {
        return res.status(500).json({
          ok: false,
          error: "Audiveris not found/executable. Check AUDIVERIS_CLI and Java (if using JAR).",
          details: text,
        });
      }
      return res.status(500).json({ ok: false, error: `Audiveris failed (exit ${code})`, details: text });
    }

    // Find exported MusicXML
    let candidates = listFilesRecursive(jobDir, [".mxl", ".musicxml", ".xml"]);
    if (!candidates.length) {
      // Fallback to default workspace
      for (const d of getWorkspaceDirs()) {
        candidates.push(...listFilesRecursive(d, [".mxl", ".musicxml", ".xml"]));
      }
    }
    let musicxmlPath = mostRecent(candidates);
    
    // If no output found and we have multiple preprocessing attempts, try them
    if (!musicxmlPath && preprocessedFiles.length > 0) {
      console.log('⚠ First attempt failed, trying alternative preprocessing strategies...');
      
      for (let i = 0; i < preprocessedFiles.length; i++) {
        const altFile = preprocessedFiles[i];
        if (altFile === processedFile) continue; // Already tried this one
        
        console.log(`Attempting with: ${path.basename(altFile)}`);
        
        // Run Audiveris again with alternative preprocessing
        let altCmd = cmd;
        let altCmdArgs = [...cmdArgs];
        altCmdArgs[altCmdArgs.length - 1] = altFile; // Replace file path
        
        try {
          const altProc = spawn(altCmd, altCmdArgs, { shell: useShell });
          const altKillAt = setTimeout(() => { try { altProc.kill("SIGKILL"); } catch {} }, 90_000);
          await new Promise((resolve) => altProc.on("exit", resolve));
          clearTimeout(altKillAt);
          
          // Check for new output
          candidates = listFilesRecursive(jobDir, [".mxl", ".musicxml", ".xml"]);
          if (candidates.length) {
            musicxmlPath = mostRecent(candidates);
            if (musicxmlPath) {
              console.log(`✓ Success with alternative preprocessing: ${path.basename(altFile)}`);
              break;
            }
          }
        } catch (altErr) {
          console.warn(`Alternative attempt failed:`, altErr.message);
        }
      }
    }
    
    if (!musicxmlPath) {
      // Provide detailed diagnostic information
      const diagnostics = [];
      diagnostics.push('Could not extract musical notation from the uploaded file.');
      
      if (isImageFile) {
        const sharp = require('sharp');
        try {
          const metadata = await sharp(req.file.path).metadata();
          const estimatedDPI = Math.round(metadata.width / 8.27);
          
          if (estimatedDPI < 200) {
            diagnostics.push(`• Resolution too low (~${estimatedDPI} DPI). Scan at 300-400 DPI.`);
          } else {
            diagnostics.push(`• Resolution appears adequate (~${estimatedDPI} DPI).`);
          }
        } catch (err) {
          diagnostics.push('• Unable to analyze image metadata.');
        }
        
        diagnostics.push('• Ensure the image contains printed music notation (not chord charts or tabs).');
        diagnostics.push('• Make sure staff lines are clearly visible and continuous.');
        diagnostics.push('• Avoid handwritten music - OMR works with printed scores only.');
        diagnostics.push('• Try scanning in black & white mode with high contrast.');
        diagnostics.push('• Ensure the page is straight (not skewed or rotated).');
      } else {
        diagnostics.push('• PDF might not contain valid music notation.');
        diagnostics.push('• Try converting to a high-quality image (PNG at 300+ DPI).');
      }
      
      return res.json({
        ok: false,
        error: diagnostics.join('\n'),
        details: `Audiveris could not detect staves or notes. Exit code: ${code}`,
        suggestions: [
          'Use a scanner or document scanning app at 300-400 DPI',
          'Ensure good lighting and contrast',
          'Verify the file contains actual music notation with staff lines',
          'Try a different page or section of the score'
        ]
      });
    }

    // Read XML (handle .mxl)
    let xml;
    if (/\.mxl$/i.test(musicxmlPath)) {
      const zip = new AdmZip(musicxmlPath);
      const entry = zip.getEntries().find((e) => /\.xml$/i.test(e.entryName));
      if (!entry) return res.status(500).json({ ok: false, error: "MXL had no XML inside" });
      xml = entry.getData().toString("utf8");
    } else {
      xml = fs.readFileSync(musicxmlPath, "utf8");
    }

    // Parse MusicXML -> naive chords
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
    const doc = parser.parse(xml);
    const score = doc["score-partwise"] || doc["score_timewise"] || doc["score-timewise"];
    const parts = vArray(score?.part);
    const measures = vArray(parts?.[0]?.measure);
    if (!measures.length) {
      return res.json({ ok: false, error: "Empty score content after OMR (no measures found)." });
    }

    const chords = [];
    let totalNotes = 0;
    
    for (const m of measures) {
      const measureNo = Number(m?.number || 0);
      const notes = vArray(m?.note).filter((n) => !("rest" in n));
      totalNotes += notes.length;
      
      const pcs = [];
      for (const n of notes) {
        const pc = pickPitchClassFromMusicXmlNote(n);
        if (pc) pcs.push(pc);
      }
      const uniquePcs = [...new Set(pcs)];
      const detected = uniquePcs.length ? Chord.detect(uniquePcs) : [];
      chords.push({ measure: measureNo, chord: detected?.[0] || null, notes: uniquePcs });
    }

    const anyChord = chords.some((c) => c.chord);
    const anyNotes = totalNotes > 0;
    
    console.log(`Detected ${measures.length} measures, ${totalNotes} notes, ${chords.filter(c => c.chord).length} chords`);
    
    if (!anyChord) {
      // If we detected notes but couldn't identify chords
      if (anyNotes) {
        return res.json({
          ok: true, // Still return success since we got notes
          warning: 'Musical notation detected, but chord recognition was limited. This may be due to complex harmony, incomplete chords, or non-standard notation.',
          summary: { 
            filename: req.file.originalname, 
            bytes: req.file.size,
            measures: measures.length,
            notes: totalNotes,
            chordsDetected: 0
          },
          musicxmlUrl: "/omr-out/" + path.relative(OMR_OUT_ROOT, musicxmlPath).replace(/\\/g, "/"),
          chords,
        });
      }
      
      // No notes or chords detected at all
      return res.json({
        ok: false,
        error: "Musical notation was extracted, but no recognizable chords were found.\n\nPossible reasons:\n• The score may contain single melody lines (not chords)\n• Notation may be incomplete or unclear\n• This might be a monophonic piece (one note at a time)\n• Try a section with more harmonic content",
        chords,
        details: `Found ${measures.length} measures with ${totalNotes} notes, but chord detection failed.`
      });
    }

    const musicxmlUrl = "/omr-out/" + path.relative(OMR_OUT_ROOT, musicxmlPath).replace(/\\/g, "/");

    return res.json({
      ok: true,
      summary: { filename: req.file.originalname, bytes: req.file.size },
      musicxmlUrl,
      chords,
    });
  } catch (err) {
    console.error("OMR ERROR", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Alias for your chordscanner page
app.post("/chordscan/omr", upload.single("file"), (req, res, next) => {
  // Delegate to /omr/scan handler
  req.url = "/omr/scan";
  next();
}, app._router.stack.find(l => l.route && l.route.path === "/omr/scan").route.stack[0].handle);

// ============================================================================
// 2) AUDIO/SONG -> MUSIC SHEET (Kapampangan gate + MusicXML lead-sheet)
//    POST /audio/score
// ============================================================================
app.post("/audio/score", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: "Empty upload" });
    if (!/^audio\//.test(req.file.mimetype || "") && !/\.(mp3|wav|m4a|flac|ogg|aac)$/i.test(req.file.originalname)) {
      return res.status(400).json({ ok: false, error: "Unsupported audio type" });
    }

    // Try to glean some text for language detection
    let text = "";
    try {
      const meta = await mm.parseFile(req.file.path, { duration: false });
      const c = meta.common || {};
      const bits = []
        .concat(c.title || [])
        .concat(c.artist || [])
        .concat(c.album || [])
        .concat((c.genre && c.genre.join(" ")) || [])
        .concat(c.comment || [])
        .concat(c.lyrics || []);
      text = String(bits.filter(Boolean).join(" ")).slice(0, 5000);
    } catch (_) {}
    if (!text) text = req.file.originalname.replace(/[_\-\.]/g, " ");

    const lang = franc(text || "", { minLength: 10 }); // ISO 639-3
    if (lang !== "pam") {
      return res.status(400).json({
        ok: false,
        error: "The uploaded audio does not appear to be Kapampangan (pam). Please upload a Kapampangan song.",
        detectedLang: lang || "und",
      });
    }

    // Demo chord estimate (replace with real analyzer later)
    const estimatedChords = ["C","G","Am","F","C","G","C"];

    // Build simple MusicXML lead-sheet
    const title = (req.file.originalname || "Kapampangan Song").replace(/\.[^.]+$/, "");
    const musicxml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${escapeXml(title)}</work-title></work>
  <part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">
    ${estimatedChords.map((ch,i)=>`
    <measure number="${i+1}">
      ${i===0?`<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>`:""}
      <harmony>${chordToHarmonyXML(ch)}</harmony>
      <note><rest/><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><rest/><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><rest/><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><rest/><duration>1</duration><voice>1</voice><type>quarter</type></note>
    </measure>`).join("")}
  </part>
</score-partwise>`;
    const outName = sanitizeFilename(`${Date.now()}_${title}.musicxml`);
    const outPath = path.join(AUDIO_OUT_ROOT, outName);
    fs.writeFileSync(outPath, musicxml, "utf8");

    res.json({
      ok: true,
      summary: { filename: req.file.originalname, bytes: req.file.size },
      isKapampangan: true,
      estimatedChords,
      musicxmlUrl: "/audio-out/" + outName,
    });
  } catch (err) {
    console.error("AUDIO->SCORE ERROR", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ============================================================================
// 2b) AUDIO -> GUITAR CHORDS (Chord Detection)
//     POST /audio/chords
// ============================================================================
app.post("/audio/chords", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: "Empty upload" });
    if (!/^audio\//.test(req.file.mimetype || "") && !/\.(mp3|wav|m4a|flac|ogg|aac)$/i.test(req.file.originalname)) {
      return res.status(400).json({ ok: false, error: "Unsupported audio type" });
    }

    const audioPath = req.file.path;
    const scriptPath = path.join(__dirname, "py", "audio_chord_detection.py");
    
    // Check if Python script exists
    if (!fs.existsSync(scriptPath)) {
      return res.status(500).json({
        ok: false,
        error: "Chord detection script not found. Please ensure audio_chord_detection.py exists in backend/py/",
      });
    }

    // Execute Python script for chord detection
    const pythonExec = process.env.PYTHON_EXECUTABLE || "python";
    const proc = spawn(pythonExec, [scriptPath, audioPath]);
    
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    proc.stderr.on("data", (chunk) => (stderr += chunk.toString()));

    proc.on("close", (code) => {
      // Clean up uploaded file
      try {
        fs.unlinkSync(audioPath);
      } catch (_) {}

      if (code !== 0) {
        console.error("AUDIO CHORD DETECTION ERROR", { code, stderr });
        return res.status(500).json({
          ok: false,
          error: `Chord detection failed (exit code ${code})`,
          details: stderr || stdout,
        });
      }

      try {
        const result = JSON.parse(stdout);
        
        if (!result.ok) {
          return res.status(400).json(result);
        }

        // Format chords for display (similar to OMR output)
        const measures = result.chords.map((c, i) => ({
          measure: i + 1,
          time: c.time,
          chord: c.chord,
          duration: c.duration,
        }));

        res.json({
          ok: true,
          summary: {
            filename: req.file.originalname,
            bytes: req.file.size,
            duration: result.summary.duration,
            total_segments: result.summary.total_segments,
            unique_chords: result.summary.unique_chords,
          },
          measures,
          progression: result.progression,
        });
      } catch (parseErr) {
        console.error("Failed to parse Python output", parseErr, stdout);
        res.status(500).json({
          ok: false,
          error: "Failed to parse chord detection output",
          details: stdout,
        });
      }
    });
  } catch (err) {
    console.error("AUDIO->CHORDS ERROR", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// --- Helper: generate a simple MusicXML lead-sheet with chord symbols -------
function buildChordLeadSheetXML(title, chords, opts = {}) {
  const beatsPerBar = opts.beatsPerBar || 4;
  const divisions = opts.divisions || 1;
  const tempo = opts.tempo || 100;
  const keyFifths = (typeof opts.keyFifths === "number") ? opts.keyFifths : 0;

  // One chord per measure; each measure has 4 quarter rests with a harmony tag on beat 1.
  const measuresXml = chords.map((ch, i) => {
    return `
    <measure number="${i + 1}">
      <attributes>
        ${i === 1 ? "" : ""} <!-- attributes only needed in measure 1 really -->
      </attributes>
      ${i === 0 ? `
      <attributes>
        <divisions>${divisions}</divisions>
        <key><fifths>${keyFifths}</fifths></key>
        <time><beats>${beatsPerBar}</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <direction placement="above">
        <direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${tempo}</per-minute></metronome></direction-type>
        <sound tempo="${tempo}"/>
      </direction>
      ` : ""}

      <harmony>
        ${chordToHarmonyXML(ch)}
      </harmony>

      ${Array.from({ length: beatsPerBar }).map(() =>
        `<note><rest/><duration>${divisions}</duration><voice>1</voice><type>quarter</type></note>`
      ).join("")}
      <barline location="right"><bar-style>regular</bar-style></barline>
    </measure>
    `;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC
  "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
  "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${escapeXml(title)}</work-title></work>
  <identification><encoding><software>Balik Suling</software></encoding></identification>
  <part-list>
    <score-part id="P1"><part-name>Lead</part-name></score-part>
  </part-list>
  <part id="P1">
  ${measuresXml}
  </part>
</score-partwise>`;
}

function chordToHarmonyXML(symbol){
  const m = String(symbol).match(/^([A-Ga-g])(#{1,2}|b{1,2})?/);
  const root = m ? m[1].toUpperCase() : "C";
  const acc  = m && m[2] ? m[2] : null;
  // map to MusicXML root-alter: #=1, ##=2, b=-1, bb=-2
  const alter = acc === "##" ? 2 : acc === "#" ? 1 : acc === "bb" ? -2 : acc === "b" ? -1 : null;
  const kind = /maj7|Δ7/i.test(symbol) ? "major-seventh"
            : /maj/i.test(symbol) ? "major"
            : /m7/i.test(symbol) ? "minor-seventh"
            : /\bm(?!aj)/i.test(symbol) ? "minor"
            : /dim7|o7/i.test(symbol) ? "diminished-seventh"
            : /dim|o/.test(symbol) ? "diminished"
            : /aug|\+/.test(symbol) ? "augmented"
            : /sus2/.test(symbol) ? "suspended-second"
            : /sus/.test(symbol) ? "suspended-fourth"
            : /7/.test(symbol) ? "dominant"
            : "major";
  return `
    <root>
      <root-step>${root}</root-step>
      ${alter!=null?`<root-alter>${alter}</root-alter>`:""}
    </root>
    <kind>${kind}</kind>
  `;
}

function inferMusicXMLKind(sym) {
  const s = String(sym).toLowerCase();
  if (/maj7|Δ7/.test(s)) return "major-seventh";
  if (/maj/.test(s)) return "major";
  if (/m7/.test(s)) return "minor-seventh";
  if (/\bm(?!aj)/.test(s)) return "minor";
  if (/dim7/.test(s)) return "diminished-seventh";
  if (/dim|o/.test(s)) return "diminished";
  if (/aug|\+/.test(s)) return "augmented";
  if (/sus2/.test(s)) return "suspended-second";
  if (/sus/.test(s)) return "suspended-fourth";
  if (/7/.test(s)) return "dominant";
  return "major";
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
const TRANSLATION_PROVIDER = process.env.TRANSLATION_PROVIDER || "mock";

// ============================================================================
// 3) TRANSLATION - KAPAMPANGAN TO TAGALOG & ENGLISH 
// ============================================================================

// --- Translation endpoint --------------------------------------------------
// ---------- Translation helpers (paste here) ----------
const axios = require("axios");

// Config / provider list
const KNOWN_PROVIDER_ENDPOINTS = [
  process.env.LIBRE_URL || "http://127.0.0.1:5000/translate",
  "https://translate.argosopentech.com/translate",
  // add other providers here if you want
];

// small in-memory cache
let _providerLangsCache = { ts: 0, langs: null, provider: null, ttl: 60_000 }; // cache 60s

function mapFrontendToProvider(lang) {
  if (!lang) return lang;
  if (lang === "fil") return "tl"; // map Filipino frontend tag to provider tagalog code
  return lang;
}

async function fetchProviderLanguages(url) {
  // cached per URL for small ttl
  const now = Date.now();
  if (_providerLangsCache.provider === url && _providerLangsCache.langs && (now - _providerLangsCache.ts) < _providerLangsCache.ttl) {
    return _providerLangsCache.langs;
  }

  try {
    // Most Libre-compatible servers expose GET /languages
    const infoUrl = url.replace(/\/translate\/?$/i, "/languages");
    const resp = await axios.get(infoUrl, { timeout: 8000, validateStatus: null });
    if (resp.status >= 200 && resp.status < 300 && Array.isArray(resp.data)) {
      const codes = resp.data.map((x) => (typeof x === "string" ? x : x.code)).filter(Boolean);
      _providerLangsCache = { ts: now, langs: codes, provider: url, ttl: 60_000 };
      return codes;
    }
  } catch (e) {
    // ignore and return null
  }
  return null;
}

async function providerSupports(url, lang) {
  const mapped = mapFrontendToProvider(lang);
  if (!mapped) return false;
  const langs = await fetchProviderLanguages(url);
  if (!langs) return false;
  // some providers list codes like "en","de","tl", etc.
  return langs.includes(mapped);
}

// low-level single-provider call (normalizes response and rejects HTML)
async function callProviderOnce(url, payload) {
  const resp = await axios.post(url, payload, { timeout: 15000, validateStatus: null, headers: { "Content-Type": "application/json" } });
  const contentType = (resp.headers && resp.headers["content-type"]) || "";
  if (resp.status < 200 || resp.status >= 300) throw new Error(`status ${resp.status}`);
  if (typeof resp.data === "string" && (contentType.includes("text/html") || /^<!doctype/i.test(resp.data) || resp.data.trim().startsWith("<"))) {
    throw new Error("provider returned HTML");
  }
  const body = resp.data;
  if (typeof body === "object") {
    if (body.translatedText) return String(body.translatedText);
    if (body.translated) return String(body.translated);
    if (body.result) return String(body.result);
    if (body.output) return String(body.output);
    return String(JSON.stringify(body));
  }
  return String(body);
}

// Try providers (in order) for a single pair
async function translateViaProviders(text, source, target) {
  const payloadBase = { q: text, source: mapFrontendToProvider(source) || "auto", target: mapFrontendToProvider(target), format: "text" };

  const tried = [];
  for (const url of KNOWN_PROVIDER_ENDPOINTS) {
    if (!url) continue;
    tried.push(url);
    try {
      // Before calling, check whether provider advertises the target/source languages (best-effort)
      const srcOk = await providerSupports(url, source);
      const tgtOk = await providerSupports(url, target);
      // If the provider doesn't advertise either src or tgt, still try (some hosts don't expose /languages)
      // but we prefer providers that claim to support them.
      const payload = { ...payloadBase };
      const out = await callProviderOnce(url, payload);
      return { translated: out, provider: url };
    } catch (err) {
      // try next provider
    }
  }
  throw new Error(`All providers failed (${tried.join(",")})`);
}

// Simple Kapampangan (pam) translator via dictionary (best-effort).
// Loads backend/pam-dict.json if present and does phrase-first replace then word-by-word fallback.
let _pamDict = null;
function loadPamDictOnce() {
  if (_pamDict !== null) return _pamDict;
  try {
    const p = path.join(__dirname, "pam-dict.json");
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf8");
      const j = JSON.parse(raw);
      // Normalize keys -> lower-case
      const norm = {};
      Object.entries(j).forEach(([k, v]) => { norm[String(k).toLowerCase()] = String(v); });
      _pamDict = norm;
    } else {
      _pamDict = {};
    }
  } catch (e) {
    _pamDict = {};
  }
  return _pamDict;
}

function translatePamWithDict(text, source, target) {
  // If neither source nor target is pam, nothing to do
  const srcIsPam = source === "pam";
  const tgtIsPam = target === "pam";
  if (!srcIsPam && !tgtIsPam) return null;

  const dict = loadPamDictOnce();
  if (!Object.keys(dict).length) return null; // no dict available

  // Lowercase text for matching
  const t = String(text || "").toLowerCase().trim();
  // Exact phrase match first
  if (dict[t]) {
    if (tgtIsPam) return dict[t];           // english -> pam (dict maps en->pam or phrase)
    if (srcIsPam) return dict[t] || null;   // pam -> english (if dict contains reverse mapping you should add them)
  }

  // Word-by-word fallback
  const words = t.split(/\s+/);
  const mapped = words.map(w => dict[w] || w);
  const out = mapped.join(" ");
  return out || null;
}

// High-level translation that handles direct, pivot via English, and pam-dict fallback
async function translateSmart(text, source, target) {
  // quick no-op
  if (!text || !String(text).trim()) return "";

  // If either lang is pam, try local dict first (both directions)
  if (source === "pam" || target === "pam") {
    // Try token-level smart translation using local dict and tagaloglang fallback
    try {
      const tokenOut = await smartTranslateTokens(text, source, target);
      if (tokenOut && tokenOut !== text) {
        return { translated: tokenOut, provider: "pam-dict+tagaloglang", mode: "token" };
      }
    } catch {}
    const dictOut = translatePamWithDict(text, source, target);
    if (dictOut) return { translated: dictOut, provider: "pam-dict", mode: "phrase" };
    // else continue to try providers / pivot but most providers won't support pam
  }

  // Try direct via providers
  try {
    const direct = await translateViaProviders(text, source, target);
    return { translated: direct.translated, provider: direct.provider, mode: "direct" };
  } catch (errDirect) {
    // If direct failed, try pivoting via English (en)
    const pivot = "en";
    try {
      // if source already en or target already en, pivot is meaningless
      if (source === pivot || target === pivot) throw errDirect;

      // first source -> en
      const first = await translateViaProviders(text, source, pivot);
      // then en -> target
      const second = await translateViaProviders(first.translated, pivot, target);
      return { translated: second.translated, provider: second.provider, mode: "pivot", pivotedText: first.translated };
    } catch (errPivot) {
      // all failed -> bubble up original or pivot errors
      throw new Error(`Direct and pivot translation failed: ${errDirect.message}; ${errPivot.message}`);
    }
  }
}
// --- /translate route (uses translateSmart) ---
app.post("/translate", async (req, res) => {
  try {
    const { text, target, targets, source } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ ok: false, error: "Empty text" });
    }

    const targetList = Array.isArray(targets) ? targets : (target ? [target] : []);
    if (!targetList.length) {
      return res.status(400).json({ ok: false, error: "No target language(s) specified" });
    }

    const doSingle = async (t) => {
      try {
        const out = await translateSmart(text, source || "auto", t);
        if (typeof out === "string") return { target: t, translated: out, provider: null };
        return { target: t, translated: out.translated || "", provider: out.provider || null, mode: out.mode || null };
      } catch (err) {
        return { target: t, translated: mockTranslate(text, source || "auto", t), _warn: String(err.message) };
      }
    };

    const jobs = targetList.map((t) => doSingle(t));
    const results = await Promise.all(jobs);

    if (results.length === 1) {
      return res.json({
        ok: true,
        translated: results[0].translated,
        target: results[0].target,
        _meta: { provider: results[0].provider || "mock", mode: results[0].mode || null }
      });
    }

    const translations = {};
    results.forEach((r) => (translations[r.target] = r.translated));
    return res.json({ ok: true, translations, _meta: { provider: results.map(r => r.provider).filter(Boolean) } });
  } catch (err) {
    console.error("TRANSLATE ERROR", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});
// Quick dictionary lookup endpoint to show definitions in UI and pre-fill cache
// GET /dict/lookup?term=word
app.get("/dict/lookup", async (req, res) => {
  try {
    const term = String(req.query.term || "").trim();
    if (!term) return res.status(400).json({ ok: false, error: "Empty term" });
    const entry = await fetchTagalogLangEntry(term);
    if (!entry) return res.json({ ok: true, entry: null });
    res.json({ ok: true, entry });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});
// ----------------- end TRANSLATION block -----------------
// ---------- end translation helpers ----------

// --- Views -------------------------------------------------------------------
const VIEWS_FILE = path.join(__dirname, "views.json");
const FEEDBACK_FILE = path.join(__dirname, "feedback.json");
const SONGS_FILE = path.join(__dirname, "songs.json");

// Ensure files exist
if (!fs.existsSync(VIEWS_FILE)) {
  fs.writeFileSync(VIEWS_FILE, JSON.stringify({}));
}
if (!fs.existsSync(FEEDBACK_FILE)) {
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify([]));
}
if (!fs.existsSync(SONGS_FILE)) {
  fs.writeFileSync(SONGS_FILE, JSON.stringify([]));
}

function readViews() {
  try {
    const data = fs.readFileSync(VIEWS_FILE, "utf8");
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

function writeViews(views) {
  fs.writeFileSync(VIEWS_FILE, JSON.stringify(views, null, 2));
}

// Simple in-memory IP recent map to help dedupe short-term (not persistent)
const ipRecent = new Map(); // ip -> { key -> ts }
const IP_DEDUPE_WINDOW_MS = Number(process.env.IP_DEDUPE_WINDOW_MS || 60 * 60 * 1000); // 1h by default

function cleanupIpRecent() {
  const now = Date.now();
  for (const [ip, map] of ipRecent.entries()) {
    for (const [key, ts] of Object.entries(map)) {
      if (now - ts > IP_DEDUPE_WINDOW_MS) delete map[key];
    }
    if (!Object.keys(map).length) ipRecent.delete(ip);
  }
}

// Periodic cleanup
setInterval(cleanupIpRecent, 10 * 60 * 1000);

// GET all views (returns mapping title->count, and also key->count for completeness)
app.get("/api/views", (req, res) => {
  try {
    const data = fs.existsSync(VIEWS_FILE) ? fs.readFileSync(VIEWS_FILE, "utf8") : "{}";
    const views = JSON.parse(data || "{}");
    // Return the raw mapping: { "Atin Cu Pung Singsing": 5, "/chords/..": 2, ... }
    res.json(views);
  } catch (error) {
    console.error("Error reading views:", error);
    res.status(500).json({ error: "Failed to fetch views." });
  }
});


// POST increment
// Expect body: { key: "/chords/...", title: "Human Title" }
// --- API: POST /api/views/increment ----------------------------------------
app.post("/api/views/increment", (req, res) => {
  try {
    // Expect body: { title: "Atin Cu Pung Singsing", key: "/chords/..." }
    const { title, key } = req.body || {};
    const storageKey = title || key;
    if (!storageKey) {
      console.error("No title or key provided in increment request");
      return res.status(400).json({ ok: false, error: "title or key is required." });
    }

    // Read current views (fresh)
    let views = {};
    try {
      const raw = fs.readFileSync(VIEWS_FILE, "utf8");
      views = JSON.parse(raw || "{}");
    } catch (err) {
      // If parse/read fails, start with empty object (and log)
      console.warn("Could not read views.json cleanly, starting fresh:", err && err.message);
      views = {};
    }

    // Ensure integer and increment
    const prev = Number(views[storageKey] || 0);
    const next = prev + 1;
    views[storageKey] = next;

    // Write atomically: write to tmp then rename
    const tmpPath = VIEWS_FILE + ".tmp";
    fs.writeFileSync(tmpPath, JSON.stringify(views, null, 2), "utf8");
    fs.renameSync(tmpPath, VIEWS_FILE);

    console.log(`Incremented views for "${storageKey}" -> ${next}`);

    // Return the authoritative value
    return res.json({ ok: true, title: storageKey, views: next });
  } catch (error) {
    console.error("Error updating views:", error);
    return res.status(500).json({ ok: false, error: "Failed to update views." });
  }
});


// ============================================================================
// 4) FEEDBACK ENDPOINTS
// ============================================================================

// Submit feedback
app.post("/api/feedback/submit", (req, res) => {
  try {
    const { name, email, rating, comment, timestamp } = req.body || {};
    
    if (!name || !email || !comment) {
      return res.status(400).json({ ok: false, error: "Missing required fields" });
    }

    // Read existing feedback
    let feedback = [];
    try {
      const data = fs.readFileSync(FEEDBACK_FILE, "utf8");
      feedback = JSON.parse(data || "[]");
    } catch (e) {
      feedback = [];
    }

    // Add new feedback
    const newFeedback = {
      id: Date.now(),
      name,
      email,
      rating: Number(rating) || 5,
      comment,
      timestamp: timestamp || new Date().toISOString(),
    };

    feedback.push(newFeedback);

    // Write back
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedback, null, 2));

    return res.json({ ok: true, message: "Feedback submitted successfully", feedback: newFeedback });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return res.status(500).json({ ok: false, error: "Failed to submit feedback" });
  }
});

// Get all feedback
app.get("/api/feedback", (req, res) => {
  try {
    const data = fs.existsSync(FEEDBACK_FILE) ? fs.readFileSync(FEEDBACK_FILE, "utf8") : "[]";
    const feedback = JSON.parse(data || "[]");
    return res.json({ ok: true, feedback });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return res.status(500).json({ ok: false, error: "Failed to fetch feedback" });
  }
});

// Delete feedback
app.delete("/api/feedback/:id", (req, res) => {
  try {
    const { id } = req.params;
    
    let feedback = [];
    try {
      const data = fs.readFileSync(FEEDBACK_FILE, "utf8");
      feedback = JSON.parse(data || "[]");
    } catch (e) {
      feedback = [];
    }

    feedback = feedback.filter(f => f.id !== Number(id));
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedback, null, 2));

    return res.json({ ok: true, message: "Feedback deleted successfully" });
  } catch (error) {
    console.error("Error deleting feedback:", error);
    return res.status(500).json({ ok: false, error: "Failed to delete feedback" });
  }
});

// ============================================================================
// 5) SONGS MANAGEMENT ENDPOINTS (Admin)
// ============================================================================

// Get all songs
app.get("/api/songs", (req, res) => {
  try {
    const data = fs.existsSync(SONGS_FILE) ? fs.readFileSync(SONGS_FILE, "utf8") : "[]";
    const songs = JSON.parse(data || "[]");
    return res.json({ ok: true, songs });
  } catch (error) {
    console.error("Error fetching songs:", error);
    return res.status(500).json({ ok: false, error: "Failed to fetch songs" });
  }
});

// Add new song
app.post("/api/songs", (req, res) => {
  try {
    const { title, image, audio, path } = req.body || {};
    
    if (!title) {
      return res.status(400).json({ ok: false, error: "Song title is required" });
    }

    let songs = [];
    try {
      const data = fs.readFileSync(SONGS_FILE, "utf8");
      songs = JSON.parse(data || "[]");
    } catch (e) {
      songs = [];
    }

    const newSong = {
      id: Date.now(),
      title,
      image: image || "",
      audio: audio || "",
      path: path || `/chords/${title.toLowerCase().replace(/\s+/g, "-")}`,
    };

    songs.push(newSong);
    fs.writeFileSync(SONGS_FILE, JSON.stringify(songs, null, 2));

    return res.json({ ok: true, message: "Song added successfully", song: newSong });
  } catch (error) {
    console.error("Error adding song:", error);
    return res.status(500).json({ ok: false, error: "Failed to add song" });
  }
});

// Update song
app.put("/api/songs/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { title, image, audio, path } = req.body || {};

    let songs = [];
    try {
      const data = fs.readFileSync(SONGS_FILE, "utf8");
      songs = JSON.parse(data || "[]");
    } catch (e) {
      songs = [];
    }

    const index = songs.findIndex(s => s.id === Number(id));
    if (index === -1) {
      return res.status(404).json({ ok: false, error: "Song not found" });
    }

    songs[index] = {
      ...songs[index],
      title: title || songs[index].title,
      image: image !== undefined ? image : songs[index].image,
      audio: audio !== undefined ? audio : songs[index].audio,
      path: path !== undefined ? path : songs[index].path,
    };

    fs.writeFileSync(SONGS_FILE, JSON.stringify(songs, null, 2));

    return res.json({ ok: true, message: "Song updated successfully", song: songs[index] });
  } catch (error) {
    console.error("Error updating song:", error);
    return res.status(500).json({ ok: false, error: "Failed to update song" });
  }
});

// Delete song
app.delete("/api/songs/:id", (req, res) => {
  try {
    const { id } = req.params;

    let songs = [];
    try {
      const data = fs.readFileSync(SONGS_FILE, "utf8");
      songs = JSON.parse(data || "[]");
    } catch (e) {
      songs = [];
    }

    songs = songs.filter(s => s.id !== Number(id));
    fs.writeFileSync(SONGS_FILE, JSON.stringify(songs, null, 2));

    return res.json({ ok: true, message: "Song deleted successfully" });
  } catch (error) {
    console.error("Error deleting song:", error);
    return res.status(500).json({ ok: false, error: "Failed to delete song" });
  }
});


// --- Bind -------------------------------------------------------------------
const PORT = Number(process.env.PORT || 8001);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on http://127.0.0.1:${PORT}`);
});
