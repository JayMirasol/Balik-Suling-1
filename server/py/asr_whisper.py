# Transcribe audio with faster-whisper and print {"text": "..."} to stdout
# pip install faster-whisper soundfile
import sys, json
from faster_whisper import WhisperModel

if len(sys.argv) < 2:
    print(json.dumps({"text": ""}))
    sys.exit(0)

audio_path = sys.argv[1]

# Choose a small model for CPU; set env WHISPER_MODEL to change
model_size = "small"
model = WhisperModel(model_size, device="cpu", compute_type="int8")

segments, info = model.transcribe(audio_path, vad_filter=True)
text = "".join([seg.text for seg in segments]).strip()

print(json.dumps({"text": text}))
