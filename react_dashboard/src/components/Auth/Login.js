import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      
      // Redirect based on role
      switch (user.role) {
        case 'parent':
          navigate('/parent');
          break;
        case 'doctor':
        case 'nurse':
          navigate('/clinical');
          break;
        case 'admin':
          navigate('/admin');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (role) => {
    const demos = {
      parent: { email: 'parent@demo.com', password: 'role123' },
      doctor: { email: 'doctor@demo.com', password: 'role123' },
      admin: { email: 'admin@demo.com', password: 'role123' }
    };
    
    setEmail(demos[role].email);
    setPassword(demos[role].password);
    
    // Auto-submit after setting credentials
    setLoading(true);
    try {
      const user = await login(demos[role].email, demos[role].password);
      
      // Redirect based on role
      switch (user.role) {
        case 'parent':
          navigate('/parent');
          break;
        case 'doctor':
        case 'nurse':
          navigate('/clinical');
          break;
        case 'admin':
          navigate('/admin');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const thingsBoardLogin = async () => {
    const tbUsername = process.env.REACT_APP_TB_USERNAME;
    const tbPassword = process.env.REACT_APP_TB_PASSWORD;
    
    if (!tbUsername || !tbPassword) {
      setError('ThingsBoard credentials not configured in .env file');
      return;
    }
    
    setEmail(tbUsername);
    setPassword(tbPassword);
    
    // Auto-submit with ThingsBoard credentials
    setLoading(true);
    try {
      const user = await login(tbUsername, tbPassword);
      
      // Redirect based on role
      switch (user.role) {
        case 'parent':
          navigate('/parent');
          break;
        case 'doctor':
        case 'nurse':
          navigate('/clinical');
          break;
        case 'admin':
          navigate('/admin');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      setError('ThingsBoard login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-circle">
            <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1>NICU Monitor</h1>
          <p>ThingsBoard Integration</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? (
              <>
                <div className="spinner-small"></div>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="demo-section">
          <p className="demo-title">Quick Login:</p>
          
          <button onClick={thingsBoardLogin} className="btn-demo thingsboard" style={{
            width: '100%',
            marginBottom: '15px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontWeight: 'bold'
          }}>
            🔷 ThingsBoard Real Data
          </button>
          
          <p className="demo-title" style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>Demo Accounts:</p>
          <div className="demo-buttons">
            <button onClick={() => demoLogin('parent')} className="btn-demo parent">
              👨‍👩‍👧 Parent
            </button>
            <button onClick={() => demoLogin('doctor')} className="btn-demo doctor">
              👨‍⚕️ Doctor
            </button>
            <button onClick={() => demoLogin('admin')} className="btn-demo admin">
              ⚙️ Admin
            </button>
          </div>
        </div>

        <div className="login-footer">
          <p>Device: INC-001 | ThingsBoard Cloud</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
