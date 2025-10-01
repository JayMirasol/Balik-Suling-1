# Convert audio to MIDI using Basic Pitch
# pip install basic-pitch librosa numpy soundfile
import sys, os
from basic_pitch.inference import predict
from basic_pitch import ICASSP_2022_MODEL_PATH
import soundfile as sf
import numpy as np

if len(sys.argv) < 3:
    print("Usage: basic_pitch_transcribe.py <input_audio> <output_midi>", file=sys.stderr)
    sys.exit(1)

audio_path = sys.argv[1]
out_midi_path = sys.argv[2]

# Load audio (Basic Pitch expects 22.05k or 44.1k; it will resample internally)
audio, sr = sf.read(audio_path, dtype="float32", always_2d=False)
if audio.ndim > 1:
    audio = np.mean(audio, axis=1)

# Run model
model_output, midi_data, note_events = predict(
    audio,
    sr,
    model_or_model_path=ICASSP_2022_MODEL_PATH,
    onset_threshold=0.5,
    frame_threshold=0.3,
    minimum_note_length=11,  # tune as desired
)

# Save MIDI
midi_data.write(out_midi_path)
print("ok")
