import React, { useState } from "react";
import axios from "axios";

export default function Translate() {
  const [text, setText] = useState("");
  const [to, setTo] = useState("en"); // "en", "fil", "pam" (Kapampangan)
  const [out, setOut] = useState("");

  const run = async () => {
    const { data } = await axios.post("http://localhost:8001/translate", {
      text, target: to
    });
    setOut(data.translated);
  };

  return (
    <div className="screen-container">
      <h2>Translate</h2>
      <select value={to} onChange={e=>setTo(e.target.value)}>
        <option value="pam">Kapampangan</option>
        <option value="fil">Filipino</option>
        <option value="en">English</option>
      </select>
      <textarea rows={6} value={text} onChange={e=>setText(e.target.value)} placeholder="Enter lyrics or text..." />
      <button onClick={run} disabled={!text.trim()}>Translate</button>
      {out && <div className="result">{out}</div>}
    </div>
  );
}
