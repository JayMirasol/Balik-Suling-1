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

    // Build Audiveris command
    let cmd, cmdArgs, useShell = false;
    if (/\.jar$/i.test(AUDIVERIS)) {
      const jarDir = path.dirname(AUDIVERIS);
      const sep = process.platform === "win32" ? ";" : ":";
      const cp = path.join(jarDir, "lib", "*") + sep + AUDIVERIS;
      cmd = "java";
      cmdArgs = ["-cp", cp, "Audiveris", "-batch", "-export", "-output", jobDir, req.file.path];
    } else {
      cmd = AUDIVERIS; // .exe/.bat/.cmd
      cmdArgs = ["-batch", "-export", "-output", jobDir, req.file.path];
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
    const musicxmlPath = mostRecent(candidates);
    if (!musicxmlPath) {
      return res.json({
        ok: false,
        error: "Could not extract notation (not a valid score, or OMR didn’t detect staves/notes). Try ~300–400 dpi.",
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
    for (const m of measures) {
      const measureNo = Number(m?.number || 0);
      const notes = vArray(m?.note).filter((n) => !("rest" in n));
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
    if (!anyChord) {
      return res.json({
        ok: false,
        error: "Could not recognize chord content. Use a printed, straight page at ~300–400 dpi (no handwriting).",
        chords,
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

// --- Bind -------------------------------------------------------------------
const PORT = Number(process.env.PORT || 8001);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on http://127.0.0.1:${PORT}`);
});
