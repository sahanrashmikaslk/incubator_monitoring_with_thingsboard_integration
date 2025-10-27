import React from 'react';
import './Sidebar.css';

function Sidebar({ current, onSelect }) {
  const items = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4.5 10.5L12 5l7.5 5.5V19a1 1 0 01-1 1h-4.5v-5.5h-4V20H5.5a1 1 0 01-1-1v-8.5z"
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
            d="M14 14.76V5.5a2.5 2.5 0 00-5 0v9.26a3.5 3.5 0 105 0z"
          />
          <path d="M10 11h4" />
        </svg>
      )
    },
    {
      id: 'jaundice',
      label: 'Jaundice detection',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 4.5l6.5 3.75V15.5L12 19.25 5.5 15.5V8.25L12 4.5z"
          />
          <circle cx="12" cy="11.75" r="2.25" />
        </svg>
      )
    },
    {
      id: 'cry',
      label: 'Cry analysis',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 9a5 5 0 1110 0v4a5 5 0 11-10 0V9z" />
          <path d="M9 16s1.5-1 3-1 3 1 3 1" />
        </svg>
      )
    },
    {
      id: 'video',
      label: 'Live video',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="7.5" width="11" height="9" rx="1.5" />
          <path d="M14.5 10.5l5-3v9l-5-3" />
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
                <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
                <path d="M19.4 15.5l1 1.73-1.5 2.6-2-.35a7.6 7.6 0 01-1.8 1l-.3 2H9.2l-.3-2a7.6 7.6 0 01-1.8-1l-2 .35-1.5-2.6 1-1.73a7.7 7.7 0 010-3.06l-1-1.73 1.5-2.6 2 .35a7.6 7.6 0 011.8-1l.3-2h3.8l.3 2a7.6 7.6 0 011.8 1l2-.35 1.5 2.6-1 1.73a7.7 7.7 0 010 3.06z" />
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
