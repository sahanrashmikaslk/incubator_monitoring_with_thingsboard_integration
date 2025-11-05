import React from 'react';
import '../Clinical/Sidebar.css';

const mainSections = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <rect x="13.5" y="3.5" width="7" height="4.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <rect x="13.5" y="11" width="7" height="9.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    )
  },
  {
    id: 'systems',
    label: 'Pi systems',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 19h8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M9 9h6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M9 12h6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'nte',
    label: 'NTE guidance',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 14.5V7a2 2 0 10-4 0v7.5a3 3 0 104 0z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 10.5h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'access',
    label: 'Access & parents',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16 8a4 4 0 11-8 0 4 4 0 018 0z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 19a6 6 0 0112 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M19 11.5a3 3 0 11-3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M19.5 19a3.5 3.5 0 00-4.6-3.3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'logs',
    label: 'Telemetry log',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 8h6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M9 12h6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M9 16h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  }
];

const footerSections = [
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 9a3 3 0 100 6 3 3 0 000-6z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    id: 'test-dashboard',
    label: 'Pi dashboard',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.5 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-7.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 11l8-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 3h5v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
];

function AdminSidebar({ current, onSelect }) {
  const renderButton = (item) => (
    <button
      key={item.id}
      type="button"
      className={`sidebar-item ${current === item.id ? 'active' : ''}`}
      onClick={() => onSelect && onSelect(item.id)}
      aria-label={item.label}
    >
      <span className="sidebar-icon">{item.icon}</span>
      <span className="sidebar-tooltip">{item.label}</span>
    </button>
  );

  return (
    <aside className="clinical-sidebar admin-sidebar" role="navigation" aria-label="Admin sections">
      <div className="sidebar-rail">
        <nav className="sidebar-nav">
          {mainSections.map(renderButton)}
        </nav>

        <div className="sidebar-footer">
          {footerSections.map(renderButton)}
        </div>
      </div>
    </aside>
  );
}

export default AdminSidebar;
