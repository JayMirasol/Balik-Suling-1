# Convert MIDI -> MusicXML using music21
# pip install music21
import sys
from music21 import converter

if len(sys.argv) < 3:
    print("Usage: midi_to_musicxml.py <input_midi> <output_musicxml>", file=sys.stderr)
    sys.exit(1)

midi_path = sys.argv[1]
xml_path = sys.argv[2]

score = converter.parse(midi_path)
score.write('musicxml', fp=xml_path)
print("ok")
