import React, { useState, useEffect } from "react";
import axios from "axios";
import { songs } from "../feed/index";
import "./admin.css";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "",
  timeout: 8000,
});

// Dummy admin credentials
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "baliksuling2025";

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [activeTab, setActiveTab] = useState("songs"); // 'songs' or 'feedback'
  const [songList, setSongList] = useState([...songs]);
  const [feedbackList, setFeedbackList] = useState([]);
  
  const [editingSong, setEditingSong] = useState(null);
  const [songForm, setSongForm] = useState({
    title: "",
    image: "",
    audio: "",
    path: "",
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchFeedback();
    }
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Invalid credentials. Please try again.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
  };

  const fetchFeedback = async () => {
    try {
      const response = await api.get("/api/feedback");
      setFeedbackList(response.data.feedback || []);
    } catch (error) {
      console.error("Error fetching feedback:", error);
    }
  };

  const handleAddSong = () => {
    setEditingSong(null);
    setSongForm({ title: "", image: "", audio: "", path: "" });
    document.getElementById("songModal").style.display = "block";
  };

  const handleEditSong = (song, index) => {
    setEditingSong(index);
    setSongForm({ ...song });
    document.getElementById("songModal").style.display = "block";
  };

  const handleDeleteSong = (index) => {
    if (window.confirm("Are you sure you want to delete this song?")) {
      const updated = songList.filter((_, i) => i !== index);
      setSongList(updated);
      // In a real app, you'd call: await api.delete(`/api/songs/${song.id}`);
    }
  };

  const handleSaveSong = () => {
    if (editingSong !== null) {
      // Update existing song
      const updated = [...songList];
      updated[editingSong] = songForm;
      setSongList(updated);
      // In real app: await api.put(`/api/songs/${song.id}`, songForm);
    } else {
      // Add new song
      setSongList([...songList, songForm]);
      // In real app: await api.post('/api/songs', songForm);
    }
    closeModal();
  };

  const closeModal = () => {
    document.getElementById("songModal").style.display = "none";
    setSongForm({ title: "", image: "", audio: "", path: "" });
    setEditingSong(null);
  };

  const handleDeleteFeedback = (index) => {
    if (window.confirm("Are you sure you want to delete this feedback?")) {
      const updated = feedbackList.filter((_, i) => i !== index);
      setFeedbackList(updated);
      // In real app: await api.delete(`/api/feedback/${feedback.id}`);
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="admin-container">
        <div className="admin-login-card">
          <h1>Admin Panel</h1>
          <p className="admin-subtitle">Login to access the admin dashboard</p>
          
          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            {loginError && <div className="login-error">{loginError}</div>}

            <button type="submit" className="btn-login">Login</button>
          </form>

          {/* <div className="admin-demo-credentials">
            <p><strong>Demo Credentials:</strong></p>
            <p>Username: admin</p>
            <p>Password: baliksuling2025</p>
          </div> */}
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="admin-container">
      <div className="admin-content">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>

        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === "songs" ? "active" : ""}`}
            onClick={() => setActiveTab("songs")}
          >
            Manage Songs
          </button>
          <button
            className={`tab-btn ${activeTab === "feedback" ? "active" : ""}`}
            onClick={() => setActiveTab("feedback")}
          >
            User Feedback
          </button>
        </div>

        {activeTab === "songs" && (
          <div className="admin-section">
            <div className="section-header">
              <h2>Song Management</h2>
              <button onClick={handleAddSong} className="btn-add">+ Add New Song</button>
            </div>

            <div className="songs-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Path</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {songList.map((song, index) => (
                    <tr key={index}>
                      <td>
                        <div className="song-cell">
                          {song.image && (
                            <img src={song.image} alt={song.title} className="song-thumb" />
                          )}
                          <span>{song.title}</span>
                        </div>
                      </td>
                      <td>{song.path}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleEditSong(song, index)}
                            className="btn-edit"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSong(index)}
                            className="btn-delete"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="admin-section">
            <div className="section-header">
              <h2>User Feedback</h2>
              <button onClick={fetchFeedback} className="btn-refresh">🔄 Refresh</button>
            </div>

            {feedbackList.length === 0 ? (
              <div className="empty-state">
                <p>No feedback received yet.</p>
              </div>
            ) : (
              <div className="feedback-list">
                {feedbackList.map((feedback, index) => (
                  <div key={index} className="feedback-card">
                    <div className="feedback-header">
                      <div>
                        <h3>{feedback.name}</h3>
                        <p className="feedback-email">{feedback.email}</p>
                      </div>
                      <div className="feedback-meta">
                        <span className="feedback-rating">
                          {"⭐".repeat(Number(feedback.rating))}
                        </span>
                        <button
                          onClick={() => handleDeleteFeedback(index)}
                          className="btn-delete-small"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className="feedback-body">
                      <p>{feedback.comment}</p>
                    </div>
                    <div className="feedback-footer">
                      <span className="feedback-date">
                        {feedback.timestamp ? new Date(feedback.timestamp).toLocaleString() : "N/A"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Song Modal */}
      <div id="songModal" className="modal">
        <div className="modal-content">
          <div className="modal-header">
            <h2>{editingSong !== null ? "Edit Song" : "Add New Song"}</h2>
            <button onClick={closeModal} className="modal-close">×</button>
          </div>
          
          <div className="modal-body">
            <div className="form-group">
              <label>Song Title</label>
              <input
                type="text"
                value={songForm.title}
                onChange={(e) => setSongForm({ ...songForm, title: e.target.value })}
                placeholder="e.g., Atin Cu Pung Singsing"
              />
            </div>

            <div className="form-group">
              <label>Image URL</label>
              <input
                type="text"
                value={songForm.image}
                onChange={(e) => setSongForm({ ...songForm, image: e.target.value })}
                placeholder="e.g., /path/to/image.jpg"
              />
            </div>

            <div className="form-group">
              <label>Audio URL</label>
              <input
                type="text"
                value={songForm.audio}
                onChange={(e) => setSongForm({ ...songForm, audio: e.target.value })}
                placeholder="e.g., /path/to/audio.mp3"
              />
            </div>

            <div className="form-group">
              <label>Detail Path</label>
              <input
                type="text"
                value={songForm.path}
                onChange={(e) => setSongForm({ ...songForm, path: e.target.value })}
                placeholder="e.g., /chords/song-name"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button onClick={handleSaveSong} className="btn-save">Save</button>
            <button onClick={closeModal} className="btn-cancel">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
