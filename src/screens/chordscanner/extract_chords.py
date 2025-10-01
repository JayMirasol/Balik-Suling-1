from flask import Flask, request, jsonify
import librosa
import numpy as np

app = Flask(__name__)

@app.route('/analyze', methods=['POST'])
def analyze_audio():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    try:
        # Load the audio file
        y, sr = librosa.load(file, sr=None)
        
        # Extract chord progression (placeholder logic)
        # You can integrate advanced chord estimation here
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        chords = np.argmax(chroma, axis=0)

        # Map chord indices to actual chord names (example)
        chord_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
        detected_chords = [chord_names[idx % 12] for idx in chords]

        return jsonify({"chords": detected_chords})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
