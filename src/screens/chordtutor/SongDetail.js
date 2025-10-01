import React from "react";
import { useParams } from "react-router-dom";

export default function SongDetail() {
  const { songId } = useParams(); // this will get "atin-cu-pung-singsing" from the URL

  return (
    <div className="screen-container">
      <h2 style={{ color: 'white', fontSize: '24px' }}>{decodeURIComponent(songId).replace(/-/g, ' ')}</h2>
      <pre style={{ color: 'white', fontSize: '16px', marginTop: '20px' }}>
        {/* Later we will show lyrics and chords here */}
        (Lyrics and chords will appear here.)
      </pre>
    </div>
  );
}
