import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // for navigation
import "./sidebar.css";
import SidebarButton from "./sidebarButton";
import { MdOfflineShare, MdTranslate } from "react-icons/md";
import { FaMusic, FaGuitar, FaChevronDown } from "react-icons/fa";
import { FaSignOutAlt } from "react-icons/fa";
import { MdSpaceDashboard } from "react-icons/md";
import apiClient from "../../spotify";

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
    apiClient.get("me").then((response) => {
      setImage(response.data.images[0].url);
    }).catch((error) => {
      console.error("Error fetching user image:", error);
    });
  }, []);

  const handleLogout = () => {
    setShowLogoutModal(true); // Show the modal for confirmation
  };

  const confirmLogout = () => {
    window.localStorage.removeItem("token"); // remove token from local storage
    setShowLogoutModal(false); // Close modal
    setTimeout(() => {
      navigate("/login?logout=true"); // Pass the logout flag to trigger message on login page
      window.location.reload(); // force refresh to clean up sidebar
    }, 2000); // Delay for 2 seconds before redirect
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
      <img src={image} className="profile-img" alt="profile" />
      <div>
        <SidebarButton title={translations[language].Home} to="/feed" icon={<MdSpaceDashboard />} />
        <SidebarButton title={translations[language].Tutorials} to="/chordtutor" icon={<FaGuitar />} />
        <SidebarButton title={translations[language].ChordScanner} to="/chordscanner" icon={<FaMusic />} />
        {/* <SidebarButton title={translations[language].Translate} to="/translate" icon={<MdTranslate />} /> */}
        <SidebarButton title={translations[language].SavedOffline} to="/offline" icon={<MdOfflineShare />} />
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
