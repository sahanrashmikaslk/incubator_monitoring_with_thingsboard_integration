import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import parentService from '../../services/parent.service';
import Logo from '../../images/logo.png';
import './ParentRegistration.css';

function ParentRegistration() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPin = searchParams.get('pin') || '';

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [pinRequired, setPinRequired] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    pin: initialPin
  });

  useEffect(() => {
    if (initialPin) {
      setForm(prev => ({ ...prev, pin: initialPin }));
    }
  }, [initialPin]);

  useEffect(() => {
    let isMounted = true;

    const fetchInvitation = async () => {
      if (!parentService.hasBackend) {
        setError('Parent backend URL is not configured. Please contact the NICU team.');
        setLoading(false);
        return;
      }

      try {
        const data = await parentService.fetchInvitation(code);
        if (!isMounted) return;
        setInvitation(data);
        setPinRequired(Boolean(data.pinRequired));
        if (data.pinRequired) {
          setForm(prev => ({ ...prev, pin: initialPin || prev.pin }));
        }
        setError('');
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'We could not find this invitation. Please request a new QR code from the care team.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInvitation();
    return () => {
      isMounted = false;
    };
  }, [code, initialPin]);

  const handleChange = (field) => (event) => {
    setForm(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const validatePhone = (value) => {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 9;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!invitation) return;

    if (!form.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!validatePhone(form.phone)) {
      setError('Please enter a valid phone number.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match. Please check and try again.');
      return;
    }
    if (pinRequired) {
      const sanitizedPin = (form.pin || '').replace(/\D/g, '');
      if (!sanitizedPin) {
        setError('Please enter the verification PIN provided by the care team.');
        return;
      }
      if (sanitizedPin.length < 4 || sanitizedPin.length > 8) {
        setError('Verification PIN must be 4 to 8 digits. Please check the PIN and try again.');
        return;
      }
      // normalize pin in form to digits-only before sending
      form.pin = sanitizedPin;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await parentService.registerWithInvitation({
        code,
        name: form.name.trim(),
        phone: form.phone.trim(),
        password: form.password,
        pin: form.pin ? String(form.pin).trim() : undefined
      });
      setSubmitted(response.parent);
    } catch (err) {
      setError(err.message || 'Registration failed. Please verify the code or request a new invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="parent-registration-page">
      <div className="parent-registration-card">
        <header className="registration-header">
          <div className="registration-brand">
            <img src={Logo} alt="NICU Monitoring logo" />
            <div>
              <span>National Hospital Galle</span>
              <small>NICU Monitoring Unit</small>
            </div>
          </div>
          <h2>Parent portal registration</h2>
          <p>Complete the form below to gain secure access to your baby&apos;s updates.</p>
        </header>

        {loading ? (
          <div className="registration-loading">
            <span className="spinner" aria-hidden="true"></span>
            Validating invitation...
          </div>
        ) : submitted ? (
          <section className="registration-success">
            <h3>Welcome, {submitted.name}!</h3>
            <p>Your parent access has been created. You can now sign in using your phone number.</p>
            <button type="button" className="btn-primary" onClick={handleBackToLogin}>
              Go to login
            </button>
          </section>
        ) : invitation ? (
          <form className="registration-form" onSubmit={handleSubmit}>
            <div className="invitation-summary">
              <span>Baby ID</span>
              <strong>{invitation.babyId}</strong>
              {invitation.babyName && <small>{invitation.babyName}</small>}
            </div>

            {error && (
              <div className="registration-error" role="alert">
                {error}
              </div>
            )}

            <label>
              Full name
              <input
                type="text"
                value={form.name}
                onChange={handleChange('name')}
                placeholder="Enter your name"
                required
                disabled={submitting}
              />
            </label>

            <label>
              Phone number
              <input
                type="tel"
                value={form.phone}
                onChange={handleChange('phone')}
                placeholder="07XXXXXXXX"
                required
                disabled={submitting}
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={handleChange('password')}
                placeholder="Create a password"
                required
                disabled={submitting}
                minLength={6}
              />
            </label>

            <label>
              Confirm password
              <input
                type="password"
                value={form.confirmPassword}
                onChange={handleChange('confirmPassword')}
                placeholder="Repeat password"
                required
                disabled={submitting}
                minLength={6}
              />
            </label>

            {pinRequired && (
              <label>
                Verification PIN
                <input
                  type="tel"
                  value={form.pin}
                  onChange={handleChange('pin')}
                  placeholder="Enter the 6-digit PIN"
                  required
                  disabled={submitting}
                  inputMode="numeric"
                />
              </label>
            )}

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating access...' : 'Create parent access'}
            </button>
          </form>
        ) : (
          <section className="registration-error-state">
            <p>{error}</p>
            <button type="button" className="btn-secondary" onClick={handleBackToLogin}>
              Return to login
            </button>
          </section>
        )}

        <footer className="registration-footer">
          <span>Need help? Contact the NICU care team or email support@nicu-monitor.io</span>
        </footer>
      </div>
    </div>
  );
}

export default ParentRegistration;
