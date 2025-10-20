import React, { useEffect, useState } from 'react';
import './SuggestionReview.css';

const SuggestionReview = () => {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    // Fetch suggestions from the backend
    fetch('/api/suggestions')
      .then((response) => response.json())
      .then((data) => setSuggestions(data))
      .catch((error) => console.error('Error fetching suggestions:', error));
  }, []);

  const handleApprove = (id) => {
    fetch(`/api/approve/${id}`, { method: 'POST' })
      .then((response) => {
        if (response.ok) {
          setSuggestions((prev) => prev.filter((suggestion) => suggestion.id !== id));
        }
      })
      .catch((error) => console.error('Error approving suggestion:', error));
  };

  const handleReject = (id) => {
    fetch(`/api/reject/${id}`, { method: 'POST' })
      .then((response) => {
        if (response.ok) {
          setSuggestions((prev) => prev.filter((suggestion) => suggestion.id !== id));
        }
      })
      .catch((error) => console.error('Error rejecting suggestion:', error));
  };

  return (
    <div className="suggestion-review">
      <h1>Suggestion Review</h1>
      {suggestions.length === 0 ? (
        <p>No suggestions available.</p>
      ) : (
        <ul>
          {suggestions.map((suggestion) => (
            <li key={suggestion.id}>
              <p>{suggestion.text}</p>
              <button onClick={() => handleApprove(suggestion.id)}>Approve</button>
              <button onClick={() => handleReject(suggestion.id)}>Reject</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SuggestionReview;