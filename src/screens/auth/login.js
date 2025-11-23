import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import "./login.css";

export default function Login() {
  const [showThankYouMessage, setShowThankYouMessage] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    agreedToTerms: false
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get("logout") === "true") {
      setShowThankYouMessage(true); 
      setTimeout(() => {
        setShowThankYouMessage(false);
      }, 5000); 
    }
  }, [location]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation
    if (!formData.email || !formData.password) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    if (isSignUp) {
      if (!formData.name) {
        setError("Please enter your name");
        setLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        setLoading(false);
        return;
      }
      if (!formData.agreedToTerms) {
        setError("You must agree to the Terms and Conditions");
        setLoading(false);
        return;
      }
    }

    try {
      // Store user data in localStorage (in production, use proper backend authentication)
      if (isSignUp) {
        const users = JSON.parse(localStorage.getItem("balikSulingUsers") || "[]");
        const existingUser = users.find(u => u.email === formData.email);
        
        if (existingUser) {
          setError("An account with this email already exists");
          setLoading(false);
          return;
        }

        const newUser = {
          id: Date.now(),
          name: formData.name,
          email: formData.email,
          password: formData.password, // In production, hash this!
          createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        localStorage.setItem("balikSulingUsers", JSON.stringify(users));
        localStorage.setItem("currentUser", JSON.stringify(newUser));
        localStorage.setItem("token", `balik_suling_${newUser.id}`);
        
        window.location.href = "/feed";
      } else {
        // Login
        const users = JSON.parse(localStorage.getItem("balikSulingUsers") || "[]");
        const user = users.find(u => u.email === formData.email && u.password === formData.password);
        
        if (!user) {
          setError("Invalid email or password");
          setLoading(false);
          return;
        }

        localStorage.setItem("currentUser", JSON.stringify(user));
        localStorage.setItem("token", `balik_suling_${user.id}`);
        
        window.location.href = "/feed";
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (credentialResponse) => {
    try {
      console.log('Google login successful, processing user data...');
      // Decode the JWT token from Google
      const decoded = jwtDecode(credentialResponse.credential);
      console.log('Decoded user:', { email: decoded.email, name: decoded.name });
      
      // Extract user information
      const googleUser = {
        id: decoded.sub,
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture,
        isGoogleAuth: true,
        createdAt: new Date().toISOString()
      };

      // Check if user already exists
      const users = JSON.parse(localStorage.getItem("balikSulingUsers") || "[]");
      let existingUser = users.find(u => u.email === googleUser.email);

      if (!existingUser) {
        // New user - add to users list
        console.log('New user, registering...');
        users.push(googleUser);
        localStorage.setItem("balikSulingUsers", JSON.stringify(users));
      } else {
        // Update existing user with Google info
        console.log('Existing user found, updating...');
        existingUser.picture = googleUser.picture;
        existingUser.isGoogleAuth = true;
        localStorage.setItem("balikSulingUsers", JSON.stringify(users));
        googleUser.id = existingUser.id; // Keep original ID if user exists
      }

      // Set current user and token
      localStorage.setItem("currentUser", JSON.stringify(googleUser));
      localStorage.setItem("token", `balik_suling_${googleUser.id}`);
      
      console.log('Login complete, redirecting to /feed');
      // Use window.location for a full page reload to ensure token is picked up
      window.location.href = "/feed";
    } catch (error) {
      console.error("Google login error:", error);
      setError("Failed to login with Google. Please try again.");
    }
  };

  const handleGoogleError = () => {
    console.error("Google login failed");
    setError("Google login failed. Please try again.");
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError("");
    setFormData({ email: "", password: "", confirmPassword: "", name: "", agreedToTerms: false });
  };

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID"}>
      <div className="login-page">
        {showThankYouMessage && (
          <div className="thank-you-message">
            <p>Thank you for using Balik Suling!</p>
          </div>
        )}

        <div className="auth-container">
        <div className="logo-container">
          <img src="/bs-logo.png" alt="logo-bs" className="logo" />
          <div className="logo-texts">
            <div className="logo-text">Balik Suling</div>
            <div className="logo-subtext">Kapampangan Music App</div>
          </div>
        </div>

        <div className="auth-box">
          <h2 className="auth-title">{isSignUp ? "Create Account" : "Welcome Back"}</h2>
          <p className="auth-subtitle">
            {isSignUp ? "Sign up to start your musical journey" : "Log in to continue your journey"}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            {isSignUp && (
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your name"
                  required={isSignUp}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                required
              />
            </div>

            {isSignUp && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  required={isSignUp}
                />
              </div>
            )}

            {isSignUp && (
              <div className="terms-checkbox-group">
                <input
                  type="checkbox"
                  id="agreedToTerms"
                  name="agreedToTerms"
                  checked={formData.agreedToTerms}
                  onChange={handleInputChange}
                  required={isSignUp}
                />
                <label htmlFor="agreedToTerms">
                  I agree to the{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer">
                    Terms and Conditions
                  </a>
                </label>
              </div>
            )}

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Log In"}
            </button>
          </form>

          <div className="divider">
            <span>OR</span>
          </div>

          <div className="google-login-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              text="continue_with"
              shape="pill"
              size="large"
            />
          </div>

          <div className="auth-switch">
            <p>
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
              <button type="button" onClick={toggleMode} className="switch-btn">
                {isSignUp ? "Log In" : "Sign Up"}
              </button>
            </p>
          </div>
        </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
