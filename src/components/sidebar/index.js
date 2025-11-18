import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // for navigation
import "./sidebar.css";
import SidebarButton from "./sidebarButton";
import { MdOfflineShare, MdTranslate, MdFeedback, MdAdminPanelSettings } from "react-icons/md";
import { FaMusic, FaGuitar, FaChevronDown } from "react-icons/fa";
import { FaSignOutAlt } from "react-icons/fa";
import { MdSpaceDashboard } from "react-icons/md";
import apiClient, { clearClientToken } from "../../spotify";

export default function Sidebar() {
  const [image, setImage] = useState(
    "https://static.vecteezy.com/system/resources/previews/019/879/186/large_2x/user-icon-on-transparent-background-free-png.png"
  );
  const [showLogoutModal, setShowLogoutModal] = useState(false); // Track modal visibility
  const [language, setLanguage] = useState("English"); // Track selected language
  const [showLanguageOptions, setShowLanguageOptions] = useState(false); // Track visibility of language options
  const navigate = useNavigate();

  const translations = {
    English: {
      Home: "Home",
      Tutorials: "Tutorials",
      ChordScanner: "Chord Scanner",
      Translate: "Translate",
      SavedOffline: "Saved Offline",
    },
    Tagalog: {
      Home: "Bahay",
      Tutorials: "Pagsasanay",
      ChordScanner: "Bagting Iskaner",
      Translate: "Isalin",
      SavedOffline: "Naka-offline",
    },
    Kapampangan: {
      Home: "Bale",
      Tutorials: "Paningwas",
      ChordScanner: "Malino",
      Translate: "Asyu",
      SavedOffline: "Ali konektadu",
    },
  };

  useEffect(() => {
    const t = window.localStorage.getItem("token");
    if (!t) return; // no token → skip fetching profile
    
    // Check for saved profile image in localStorage first
    const savedProfile = localStorage.getItem("userProfile");
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        if (parsed.imageUrl) {
          setImage(parsed.imageUrl);
        }
      } catch (e) {
        console.error("Error parsing saved profile:", e);
      }
    }
    
    apiClient
      .get("me")
      .then((response) => {
        const img = response?.data?.images?.[0]?.url;
        // Only update if no custom image was saved
        if (img && !savedProfile) {
          setImage(img);
        }
      })
      .catch((error) => {
        // Non-fatal; user may have no image or token may be invalid (handled globally)
        console.error("Error fetching user image:", error);
      });
      
    // Listen for profile image updates
    const handleImageUpdate = (event) => {
      if (event.detail && event.detail.imageUrl) {
        setImage(event.detail.imageUrl);
      }
    };
    
    window.addEventListener("profileImageUpdated", handleImageUpdate);
    
    return () => {
      window.removeEventListener("profileImageUpdated", handleImageUpdate);
    };
  }, []);

  const handleLogout = () => {
    setShowLogoutModal(true); // Show the modal for confirmation
  };

  const confirmLogout = () => {
    window.localStorage.removeItem("token"); // remove token from local storage
    clearClientToken(); // remove Authorization header interceptor
    setShowLogoutModal(false); // Close modal
    // Notify app to update auth state
    try { window.dispatchEvent(new Event("app:loggedOut")); } catch {}
    // Client-side navigate to login
    navigate("/login?logout=true", { replace: true });
  };

  const cancelLogout = () => {
    setShowLogoutModal(false); // Close the modal without logging out
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setShowLanguageOptions(false); // Hide options after selection
  };

  const toggleLanguageOptions = () => {
    setShowLanguageOptions(!showLanguageOptions);
  };

  return (
    <div className="sidebar-container">
      <div className="profile-section" onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>
        <img src={image} className="profile-img" alt="profile" />
      </div>
      <div>
        <SidebarButton title={translations[language].Home} to="/feed" icon={<MdSpaceDashboard />} />
        <SidebarButton title={translations[language].Tutorials} to="/chordtutor" icon={<FaGuitar />} />
        <SidebarButton title={translations[language].ChordScanner} to="/chordscanner" icon={<FaMusic />} />
        {/* <SidebarButton title={translations[language].Translate} to="/translate" icon={<MdTranslate />} /> */}
        <SidebarButton title={translations[language].SavedOffline} to="/offline" icon={<MdOfflineShare />} />
        <SidebarButton title="Feedback" to="/feedback" icon={<MdFeedback />} />
        <SidebarButton title="Admin Panel" to="/admin" icon={<MdAdminPanelSettings />} />
      </div>

      {/* Language Mode Button */}
      <div className="sidebar-button" onClick={toggleLanguageOptions}>
        <SidebarButton title="Mode" icon={<FaChevronDown />} />
        {showLanguageOptions && (
          <div className="language-options">
            <button onClick={() => handleLanguageChange("English")}>English</button>
            <button onClick={() => handleLanguageChange("Tagalog")}>Tagalog</button>
            <button onClick={() => handleLanguageChange("Kapampangan")}>Kapampangan</button>
        <SidebarButton title={translations[language].Translate} to="/translate" icon={<MdTranslate />} />
          </div>
        )}
      </div>

      {/* Log Out Button */}
      <div className="sidebar-button" onClick={handleLogout}>
      <SidebarButton title="Log Out" icon={<FaSignOutAlt />} />
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="logout-modal">
          <div className="modal-content">
            <h3>Are you sure you want to log out?</h3>
            <div className="modal-buttons">
              <button onClick={confirmLogout}>Yes</button>
              <button onClick={cancelLogout}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
