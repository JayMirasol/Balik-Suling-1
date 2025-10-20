import React, { useState } from 'react';
import './TranslationFeedback.css';

const TranslationFeedback = ({ translationId }) => {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) {
      alert('Please select a rating before submitting.');
      return;
    }

    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ translationId, rating }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.ok) {
          setSubmitted(true);
        } else {
          alert('Failed to submit feedback.');
        }
      })
      .catch((error) => console.error('Error submitting feedback:', error));
  };

  return (
    <div className="translation-feedback">
      <h3>Rate this Translation</h3>
      {submitted ? (
        <p>Thank you for your feedback!</p>
      ) : (
        <div>
          <div className="rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={star <= rating ? 'selected' : ''}
                onClick={() => setRating(star)}
              >
                ★
              </span>
            ))}
          </div>
          <button onClick={handleSubmit}>Submit</button>
        </div>
      )}
    </div>
  );
};

export default TranslationFeedback;