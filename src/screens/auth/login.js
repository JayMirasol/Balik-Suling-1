import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom"; 
import { loginEndpoint } from "../../spotify";
import "./login.css";

export default function Login() {
  const [showThankYouMessage, setShowThankYouMessage] = useState(false);
  const location = useLocation(); 

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get("logout") === "true") {
      setShowThankYouMessage(true); 
      setTimeout(() => {
        setShowThankYouMessage(false);
      }, 5000); 
    }
  }, [location]);

  return (
    <div className="login-page">
      {}
      {showThankYouMessage && (
        <div className="thank-you-message">
          <p>Thank you for using Balik Suling!</p>
        </div>
      )}

      <div className="logo-container">
        <img src="/bs-logo.png" alt="logo-bs" className="logo" />
        <div className="logo-texts">
          <div className="logo-text">Balik Suling</div>
          <div className="logo-subtext">Kapampangan Music App</div>
        </div>
      </div>
      
      <a href={loginEndpoint}>
        <div className="login-btn">LOG IN</div>
      </a>
    </div>
  );
}
