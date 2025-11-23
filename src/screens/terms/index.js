import React from "react";
import { useNavigate } from "react-router-dom";
import "./terms.css";

export default function TermsAndConditions() {
  const navigate = useNavigate();

  return (
    <div className="terms-container">
      <div className="terms-content">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <h1 className="terms-title">Terms and Conditions</h1>
        <p className="terms-date">Last Updated: November 23, 2025</p>

        <div className="terms-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using Balik Suling (the "App"), you accept and agree to be bound by the terms 
            and provision of this agreement. If you do not agree to these Terms and Conditions, please do not 
            use this App.
          </p>
        </div>

        <div className="terms-section">
          <h2>2. Description of Service</h2>
          <p>
            Balik Suling is a Kapampangan music learning application that provides:
          </p>
          <ul>
            <li>Access to Kapampangan music and songs</li>
            <li>Chord scanning and detection tools</li>
            <li>Music tutorials and educational content</li>
            <li>Translation services for Kapampangan lyrics</li>
            <li>Offline song storage capabilities</li>
            <li>User profile management</li>
          </ul>
        </div>

        <div className="terms-section">
          <h2>3. User Accounts</h2>
          <p>
            To access certain features of the App, you may be required to create an account. You agree to:
          </p>
          <ul>
            <li>Provide accurate and complete information during registration</li>
            <li>Maintain the security of your password and account</li>
            <li>Accept responsibility for all activities under your account</li>
            <li>Notify us immediately of any unauthorized access</li>
          </ul>
        </div>

        <div className="terms-section">
          <h2>4. User Conduct</h2>
          <p>
            You agree not to use the App to:
          </p>
          <ul>
            <li>Upload or share content that is illegal, harmful, or offensive</li>
            <li>Infringe upon intellectual property rights of others</li>
            <li>Attempt to gain unauthorized access to the App or its systems</li>
            <li>Distribute malware or engage in any harmful activities</li>
            <li>Harass, abuse, or harm other users</li>
          </ul>
        </div>

        <div className="terms-section">
          <h2>5. Intellectual Property</h2>
          <p>
            All content, features, and functionality of Balik Suling, including but not limited to text, 
            graphics, logos, and software, are the property of Balik Suling or its content suppliers and 
            are protected by intellectual property laws.
          </p>
          <p>
            Music content available through the App may be subject to copyright and is provided for 
            educational and cultural preservation purposes.
          </p>
        </div>

        <div className="terms-section">
          <h2>6. Privacy and Data Collection</h2>
          <p>
            Your privacy is important to us. We collect and use your personal information in accordance 
            with our Privacy Policy. By using the App, you consent to:
          </p>
          <ul>
            <li>Collection of account information (name, email)</li>
            <li>Storage of user preferences and activity data</li>
            <li>Use of cookies and local storage for app functionality</li>
            <li>Optional integration with Google authentication services</li>
          </ul>
        </div>

        <div className="terms-section">
          <h2>7. Offline Content</h2>
          <p>
            The App allows you to save content for offline access. You agree that:
          </p>
          <ul>
            <li>Offline content is for personal, non-commercial use only</li>
            <li>You will not redistribute or share saved content</li>
            <li>Offline access may be limited or revoked at any time</li>
            <li>Content is stored locally on your device</li>
          </ul>
        </div>

        <div className="terms-section">
          <h2>8. Third-Party Services</h2>
          <p>
            The App may integrate with third-party services (such as Google OAuth for authentication). 
            Your use of these services is subject to their respective terms and conditions.
          </p>
        </div>

        <div className="terms-section">
          <h2>9. Disclaimers and Limitations of Liability</h2>
          <p>
            The App is provided "as is" without warranties of any kind. We do not guarantee:
          </p>
          <ul>
            <li>Uninterrupted or error-free operation</li>
            <li>Accuracy or completeness of content</li>
            <li>That defects will be corrected</li>
            <li>Freedom from viruses or harmful components</li>
          </ul>
          <p>
            We shall not be liable for any indirect, incidental, special, consequential, or punitive 
            damages resulting from your use of the App.
          </p>
        </div>

        <div className="terms-section">
          <h2>10. Modifications to Service</h2>
          <p>
            We reserve the right to modify, suspend, or discontinue the App (or any part thereof) at any 
            time with or without notice. We shall not be liable to you or any third party for any 
            modification, suspension, or discontinuance.
          </p>
        </div>

        <div className="terms-section">
          <h2>11. Termination</h2>
          <p>
            We may terminate or suspend your account and access to the App immediately, without prior 
            notice, for any reason, including breach of these Terms and Conditions.
          </p>
        </div>

        <div className="terms-section">
          <h2>12. Changes to Terms</h2>
          <p>
            We reserve the right to update these Terms and Conditions at any time. We will notify users 
            of any changes by updating the "Last Updated" date. Your continued use of the App after 
            changes constitutes acceptance of the modified terms.
          </p>
        </div>

        <div className="terms-section">
          <h2>13. Cultural Sensitivity</h2>
          <p>
            Balik Suling is dedicated to preserving and promoting Kapampangan culture and music. Users 
            are expected to respect the cultural significance of the content and use it in a manner that 
            honors Kapampangan heritage.
          </p>
        </div>

        <div className="terms-section">
          <h2>14. Contact Information</h2>
          <p>
            If you have any questions about these Terms and Conditions, please contact us through the 
            Feedback section of the App or via email.
          </p>
        </div>

        <div className="terms-section">
          <h2>15. Governing Law</h2>
          <p>
            These Terms and Conditions shall be governed by and construed in accordance with the laws 
            of the Philippines, without regard to its conflict of law provisions.
          </p>
        </div>

        <div className="terms-footer">
          <p>
            By using Balik Suling, you acknowledge that you have read, understood, and agree to be 
            bound by these Terms and Conditions.
          </p>
        </div>
      </div>
    </div>
  );
}
