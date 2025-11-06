import React from 'react';
import './Sidebar.css';

function Sidebar({ current, onSelect }) {
  const items = [
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
      id: 'vitals',
      label: 'Vital monitoring',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 13h2.6l2.3-5 3.1 10 2.2-5H20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.5 10.5a3.25 3.25 0 116.13-1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.35"
          />
        </svg>
      )
    },
    {
      id: 'nte',
      label: 'Thermal guidance',
      icon: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 5a2 2 0 10-4 0v7.2a4 4 0 106.5 3.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 7a1.5 1.5 0 00-3 0v6.1a2.5 2.5 0 103.8 2.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 14h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
    },
    {
      id: 'jaundice',
      label: 'Jaundice detection',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 4.5c-2.7 3.4-5 6.4-5 9a5 5 0 1010 0c0-2.6-2.3-5.6-5-9z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    },
    {
      id: 'cry',
      label: 'Cry analysis',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 9v6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M9 7v10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M13 9v6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          {/* <path d="M17 8a4 4 0 010 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /> */}
          <path d="M19.5 7.5a6 6 0 010 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    },
    {
      id: 'video',
      label: 'Live video',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="7" width="11" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M15 10l5-3v10l-5-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    }
  ];

  return (
    <aside className="clinical-sidebar" role="navigation" aria-label="Clinical sections">
      <div className="sidebar-rail">
        <button
          type="button"
          className="sidebar-logo"
          aria-label="Dashboard overview"
          onClick={() => onSelect && onSelect('overview')}
        >
          <span>🏥</span>
        </button>

        <nav className="sidebar-nav">
          {items.map(item => (
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
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className={`sidebar-item ${current === 'settings' ? 'active' : ''}`}
            onClick={() => onSelect && onSelect('settings')}
            aria-label="Settings"
          >
            <span className="sidebar-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M5 6.5h14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M5 12h10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M5 17.5h14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <circle
                  cx="14"
                  cy="6.5"
                  r="2.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <circle
                  cx="10"
                  cy="12"
                  r="2.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <circle
                  cx="16"
                  cy="17.5"
                  r="2.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            </span>
            <span className="sidebar-tooltip">Settings</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
