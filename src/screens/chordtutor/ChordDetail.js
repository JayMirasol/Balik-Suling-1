import React from "react";
import { useParams } from "react-router-dom";
import "./Chords.css";

const songData = {
  "atin-cu-pung-singsing": {
    title: "Atin Cu Pung Singsing",
    chords: "C - G - Am - F",
    lyrics: `
[Verse 1]
C       G       Am       F
Atin cu pung singsing
C       G       Am       F
Metung yang timpalan
C       G       Am       F
King indu cu'ng ibat king kapan
C       G       C
Ming ku ping pamagsadyan...
`
  },
  "kapampangan-ku": {
    title: "Kapampangan Ku",
    chords: "G - D - Em - C",
    lyrics: `
[Chorus]
G       D       Em       C
Kapampangan ku, atin kung dangal
G       D       C
King yatu keng kabalen ku...
`
  },
  // Add more songs here!
};

export default function ChordDetail() {
  const { songSlug } = useParams();
  const song = songData[songSlug];

  if (!song) {
    return <div className="screen-container chords-container">Song not found</div>;
  }

  return (
    <div className="screen-container chords-container">
      <h1 className="chords-title">{song.title}</h1>
      <p className="song-chords">Chords: {song.chords}</p>
      <pre className="song-lyrics">{song.lyrics}</pre>
    </div>
  );
}
