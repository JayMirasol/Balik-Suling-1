# Audio Chord Detection Setup Guide

## Overview
The audio chord detection feature analyzes audio files (MP3, WAV, M4A, FLAC, OGG, AAC) and detects guitar chords with timestamps.

## Prerequisites

### Python Environment
The chord detection uses a Python script that requires:
- Python 3.8 or higher
- librosa (audio analysis)
- numpy (numerical computing)

## Installation Steps

### 1. Install Python Dependencies

The required libraries are already listed in `backend/requirements.txt`. Install them:

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt
```

Or install just the required packages for chord detection:

```bash
pip install librosa numpy
```

### 2. Configure Python Executable (Optional)

If you're using a virtual environment or non-standard Python installation, set the Python executable path in your `.env` file:

```
PYTHON_EXECUTABLE=python
# Or for specific path:
# PYTHON_EXECUTABLE=C:\path\to\python.exe
# PYTHON_EXECUTABLE=/path/to/venv/bin/python
```

### 3. Verify Installation

Test the chord detection script directly:

```bash
# Test with a sample audio file
python py/audio_chord_detection.py path/to/your/audio.mp3
```

Expected output:
```json
{
  "ok": true,
  "chords": [
    {"time": 0.0, "chord": "C", "duration": 2.0},
    {"time": 2.0, "chord": "G", "duration": 2.0},
    ...
  ],
  "progression": "C | G | Am | F",
  "summary": {
    "total_segments": 30,
    "unique_chords": 8,
    "duration": 60.5
  }
}
```

## How It Works

### Backend (`/audio/chords` endpoint)
1. Accepts audio file upload via multipart/form-data
2. Validates file type (audio formats only)
3. Calls Python script `py/audio_chord_detection.py`
4. Returns detected chords with timestamps and progression

### Python Script (`py/audio_chord_detection.py`)
1. Loads audio using librosa
2. Extracts chroma features (CQT - Constant-Q Transform)
3. Segments audio into 2-second windows
4. Matches each segment against chord templates
5. Outputs JSON with chord timeline

### Chord Detection Algorithm
- **Chroma Features**: 12-dimensional pitch class profiles
- **Chord Templates**: Predefined patterns for major, minor, 7th, maj7, m7
- **Template Matching**: Correlation-based scoring
- **Threshold**: 0.3 minimum score (below = "N.C." - No Chord)

## Supported Chord Types

The current implementation detects:
- **Major** (C, D, E, F, G, A, B, etc.)
- **Minor** (Cm, Dm, Em, etc.)
- **Dominant 7th** (C7, G7, etc.)
- **Major 7th** (Cmaj7, Gmaj7, etc.)
- **Minor 7th** (Cm7, Am7, etc.)
- **No Chord** (N.C.) - for silent sections

## Usage Tips

### Best Results
✅ **Clear recordings** - studio quality preferred
✅ **Instrumental tracks** - vocals can interfere with detection
✅ **Good signal-to-noise ratio** - minimize background noise
✅ **Standard tuning** - A440 reference
✅ **Supported formats**: MP3, WAV, M4A, FLAC, OGG, AAC

### Limitations
⚠️ **Complex chords** may be simplified (e.g., C9 → C)
⚠️ **Polyphonic music** (multiple instruments) can be challenging
⚠️ **Very fast chord changes** may be missed (< 2 seconds)
⚠️ **Microtonal music** or non-Western scales not supported
⚠️ **Heavy distortion** reduces accuracy

## Troubleshooting

### "Required libraries not installed"
- Run: `pip install librosa numpy`
- Verify: `python -c "import librosa; print('OK')"`

### "Chord detection script not found"
- Verify `backend/py/audio_chord_detection.py` exists
- Check file permissions (should be readable)

### "Chord detection failed (exit code 1)"
- Check Python is in PATH: `python --version`
- Try setting PYTHON_EXECUTABLE in `.env`
- Check stderr output in server logs

### Poor accuracy
- Try with instrumental-only tracks
- Use studio recordings instead of live performances
- Ensure audio is in standard tuning (A440)
- Reduce background noise and reverb

## Advanced Configuration

### Adjust Segment Duration
Edit `py/audio_chord_detection.py`:

```python
segment_duration = 2.0  # seconds (default)
# Change to 1.0 for faster chord changes
# Change to 4.0 for slower, more stable detection
```

### Adjust Detection Threshold
Edit `py/audio_chord_detection.py`:

```python
if best_score < 0.3:  # default threshold
    return "N.C."
# Increase (e.g., 0.5) for stricter detection
# Decrease (e.g., 0.2) for more permissive detection
```

### Add More Chord Types
Extend the `get_chord_templates()` function with:
- Suspended chords (sus2, sus4)
- Augmented/Diminished
- Extended chords (9th, 11th, 13th)
- Altered chords (b5, #5, etc.)

## Example Output

### Frontend Display
```
🎵 Audio File: mysong.mp3
Size: 4.2 MB
Duration: 180.5s
Unique Chords: 12

Detected Guitar Chords:
┌──────────────────────────────┐
│ 0.0s: C (2.0s)              │
│ 2.0s: G (2.0s)              │
│ 4.0s: Am (2.0s)             │
│ 6.0s: F (2.0s)              │
└──────────────────────────────┘

Progression: C | G | Am | F | C | G | C
```

## Performance Notes

- **Processing time**: ~5-15 seconds per minute of audio (CPU-dependent)
- **Memory usage**: ~200-500 MB during processing
- **File size limit**: 50 MB (configurable in server.js)
- **Concurrent requests**: Limited by server capacity

## Future Enhancements

Planned improvements:
- [ ] Real-time chord detection (streaming)
- [ ] Advanced chord types (9th, 11th, 13th, altered)
- [ ] Beat-aligned chord changes (tempo-aware)
- [ ] Chord confidence scores
- [ ] Alternative chord suggestions
- [ ] MIDI export of detected chords
- [ ] Capo detection and transposition
