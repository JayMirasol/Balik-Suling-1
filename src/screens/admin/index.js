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
  
  // Notification state
  const [notification, setNotification] = useState({
    show: false,
    type: "", // 'success', 'error', 'info'
    message: ""
  });
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null
  });

  const showNotification = (type, message, duration = 3000) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: "", message: "" });
    }, duration);
  };
  
  const showConfirmModal = (title, message, onConfirm) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  };
  
  const closeConfirmModal = () => {
    setConfirmModal({ show: false, title: "", message: "", onConfirm: null });
  };

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
    const song = songList[index];
    showConfirmModal(
      "Delete Song",
      `Are you sure you want to delete "${song.title}"? This action cannot be undone.`,
      async () => {
        try {
          const updated = songList.filter((_, i) => i !== index);
          setSongList(updated);
          // In a real app, you'd call: await api.delete(`/api/songs/${song.id}`);
          showNotification("success", "Song deleted successfully!");
        } catch (error) {
          console.error("Error deleting song:", error);
          showNotification("error", "Failed to delete song. Please try again.");
        }
        closeConfirmModal();
      }
    );
  };

  const handleSaveSong = () => {
    if (editingSong !== null) {
      // Update existing song
      const updated = [...songList];
      updated[editingSong] = songForm;
      setSongList(updated);
      // In real app: await api.put(`/api/songs/${song.id}`, songForm);
      showNotification("success", "Song updated successfully!");
    } else {
      // Add new song
      setSongList([...songList, songForm]);
      // In real app: await api.post('/api/songs', songForm);
      showNotification("success", "Song added successfully!");
    }
    closeModal();
  };

  const closeModal = () => {
    document.getElementById("songModal").style.display = "none";
    setSongForm({ title: "", image: "", audio: "", path: "" });
    setEditingSong(null);
  };

  const handleDeleteFeedback = (index) => {
    const feedback = feedbackList[index];
    showConfirmModal(
      "Delete Feedback",
      `Are you sure you want to delete feedback from "${feedback.name}"? This action cannot be undone.`,
      async () => {
        try {
          // Delete from backend
          await api.delete(`/api/feedback/${feedback.id}`);
          
          // Update local state
          const updated = feedbackList.filter((_, i) => i !== index);
          setFeedbackList(updated);
          
          // Show success notification
          showNotification("success", "Feedback deleted successfully!");
        } catch (error) {
          console.error("Error deleting feedback:", error);
          showNotification("error", "Failed to delete feedback. Please try again.");
        }
        closeConfirmModal();
      }
    );
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

      {/* Notification Toast */}
      {notification.show && (
        <div className={`notification-toast ${notification.type}`}>
          <div className="notification-content">
            <span className="notification-icon">
              {notification.type === "success" && "✓"}
              {notification.type === "error" && "✕"}
              {notification.type === "info" && "ℹ"}
            </span>
            <span className="notification-message">{notification.message}</span>
          </div>
          <button 
            className="notification-close" 
            onClick={() => setNotification({ show: false, type: "", message: "" })}
          >
            ×
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="confirm-modal-overlay" onClick={closeConfirmModal}>
          <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h3>{confirmModal.title}</h3>
            </div>
            <div className="confirm-modal-body">
              <p>{confirmModal.message}</p>
            </div>
            <div className="confirm-modal-footer">
              <button 
                onClick={closeConfirmModal} 
                className="btn-modal-cancel"
              >
                Cancel
              </button>
              <button 
                onClick={confirmModal.onConfirm} 
                className="btn-modal-confirm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
