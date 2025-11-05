import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './SetupPassword.css';
import Logo from '../../images/logo.png';
import adminBackendService from '../../services/admin-backend.service';

function SetupPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userDetails, setUserDetails] = useState(null);

  useEffect(() => {
    if (!token || !email) {
      setError('Invalid setup link. Please contact your administrator.');
      return;
    }

    // Verify token with backend
    const verifyToken = async () => {
      try {
        const response = await adminBackendService.verifySetupToken(token, email);
        if (response && response.admin) {
          setUserDetails(response.admin);
        }
      } catch (err) {
        setError(err.message || 'Invalid or expired setup link. Please contact your administrator.');
      }
    };

    verifyToken();
  }, [token, email]);

  const validatePassword = () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validatePassword()) {
      return;
    }

    setLoading(true);

    try {
      // Call backend API to set password
      await adminBackendService.setupPassword(token, email, password);

      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err?.message || 'Failed to set password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="setup-password">
        <div className="setup-container">
          <div className="error-view">
            <div className="error-icon">⚠️</div>
            <h2>Invalid Setup Link</h2>
            <p>This password setup link is invalid. Please contact your administrator.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-password">
      <div className="setup-container">
        <div className="setup-header">
          <div className="setup-logo">
            <img src={Logo} alt="Hospital Logo" />
          </div>
          <h1>Set Up Your Password</h1>
          <p>Create a secure password for your admin account</p>
        </div>

        {success ? (
          <div className="success-view">
            <div className="success-icon">✓</div>
            <h2>Password Set Successfully!</h2>
            <p>Your account is now active. Redirecting to login...</p>
            <div className="redirect-spinner"></div>
          </div>
        ) : (
          <>
            {userDetails && (
              <>
                <div className="user-info-card">
                  <div className="info-row">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{userDetails.email}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Name:</span>
                    <span className="info-value">{userDetails.name}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Access Level:</span>
                    <span className="info-value">Administrator</span>
                  </div>
                </div>
                
                <div className="access-note">
                  <strong>ℹ️ Admin Dashboard Access</strong>
                  <p>You will have access to the Admin Dashboard for device troubleshooting and configuration.</p>
                </div>
              </>
            )}

            <form className="setup-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor="password">Password *</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading || !userDetails}
                  minLength={8}
                />
                <span className="field-hint">At least 8 characters</span>
              </div>

              <div className="form-field">
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  disabled={loading || !userDetails}
                  minLength={8}
                />
              </div>

              {error && (
                <div className="error-alert">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                className="submit-button"
                disabled={loading || !userDetails}
              >
                {loading ? (
                  <>
                    <span className="button-spinner"></span>
                    Setting Password...
                  </>
                ) : (
                  'Set Password & Activate Account'
                )}
              </button>
            </form>

            <div className="setup-footer">
              <p>
                Need help? Contact your system administrator
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SetupPassword;
