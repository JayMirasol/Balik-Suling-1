import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // for navigation
import "./sidebar.css";
import SidebarButton from "./sidebarButton";
import { MdFavorite, MdOfflineShare, MdScore, MdStart, MdTranslate } from "react-icons/md";
import { FaGripfire, FaPlay, FaMusic, FaGuitar, FaChevronDown } from "react-icons/fa";
import { FaSignOutAlt } from "react-icons/fa";
import { IoBatteryChargingOutline, IoLibrary } from "react-icons/io5";
import { MdSpaceDashboard } from "react-icons/md";
import apiClient from "../../spotify";
import { Link } from "react-router-dom";
import { Player } from "tone";

export default function Sidebar() {
  const [image, setImage] = useState(
    "https://static.vecteezy.com/system/resources/previews/019/879/186/large_2x/user-icon-on-transparent-background-free-png.png"
  );
  const [showLogoutModal, setShowLogoutModal] = useState(false); // Track modal visibility
  const navigate = useNavigate();

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

  return (
    <div className="sidebar-container">
      <img src={image} className="profile-img" alt="profile" />
      <div>
        <SidebarButton title="Home" to="/feed" icon={<MdSpaceDashboard />} />
        <SidebarButton title="Tutorials" to="/chordtutor" icon={<FaGuitar />} />
        {/* <SidebarButton title="Player" to="/player" icon={<FaPlay />} /> */}
        <SidebarButton title="Chord Scanner" to="/chordscanner" icon={<FaMusic />} />
        {/* <SidebarButton title="Library" to="/library" icon={<IoLibrary />} /> */}

        <SidebarButton title="Scan Score" to="/scan-score" icon={<MdScore />} />
        {/* <SidebarButton title="Beginner Chords" to="/beginner-chords" icon={<MdStart/>} /> */}
        <SidebarButton title="Translate" to="/translate" icon={<MdTranslate />} />
        {/* <SidebarButton title="Tutorials" to="/tutorials" icon={<FaGuitar />} /> */}
        <SidebarButton title="Saved Offline" to="/offline" icon={<MdOfflineShare />} />

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
