import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import tbService from '../../services/thingsboard.service';
import Logo from '../../images/logo.png';
import './StaffSignup.css';

const OWNER_EMAIL = process.env.REACT_APP_TB_OWNER_EMAIL || 'sahanrashmikaslk@gmail.com';
const DEFAULT_ROLE = 'CUSTOMER_USER';

const ROLE_OPTIONS = [
  {
    authority: 'CUSTOMER_USER',
    label: 'Nurse',
    description: 'Standard operational access (ThingsBoard Customer User).'
  },
  {
    authority: 'TENANT_ADMIN',
    label: 'Doctor',
    description: 'Full administrative access (Tenant Admin).'
  }
];

function StaffSignup() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('clinicalTheme') === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.body.dataset.clinicalTheme = theme;
  }, [theme]);

  const [adminForm, setAdminForm] = useState({
    email: OWNER_EMAIL,
    password: ''
  });
  const [adminToken, setAdminToken] = useState(null);
  const [adminVerified, setAdminVerified] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');

  const [staffForm, setStaffForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: DEFAULT_ROLE
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activationLink, setActivationLink] = useState('');
  const [customers, setCustomers] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');

  const selectedRole = useMemo(
    () => ROLE_OPTIONS.find(option => option.authority === staffForm.role),
    [staffForm.role]
  );

  const handleToggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('clinicalTheme', next);
      }
      return next;
    });
  };

  const handleAdminSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setActivationLink('');
    setLoading(true);

    try {
      const data = await tbService.authenticateTenantAdmin(adminForm.email.trim(), adminForm.password);
      if (!data?.token) {
        throw new Error('Auth token missing from ThingsBoard response.');
      }
      setAdminToken(data.token);
      setAdminVerified(true);
      setAdminMessage(`Authenticated as ${adminForm.email.trim()}. You can now add staff.`);
      setAdminForm(prev => ({ ...prev, password: '' }));

      setCustomerLoading(true);
      try {
        const list = await tbService.listCustomers(data.token);
        setCustomers(list);
        if (list?.length > 0) {
          setSelectedCustomer(list[0].id?.id || '');
        }
      } catch (customerError) {
        console.warn('Unable to fetch customers:', customerError);
        setCustomers([]);
        setSelectedCustomer('');
      } finally {
        setCustomerLoading(false);
      }
    } catch (authError) {
      console.error(authError);
      const message =
        authError?.response?.data?.message ||
        authError?.response?.data ||
        authError?.message ||
        'Unable to authenticate with ThingsBoard. Please verify the tenant admin credentials.';
      setError(message);
      setAdminVerified(false);
      setAdminToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSubmit = async (event) => {
    event.preventDefault();
    if (!adminToken || !adminVerified) {
      setError('Authenticate with tenant administrator credentials before creating staff accounts.');
      return;
    }

    setError('');
    setSuccess('');
    setActivationLink('');
    setLoading(true);

    const payload = {
      email: staffForm.email.trim(),
      firstName: staffForm.firstName.trim(),
      lastName: staffForm.lastName.trim(),
      authority: staffForm.role
    };

    if (staffForm.role === 'CUSTOMER_USER') {
      if (!selectedCustomer) {
        setError('Please select a customer for nurse accounts before continuing.');
        setLoading(false);
        return;
      }
      payload.customerId = {
        entityType: 'CUSTOMER',
        id: selectedCustomer
      };
    }

    try {
      const { user, activationLink: link } = await tbService.createTenantUser(adminToken, payload);
      setSuccess(
        `User ${user?.email || payload.email} was created successfully. An activation email has been requested from ThingsBoard.`
      );
      if (link) {
        setActivationLink(typeof link === 'string' ? link : JSON.stringify(link));
      }
      setStaffForm({
        firstName: '',
        lastName: '',
        email: '',
        role: staffForm.role
      });
    } catch (createError) {
      console.error(createError);
      const message =
        createError?.response?.data?.message ||
        createError?.response?.data ||
        createError?.message ||
        'Failed to create the staff member. Please verify the details and try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminInput = (field) => (event) => {
    setAdminForm(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleStaffInput = (field) => (event) => {
    const value = event.target.value;

    setStaffForm(prev => ({
      ...prev,
      [field]: value
    }));

    if (field === 'role' && value === 'CUSTOMER_USER') {
      if (!selectedCustomer && customers?.length > 0) {
        setSelectedCustomer(customers[0].id?.id || '');
      }
    }
  };

  return (
    <div className={`staff-signup theme-${theme}`}>
      <header className="staff-signup__header">
        <div className="brand-block">
          <div className="brand-emblem">
            <img src={Logo} alt="NICU Monitoring logo" />
          </div>
          <div className="brand-text">
            <span className="brand-name">National Hospital Galle</span>
            <span className="brand-sub">Staff Onboarding</span>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="icon-button"
            aria-label="Toggle theme"
            onClick={handleToggleTheme}
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M18.364 18.364l-1.414-1.414M7.05 7.05 5.636 5.636M12 7a5 5 0 100 10 5 5 0 000-10z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
              </svg>
            )}
          </button>
          <Link to="/login" className="link-button">
            Back to login
          </Link>
        </div>
      </header>

      <main className="staff-signup__main">
        <section className="panel panel--step1">
          <header className="panel__header">
            <span className="panel__tag">Step 1</span>
            <h2>Tenant administrator verification</h2>
            <p>
              Authenticate with a tenant administrator account. This verifies that you have
              permission to add new staff members.
            </p>
          </header>

          <form className="panel__form" onSubmit={handleAdminSubmit}>
            <label>
              Admin email
              <input
                type="email"
                value={adminForm.email}
                onChange={handleAdminInput('email')}
                placeholder="tenant-admin@example.com"
                autoComplete="username"
                required
                disabled={loading}
              />
            </label>

            <label>
              Admin password
              <input
                type="password"
                value={adminForm.password}
                onChange={handleAdminInput('password')}
                placeholder="Enter tenant admin password"
                autoComplete="current-password"
                required
                disabled={loading}
              />
            </label>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Authenticating...' : adminVerified ? 'Re-authenticate' : 'Authenticate'}
            </button>
          </form>

          {adminMessage && (
            <div className="panel__notice success">
              {adminMessage}
            </div>
          )}
        </section>

        {adminVerified ? (
          <section className="panel panel--step2">
            <header className="panel__header">
              <span className="panel__tag">Step 2</span>
              <h2>Create doctor / nurse account</h2>
              <p>
                Provide the staff member&apos;s details. ThingsBoard will email an activation link so they can set a password.
              </p>
            </header>

            <form className="panel__form" onSubmit={handleStaffSubmit}>
              <div className="form-grid">
                <label>
                  First name
                  <input
                    type="text"
                    value={staffForm.firstName}
                    onChange={handleStaffInput('firstName')}
                    placeholder="Jane"
                    required
                    disabled={loading}
                  />
                </label>

                <label>
                  Last name
                  <input
                    type="text"
                    value={staffForm.lastName}
                    onChange={handleStaffInput('lastName')}
                    placeholder="Doe"
                    required
                    disabled={loading}
                  />
                </label>
              </div>

              <label>
                Staff email (login)
                <input
                  type="email"
                  value={staffForm.email}
                  onChange={handleStaffInput('email')}
                  placeholder="staff.member@example.com"
                  required
                  disabled={loading}
                />
              </label>

              <label>
                Role
                <select
                  value={staffForm.role}
                  onChange={handleStaffInput('role')}
                  disabled={loading}
                >
                  {ROLE_OPTIONS.map(option => (
                    <option key={option.authority} value={option.authority}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {staffForm.role === 'CUSTOMER_USER' && (
                <label>
                  Customer
                  <select
                    value={selectedCustomer}
                    onChange={(event) => setSelectedCustomer(event.target.value)}
                    disabled={loading || customerLoading}
                  >
                    {customers.map(customer => (
                      <option key={customer.id?.id || customer.name} value={customer.id?.id || ''}>
                        {customer.title || customer.name || customer.email || customer.id?.id}
                      </option>
                    ))}
                  </select>
                  {(!customers || customers.length === 0) && !customerLoading && (
                    <span className="role-hint warning">
                      No customers found. Create a customer in ThingsBoard before adding nurse accounts.
                    </span>
                  )}
                  {customerLoading && (
                    <span className="role-hint">Loading customers from ThingsBoard...</span>
                  )}
                </label>
              )}

              {selectedRole && (
                <p className="role-hint">{selectedRole.description}</p>
              )}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creating account...' : 'Create staff account'}
              </button>
            </form>

            {error && (
              <div className="panel__notice error">
                {error}
              </div>
            )}

            {success && (
              <div className="panel__notice success">
                {success}
              </div>
            )}

            {activationLink && (
              <div className="panel__notice info">
                <strong>Activation link:</strong>
                <span>{activationLink}</span>
                <p className="activation-hint">
                  Share this link if automated emails are disabled in ThingsBoard.
                </p>
              </div>
            )}
          </section>
        ) : (
          <section className="panel panel--step2 panel--placeholder">
            <header className="panel__header">
              <span className="panel__tag">Step 2</span>
              <h2>Create doctor / nurse account</h2>
            </header>
            <div className="panel__placeholder">
              <p>
                Step 2 unlocks once a tenant administrator is authenticated. Complete the verification above to continue.
              </p>
            </div>
          </section>
        )}
      </main>

      <footer className="staff-signup__footer">
        <span>Need help? support@nicu-monitor.io</span>
      </footer>
    </div>
  );
}

export default StaffSignup;


