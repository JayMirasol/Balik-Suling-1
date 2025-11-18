import React, { useState, useEffect } from "react";
import apiClient from "../../spotify";
import { getAllOffline } from "../../shared/offlineStore";
import "./profile.css";

export default function Profile() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    country: "",
    spotifyId: "",
    imageUrl: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [stats, setStats] = useState({
    songsLearned: 0,
    chordsScanned: 0,
    savedOffline: 0,
  });

  useEffect(() => {
    fetchProfile();
    fetchStats();
    
    // Listen for offline updates
    const handleOfflineUpdate = () => {
      fetchStats();
    };
    
    // Listen for stats updates (songs learned, chords scanned)
    const handleStatsUpdate = () => {
      fetchStats();
    };
    
    window.addEventListener("offlineUpdated", handleOfflineUpdate);
    window.addEventListener("statsUpdated", handleStatsUpdate);
    
    return () => {
      window.removeEventListener("offlineUpdated", handleOfflineUpdate);
      window.removeEventListener("statsUpdated", handleStatsUpdate);
    };
  }, []);

  const fetchStats = async () => {
    try {
      // Get offline saved songs count
      const offlineItems = await getAllOffline();
      const offlineCount = offlineItems.length;

      // Get chords scanned count from localStorage
      const chordsScanned = localStorage.getItem("chordsScannedCount") || 0;

      // Get songs learned count from localStorage (tracks songs viewed/played)
      const songsLearned = localStorage.getItem("songsLearnedCount") || 0;

      setStats({
        songsLearned: Number(songsLearned),
        chordsScanned: Number(chordsScanned),
        savedOffline: offlineCount,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchProfile = async () => {
    try {
      // Check if there's a saved profile in localStorage first
      const savedProfile = localStorage.getItem("userProfile");
      
      const response = await apiClient.get("me");
      const data = response.data;
      
      let profileData = {
        name: data.display_name || "",
        email: data.email || "",
        country: data.country || "",
        spotifyId: data.id || "",
        imageUrl: data.images?.[0]?.url || "https://static.vecteezy.com/system/resources/previews/019/879/186/large_2x/user-icon-on-transparent-background-free-png.png",
      };

      // Merge with saved profile data (prioritize localStorage for custom fields)
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          profileData = {
            ...profileData,
            ...parsed,
            // Keep Spotify ID from API (not editable)
            spotifyId: data.id || "",
          };
        } catch (e) {
          console.error("Error parsing saved profile:", e);
        }
      }

      setProfile(profileData);
      setEditedProfile(profileData);
      setLoading(false);
      
      // Update sidebar image
      window.dispatchEvent(new CustomEvent("profileImageUpdated", { detail: { imageUrl: profileData.imageUrl } }));
    } catch (error) {
      console.error("Error fetching profile:", error);
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setSaveStatus(null);
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
    setSaveStatus(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Since Spotify profile data is read-only via API,
    // we'll just simulate a save and store locally
    setProfile(editedProfile);
    setIsEditing(false);
    setSaveStatus({
      type: "success",
      message: "Profile updated successfully! (Note: Some fields are managed by Spotify)",
    });
    
    // Store locally for demo purposes
    localStorage.setItem("userProfile", JSON.stringify(editedProfile));
    
    setTimeout(() => setSaveStatus(null), 5000);
  };

  const handleChangeImage = () => {
    setNewImageUrl(editedProfile.imageUrl || profile.imageUrl);
    setShowImageModal(true);
  };

  const handleImageSave = () => {
    if (newImageUrl.trim()) {
      const updated = { ...editedProfile, imageUrl: newImageUrl };
      setEditedProfile(updated);
      setProfile(updated);
      localStorage.setItem("userProfile", JSON.stringify(updated));
      
      // Dispatch event to update sidebar image
      window.dispatchEvent(new CustomEvent("profileImageUpdated", { detail: { imageUrl: newImageUrl } }));
      
      setSaveStatus({
        type: "success",
        message: "Profile picture updated successfully!",
      });
      setTimeout(() => setSaveStatus(null), 3000);
    }
    setShowImageModal(false);
    setNewImageUrl("");
  };

  const handleImageCancel = () => {
    setShowImageModal(false);
    setNewImageUrl("");
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-content">
        <h1 className="profile-title">My Profile</h1>

        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-image-wrapper">
              <img 
                src={profile.imageUrl} 
                alt="Profile" 
                className="profile-image"
              />
              <button 
                className="change-image-btn" 
                onClick={handleChangeImage}
                title="Change profile picture"
              >
                📷
              </button>
            </div>
            <div className="profile-header-info">
              <h2>{profile.name || "User"}</h2>
              <p className="profile-subtitle">Balik Suling Member</p>
            </div>
          </div>

          {saveStatus && (
            <div className={`status-banner ${saveStatus.type}`}>
              {saveStatus.message}
            </div>
          )}

          <div className="profile-details">
            <div className="detail-group">
              <label>Full Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={editedProfile.name}
                  onChange={handleChange}
                  className="profile-input"
                />
              ) : (
                <p className="detail-value">{profile.name || "Not set"}</p>
              )}
            </div>

            <div className="detail-group">
              <label>Email</label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={editedProfile.email}
                  onChange={handleChange}
                  className="profile-input"
                />
              ) : (
                <p className="detail-value">{profile.email || "Not set"}</p>
              )}
            </div>

            <div className="detail-group">
              <label>Country</label>
              {isEditing ? (
                <input
                  type="text"
                  name="country"
                  value={editedProfile.country}
                  onChange={handleChange}
                  className="profile-input"
                />
              ) : (
                <p className="detail-value">{profile.country || "Not set"}</p>
              )}
            </div>

            <div className="detail-group">
              <label>Spotify ID</label>
              <p className="detail-value spotify-id">{profile.spotifyId || "Not connected"}</p>
            </div>
          </div>

          <div className="profile-actions">
            {!isEditing ? (
              <button onClick={handleEdit} className="btn btn-primary">
                Edit Profile
              </button>
            ) : (
              <>
                <button onClick={handleSave} className="btn btn-success">
                  Save Changes
                </button>
                <button onClick={handleCancel} className="btn btn-secondary">
                  Cancel
                </button>
              </>
            )}
          </div>

          <div className="profile-info-note">
            <p>
              <strong>Note:</strong> Your profile is connected to Spotify. 
              Some information is managed through your Spotify account settings.
            </p>
          </div>
        </div>

        <div className="profile-stats-card">
          <h3>Activity</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{stats.songsLearned}</div>
              <div className="stat-label">Songs Learned</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.chordsScanned}</div>
              <div className="stat-label">Chords Scanned</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.savedOffline}</div>
              <div className="stat-label">Saved Offline</div>
            </div>
          </div>
        </div>

        {/* Image Upload Modal */}
        {showImageModal && (
          <div className="image-modal-overlay" onClick={handleImageCancel}>
            <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="image-modal-header">
                <h3>Change Profile Picture</h3>
                <button onClick={handleImageCancel} className="modal-close-btn">×</button>
              </div>
              <div className="image-modal-body">
                <div className="image-preview-wrapper">
                  <img 
                    src={newImageUrl || profile.imageUrl} 
                    alt="Preview" 
                    className="image-preview"
                  />
                </div>
                
                <div className="image-upload-options">
                  <div className="form-group">
                    <label>Upload from Device</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="file-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Or Enter Image URL</label>
                    <input
                      type="text"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="url-input"
                    />
                  </div>
                </div>
              </div>
              <div className="image-modal-footer">
                <button onClick={handleImageSave} className="btn btn-save-image">
                  Save Picture
                </button>
                <button onClick={handleImageCancel} className="btn btn-cancel-image">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
