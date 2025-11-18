import React, { useState } from "react";
import axios from "axios";
import "./feedback.css";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "",
  timeout: 8000,
});

export default function Feedback() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    rating: 5,
    comment: "",
  });
  const [submitStatus, setSubmitStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      await api.post("/api/feedback/submit", {
        ...formData,
        timestamp: new Date().toISOString(),
      });
      setSubmitStatus({
        type: "success",
        message: "Thank you for your feedback! Your input helps us improve.",
      });
      setFormData({ name: "", email: "", rating: 5, comment: "" });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setSubmitStatus({
        type: "error",
        message: "Failed to submit feedback. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="feedback-container">
      <div className="feedback-content">
        {/* Overview Section */}
        <section className="overview-section">
          <h1>About Balik Suling</h1>
          <div className="overview-text">
            <p>
              <strong>Balik Suling</strong> is a comprehensive music learning and preservation platform 
              dedicated to Kapampangan folk songs and Filipino traditional music. Our mission is to 
              keep the rich musical heritage of the Philippines alive through modern technology.
            </p>
            <h2>What We Offer:</h2>
            <ul>
              <li><strong>Song Library:</strong> Explore our curated collection of authentic Kapampangan folk songs with audio playback</li>
              <li><strong>Chord Scanner:</strong> Upload sheet music and instantly extract chord progressions using advanced OMR technology</li>
              <li><strong>Music Transcription:</strong> Convert audio files into sheet music for learning and analysis</li>
              <li><strong>Interactive Tutorials:</strong> Learn chords, techniques, and traditional playing styles</li>
              <li><strong>Multi-language Support:</strong> Access content in English, Tagalog, and Kapampangan</li>
              <li><strong>Translation Tools:</strong> Translate song lyrics and preserve linguistic heritage</li>
            </ul>
            <p>
              Whether you're a musician, educator, or culture enthusiast, Balik Suling provides the 
              tools you need to learn, teach, and preserve traditional Filipino music for future generations.
            </p>
          </div>
        </section>

        {/* Feedback Form Section */}
        <section className="feedback-form-section">
          <h2>We Value Your Feedback</h2>
          <p className="feedback-subtitle">
            Help us improve! Share your experience, suggestions, or report any issues you've encountered.
          </p>

          <form onSubmit={handleSubmit} className="feedback-form">
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="rating">Overall Rating</label>
              <select
                id="rating"
                name="rating"
                value={formData.rating}
                onChange={handleChange}
                required
              >
                <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                <option value="4">⭐⭐⭐⭐ Very Good</option>
                <option value="3">⭐⭐⭐ Good</option>
                <option value="2">⭐⭐ Fair</option>
                <option value="1">⭐ Needs Improvement</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="comment">Your Feedback</label>
              <textarea
                id="comment"
                name="comment"
                value={formData.comment}
                onChange={handleChange}
                placeholder="Share your thoughts about the system functionality, features you'd like to see, bugs you've found, or any suggestions for improvement..."
                rows="8"
                required
              />
              <span className="char-count">{formData.comment.length} characters</span>
            </div>

            {submitStatus && (
              <div className={`status-message ${submitStatus.type}`}>
                {submitStatus.message}
              </div>
            )}

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
