import React, { useState } from 'react';
import './LanguageDetector.css';

const LanguageDetector = () => {
  const [text, setText] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState(null);

  const handleDetectLanguage = () => {
    if (!text) {
      alert('Please enter some text.');
      return;
    }

    fetch('/api/detect-language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.ok) {
          setDetectedLanguage(data.language);
        } else {
          alert('Failed to detect language.');
        }
      })
      .catch((error) => console.error('Error detecting language:', error));
  };

  return (
    <div className="language-detector">
      <h3>Language Detector</h3>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to detect language"
      ></textarea>
      <button onClick={handleDetectLanguage}>Detect Language</button>
      {detectedLanguage && <p>Detected Language: {detectedLanguage}</p>}
    </div>
  );
};

export default LanguageDetector;