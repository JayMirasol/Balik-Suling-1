/* Minimal Express API for Audio → (MIDI, MusicXML)
   - Validates Kapampangan via language detection on ASR transcript
   - Transcribes music to MIDI (Basic Pitch, Python)
   - Converts MIDI → MusicXML (music21, Python)

   Run:
     npm i express multer cors franc nanoid
     # also ensure Python deps (see below)
     node server/index.js
*/
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { franc } = require("franc");
const { customAlphabet } = require("nanoid");

const app = express();
app.use(cors());

const nanoid = customAlphabet("1234567890abcdef", 10);
const UPLOADS = path.join(__dirname, "uploads");
const OUTPUTS = path.join(__dirname, "outputs");

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
if (!fs.existsSync(OUTPUTS)) fs.mkdirSync(OUTPUTS, { recursive: true });

// serve outputs
app.use("/outputs", express.static(OUTPUTS, { fallthrough: true }));

const upload = multer({
  dest: UPLOADS,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

function runPy(script, args = []) {
  return new Promise((resolve, reject) => {
    const py = spawn(process.env.PYTHON || "python3", [path.join(__dirname, script), ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    py.stdout.on("data", (d) => (out += d.toString()));
    py.stderr.on("data", (d) => (err += d.toString()));
    py.on("close", (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(err || `Python exited with code ${code}`));
    });
  });
}

app.post("/api/convert-audio", upload.single("audio"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ message: "No audio file uploaded." });

  const id = nanoid();
  const inputPath = file.path; // tmp path by multer
  const baseOut = path.join(OUTPUTS, id);
  const outDir = baseOut; // one folder per job or just prefix by id
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  try {
    // 1) ASR to get transcript for language validation
    const asrJson = await runPy("py/asr_whisper.py", [inputPath]);
    const { text } = JSON.parse(asrJson || "{}");

    if (!text || text.length < 4) {
      // fallback: reject if we can't get meaningful text
      return res.status(400).json({
        kapampangan: false,
        message:
          "Could not extract lyrics/speech reliably. Only Kapampangan songs are accepted.",
      });
    }

    // 2) Language detect on transcript (expect ISO 639-3 'pam' for Kapampangan)
    const lang = franc(text, { minLength: 3 }); // returns e.g., 'eng', 'spa', 'pam'
    if (lang !== "pam") {
      return res.status(400).json({
        kapampangan: false,
        message: "Rejected: Not detected as a Kapampangan (pam) song.",
      });
    }

    // 3) Polyphonic transcription → MIDI (Basic Pitch)
    const midiPath = path.join(outDir, `${id}.mid`);
    await runPy("py/basic_pitch_transcribe.py", [inputPath, midiPath]);

    // 4) MIDI → MusicXML (music21)
    const musicxmlPath = path.join(outDir, `${id}.musicxml`);
    await runPy("py/midi_to_musicxml.py", [midiPath, musicxmlPath]);

    // (Optional) MusicXML → PDF, if you set up a renderer (e.g., MuseScore CLI or lilypond).
    // Keep it disabled by default.
    let pdfUrl = null;

    const midiUrl = `/outputs/${id}.mid`;
    const musicxmlUrl = `/outputs/${id}.musicxml`;
    return res.json({
      kapampangan: true,
      midiUrl,
      musicxmlUrl,
      pdfUrl,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Server error while converting audio.",
      error: String(err),
    });
  } finally {
    // optional: clean old uploads
    try {
      fs.unlinkSync(inputPath);
    } catch {}
  }
});

const PORT = process.env.PORT || 5055;
app.listen(PORT, () => {
  console.log(`Audio → Sheet API listening on http://localhost:${PORT}`);
});
