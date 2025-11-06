import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../images/logo.png';
import './Login.css';

function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('clinicalTheme') === 'dark' ? 'dark' : 'light';
  });

  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.body.dataset.clinicalTheme = theme;
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTheme = localStorage.getItem('clinicalTheme');
    if (storedTheme && storedTheme !== theme) {
      setTheme(storedTheme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('clinicalTheme', next);
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const trimmedId = identifier.trim();
      const user = await login(trimmedId, password);

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
      const message =
        err?.response?.status === 401
          ? 'We could not verify those credentials. Please check your email / phone and password.'
          : 'Unable to reach the authentication service. If the cloud is offline, pls contact support.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // const demoLogin = async (role) => {
  //   const demos = {
  //     parent: { identifier: 'parent@demo.com', password: 'role123' },
  //     doctor: { identifier: 'doctor@demo.com', password: 'role123' },
  //     admin: { identifier: 'admin@demo.com', password: 'role123' }
  //   };

  //   setIdentifier(demos[role].identifier);
  //   setPassword(demos[role].password);

  //   setLoading(true);
  //   try {
  //     const user = await login(demos[role].identifier, demos[role].password);

  //     switch (user.role) {
  //       case 'parent':
  //         navigate('/parent');
  //         break;
  //       case 'doctor':
  //       case 'nurse':
  //         navigate('/clinical');
  //         break;
  //       case 'admin':
  //         navigate('/admin');
  //         break;
  //       default:
  //         navigate('/');
  //     }
  //   } catch (err) {
  //     setError('Demo login failed. Please verify the demo credentials or try again shortly.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const thingsBoardLogin = async () => {
    const tbUsername = process.env.REACT_APP_TB_USERNAME;
    const tbPassword = process.env.REACT_APP_TB_PASSWORD;

    if (!tbUsername || !tbPassword) {
      setError('ThingsBoard credentials not configured in .env file');
      return;
    }

    setIdentifier(tbUsername);
    setPassword(tbPassword);

    setLoading(true);
    try {
      const user = await login(tbUsername, tbPassword);

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
      setError('ThingsBoard login failed. Confirm your credentials or use the demo sign-in below.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-shell theme-${theme}`}>
      <div className="login-surface">
        <aside className="login-hero" aria-label="Project introduction">
          <div className="hero-nav">
            <div className="hero-brand" aria-label="National Hospital Galle NICU Monitoring Unit">
              <img src={Logo} alt="National Hospital Galle NICU logo" />
              <div className="hero-brand-text">
                <span className="brand-name">National Hospital Galle</span>
                <span className="brand-sub">NICU Monitoring Unit</span>
              </div>
            </div>
            <button
              type="button"
              className="theme-toggle"
              aria-label="Toggle theme"
              aria-pressed={theme === 'dark'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M18.364 18.364l-1.414-1.414M7.05 7.05 5.636 5.636M12 7a5 5 0 100 10 5 5 0 000-10z"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
                  />
                </svg>
              )}
            </button>
          </div>

          <div className="hero-body">
            <p className="hero-kicker">NICU MONITORING UNIT</p>
            <h1>Care tools designed for calmer nights in the NICU.</h1>
            <p className="hero-copy">
              Secure dashboards, live vitals, and predictive alerts—connected through Infant Incubator and
              ready for every role in the care team.
            </p>
            <ul className="hero-list">
              <li>Role-based dashboards for parents, clinicians, and admins</li>
              <li>Real-time vitals with NTE thermal guidance insights</li>
              <li>Instant cry and jaundice notifications</li>
            </ul>
          </div>

          <div className="hero-footer">
            <div>
              <span className="hero-label">Device</span>
              <span className="hero-value">INC-001</span>
            </div>
            <div>
              <span className="hero-label">Status</span>
              <span className="hero-value online">Connected</span>
            </div>
          </div>
        </aside>

        <section className="login-panel" aria-label="Sign in">
          <header className="panel-header">
            <span className="panel-tag">Authorized staff / Parents</span>
            <h2>Sign in</h2>
            {/* <p className="panel-subhead">
              Use your ThingsBoard or NICU-issued credentials. If the cloud is offline, the demo accounts below
              ({'email@demo.com'} / <code>role123</code>) are always available.
            </p> */}
          </header>

          {error && (
            <div className="panel-alert" role="alert">
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="panel-form">
            {/* <p className="panel-note">
              Your session will stay active on this device. To switch roles, sign out once you are done.
            </p> */}
            <label htmlFor="identifier">Email or phone</label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="name@example.com or 0712345678"
              autoComplete="username"
              required
              disabled={loading}
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={loading}
            />

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true"></span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="panel-divider" role="presentation">
            <span>Sign up</span>
          </div>

          <div className="staff-signup-card">
            <div className="staff-signup-card__content">
              {/* <span className="staff-signup-card__eyebrow">Tenant administrators</span> */}
              <h3>Invite doctors & nurses</h3>
              <p>
                Issue secure accounts for clinical staff.
              </p>
            </div>
            <button
              type="button"
              className="btn-outline staff-signup-card__button"
              onClick={() => navigate('/staff-signup')}
              disabled={loading}
            >
              Open Staff Sign Up
            </button>
          </div>

          <button
            type="button"
            onClick={thingsBoardLogin}
            className="btn-outline wide thingsboard"
            disabled={loading}
          >
            {/* Connect with ThingsBoard */}
          </button>

          {/* <div className="demo-group">
            <span className="demo-label">Demo roles</span>
            <div className="demo-grid">
              <button
                type="button"
                onClick={() => demoLogin('parent')}
                className="chip parent"
                disabled={loading}
              >
                Parent Portal
              </button>
              <button
                type="button"
                onClick={() => demoLogin('doctor')}
                className="chip doctor"
                disabled={loading}
              >
                Clinical Team
              </button>
              <button
                type="button"
                onClick={() => demoLogin('admin')}
                className="chip admin"
                disabled={loading}
              >
                Admin Console
              </button>
            </div>
          </div> */}

          <footer className="panel-footer">
            <span>Need help? support@nicu-monitor.io</span>
          </footer>
        </section>
      </div>
    </div>
  );
}

export default Login;


