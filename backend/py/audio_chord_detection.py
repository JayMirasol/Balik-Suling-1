#!/usr/bin/env python3
"""
Audio Chord Detection Script
Analyzes an audio file and outputs detected chords with timestamps.
Uses librosa for audio analysis and basic chord recognition.
"""

import sys
import json
import warnings
warnings.filterwarnings('ignore')

try:
    import librosa
    import numpy as np
except ImportError:
    print(json.dumps({
        "ok": False,
        "error": "Required libraries not installed. Run: pip install librosa numpy"
    }))
    sys.exit(1)


def detect_chords(audio_path, hop_length=2048):
    """
    Detect chords from audio file.
    Returns list of chord segments with timestamps.
    """
    try:
        # Load audio
        y, sr = librosa.load(audio_path, sr=22050)
        
        # Extract chroma features using STFT (more reliable than CQT for this purpose)
        chroma = librosa.feature.chroma_stft(y=y, sr=sr, hop_length=hop_length)
        
        # Aggregate chroma into time segments (every 2 seconds)
        segment_duration = 2.0  # seconds
        frames_per_segment = int(segment_duration * sr / hop_length)
        
        if frames_per_segment == 0:
            frames_per_segment = 1
        
        chords = []
        chord_templates = get_chord_templates()
        
        for i in range(0, chroma.shape[1], frames_per_segment):
            end_frame = min(i + frames_per_segment, chroma.shape[1])
            segment_chroma = chroma[:, i:end_frame].mean(axis=1)
            
            # Normalize with better handling
            chroma_sum = segment_chroma.sum()
            if chroma_sum > 0:
                segment_chroma = segment_chroma / chroma_sum
            else:
                # Skip silent segments
                continue
            
            # Find best matching chord
            best_chord, confidence = find_best_chord(segment_chroma, chord_templates)
            
            timestamp = i * hop_length / sr
            chords.append({
                "time": round(timestamp, 2),
                "chord": best_chord,
                "duration": segment_duration,
                "confidence": round(confidence, 3)
            })
        
        # Filter out "N.C." if there are enough actual chords
        actual_chords = [c for c in chords if c["chord"] != "N.C."]
        if len(actual_chords) > len(chords) * 0.3:  # If >30% are real chords
            chords = actual_chords
        
        # Get progression (unique sequence, excluding consecutive duplicates)
        progression = []
        prev_chord = None
        for c in chords:
            if c["chord"] != prev_chord and c["chord"] != "N.C.":
                progression.append(c["chord"])
                prev_chord = c["chord"]
        
        return {
            "ok": True,
            "chords": chords,
            "progression": " | ".join(progression) if progression else "N.C.",
            "summary": {
                "total_segments": len(chords),
                "unique_chords": len(set(c["chord"] for c in chords if c["chord"] != "N.C.")),
                "duration": round(len(y) / sr, 2)
            }
        }
        
    except Exception as e:
        return {
            "ok": False,
            "error": f"Chord detection failed: {str(e)}"
        }


def get_chord_templates():
    """
    Define basic chord templates (12-dimensional chroma vectors).
    Returns dict of chord_name -> template.
    """
    # Major chords (root, major third, perfect fifth)
    # Weighted to emphasize important notes
    major_template = np.array([1.0, 0, 0, 0, 0.8, 0, 0, 0.8, 0, 0, 0, 0])
    
    # Minor chords (root, minor third, perfect fifth)
    minor_template = np.array([1.0, 0, 0, 0.8, 0, 0, 0, 0.8, 0, 0, 0, 0])
    
    # Dominant 7th (root, major third, perfect fifth, minor seventh)
    dom7_template = np.array([1.0, 0, 0, 0, 0.7, 0, 0, 0.7, 0, 0, 0.6, 0])
    
    # Major 7th (root, major third, perfect fifth, major seventh)
    maj7_template = np.array([1.0, 0, 0, 0, 0.7, 0, 0, 0.7, 0, 0, 0, 0.6])
    
    # Minor 7th (root, minor third, perfect fifth, minor seventh)
    min7_template = np.array([1.0, 0, 0, 0.7, 0, 0, 0, 0.7, 0, 0, 0.6, 0])
    
    # Suspended 4th (root, perfect fourth, perfect fifth)
    sus4_template = np.array([1.0, 0, 0, 0, 0, 0.8, 0, 0.8, 0, 0, 0, 0])
    
    # Suspended 2nd (root, major second, perfect fifth)
    sus2_template = np.array([1.0, 0, 0.8, 0, 0, 0, 0, 0.8, 0, 0, 0, 0])
    
    # Diminished (root, minor third, diminished fifth)
    dim_template = np.array([1.0, 0, 0, 0.8, 0, 0, 0.8, 0, 0, 0, 0, 0])
    
    # Augmented (root, major third, augmented fifth)
    aug_template = np.array([1.0, 0, 0, 0, 0.8, 0, 0, 0, 0.8, 0, 0, 0])
    
    notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    
    templates = {}
    
    # Generate all transpositions for each chord type
    for i, root in enumerate(notes):
        # Major (highest priority)
        templates[root] = np.roll(major_template, i)
        # Minor
        templates[f"{root}m"] = np.roll(minor_template, i)
        # Dominant 7th
        templates[f"{root}7"] = np.roll(dom7_template, i)
        # Major 7th
        templates[f"{root}maj7"] = np.roll(maj7_template, i)
        # Minor 7th
        templates[f"{root}m7"] = np.roll(min7_template, i)
        # Suspended 4th
        templates[f"{root}sus4"] = np.roll(sus4_template, i)
        # Suspended 2nd
        templates[f"{root}sus2"] = np.roll(sus2_template, i)
        # Diminished
        templates[f"{root}dim"] = np.roll(dim_template, i)
        # Augmented
        templates[f"{root}aug"] = np.roll(aug_template, i)
    
    return templates


def find_best_chord(chroma, templates):
    """
    Find best matching chord template using correlation.
    Returns tuple of (chord_name, confidence_score)
    """
    best_score = -1
    best_chord = "N.C."  # No chord
    
    for chord_name, template in templates.items():
        # Normalize template
        template_norm = template.copy()
        if template_norm.sum() > 0:
            template_norm = template_norm / template_norm.sum()
        
        # Correlation score
        score = np.dot(chroma, template_norm)
        
        if score > best_score:
            best_score = score
            best_chord = chord_name
    
    # Lower threshold for better detection (was 0.3, now 0.15)
    if best_score < 0.15:
        return "N.C.", best_score
    
    return best_chord, best_score


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "ok": False,
            "error": "Usage: python audio_chord_detection.py <audio_file>"
        }))
        sys.exit(1)
    
    audio_file = sys.argv[1]
    result = detect_chords(audio_file)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
