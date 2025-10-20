import React, { useState } from 'react';
import './DictionaryManager.css';

const DictionaryManager = () => {
  const [file, setFile] = useState(null);

  const handleExport = () => {
    window.location.href = '/api/export-dictionary';
  };

  const handleImport = () => {
    if (!file) {
      alert('Please select a file to import.');
      return;
    }

    const formData = new FormData();
    formData.append('dictionary', file);

    fetch('/api/import-dictionary', {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.ok) {
          alert('Dictionary imported successfully.');
        } else {
          alert('Failed to import dictionary.');
        }
      })
      .catch((error) => console.error('Error importing dictionary:', error));
  };

  return (
    <div className="dictionary-manager">
      <h3>Dictionary Manager</h3>
      <button onClick={handleExport}>Export Dictionary</button>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
        accept="application/json"
      />
      <button onClick={handleImport}>Import Dictionary</button>
    </div>
  );
};

export default DictionaryManager;