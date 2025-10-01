import React, { useState } from "react";
import axios from "axios";

export default function BeginnerChords() {
  const [xml, setXml] = useState("");
  const [out, setOut] = useState(null);

  const run = async () => {
    const { data } = await axios.post("http://localhost:8001/chords/simplify", { musicxml: xml });
    setOut(data);
  };

  return (
    <div className="screen-container">
      <h2>Chords (Beginner Simplify)</h2>
      <textarea rows={12} value={xml} onChange={e=>setXml(e.target.value)} placeholder="Paste MusicXML here..." />
      <button onClick={run} disabled={!xml.trim()}>Simplify</button>
      {out?.ok && <pre>{JSON.stringify(out.chords, null, 2)}</pre>}
      {out?.error && <div className="error">{String(out.error)}</div>}
    </div>
  );
}
