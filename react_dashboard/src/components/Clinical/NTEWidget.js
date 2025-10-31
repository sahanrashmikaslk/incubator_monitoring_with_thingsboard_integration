/**
 * NTE Widget Component
 * Presents incubator thermal environment recommendations with a modern, theme-aware UI.
 */

import React, { useEffect, useMemo, useState } from 'react';
import nteService from '../../services/nte.service';
import notificationService from '../../services/notification.service';
import './NTEWidget.css';

const thermostatIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M9 4a3 3 0 116 0v7.382A4.5 4.5 0 1112 21a4.5 4.5 0 01-3-8.618V4z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 14a2 2 0 00-2 2 2 2 0 004 0 2 2 0 00-2-2z"
      fill="currentColor"
      opacity="0.2"
    />
    <path
      d="M12 8v4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const severityOrder = {
  critical: 3,
  warning: 2,
  info: 1
};

function NTEWidget({ activeBaby, vitals, onBabyChange, compact = false }) {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const highestSeverity = useMemo(() => {
    if (!recommendations?.advice || recommendations.advice.length === 0) {
      return 'info';
    }

    return recommendations.advice.reduce((acc, item) => {
      const level = severityOrder[item.severity] || 1;
      return level > severityOrder[acc] ? item.severity : acc;
    }, 'info');
  }, [recommendations]);

  const widgetVariant = useMemo(() => {
    if (highestSeverity === 'critical') return 'critical';
    if (highestSeverity === 'warning') return 'warning';
    return 'normal';
  }, [highestSeverity]);

  const fetchRecommendations = async () => {
    if (!activeBaby) return;

    setLoading(true);
    setError(null);

    try {
      const extractValue = (field) => {
        if (!field) return null;
        if (Array.isArray(field) && field.length > 0) {
          return field[0].value;
        }
        if (typeof field === 'object' && 'value' in field) {
          return field.value;
        }
        if (typeof field === 'number') {
          return field;
        }
        return null;
      };

      const readings = {
        air_temp: null,
        skin_temp: extractValue(vitals?.skin_temp),
        humidity: extractValue(vitals?.humidity)
      };

      const result = await nteService.getRecommendations(activeBaby.baby_id, readings);
      setRecommendations(result.data);

      if (result.data && result.data.advice && result.data.advice.length > 0) {
        notificationService.createNTENotification({
          baby_id: activeBaby.baby_id,
          nte_range: result.data.nte_range,
          advice: result.data.advice
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeBaby && autoRefresh) {
      fetchRecommendations();
      const interval = setInterval(fetchRecommendations, 60000);
      return () => clearInterval(interval);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBaby, autoRefresh]);

  useEffect(() => {
    if (activeBaby) {
      fetchRecommendations();
    } else {
      setRecommendations(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBaby]);

  useEffect(() => {
    if (activeBaby && vitals && (vitals.skin_temp || vitals.humidity)) {
      const timer = setTimeout(fetchRecommendations, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vitals?.skin_temp, vitals?.humidity]);

  const renderAdviceIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 8v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1.1" fill="currentColor" />
          </svg>
        );
      case 'warning':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4.5 19.5l7.5-15 7.5 15h-15z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path d="M12 10v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 6a9 9 0 019 9H3a9 9 0 019-9z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <circle cx="12" cy="13.5" r="1.2" fill="currentColor" />
          </svg>
        );
    }
  };

  if (!activeBaby) {
    return (
      <div className="nte-widget nte-widget--empty">
        <div className="widget-header">
          <div className="widget-title">
            <div className="widget-icon">{thermostatIcon}</div>
            <div className="widget-copy">
              <h3>NTE Recommendations</h3>
              <p>Thermal environment guidance</p>
            </div>
          </div>
        </div>
        <div className="empty-state">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M12 6v12m6-6H6" />
          </svg>
          <p>Select a baby to view personalised NTE insights.</p>
          <small>Register a patient from the clinical sidebar to begin.</small>
        </div>
      </div>
    );
  }

  return (
    <div className={`nte-widget status-${widgetVariant}`}>
      <div className="widget-header">
        <div className="widget-title">
          <div className="widget-icon">{thermostatIcon}</div>
          <div className="widget-copy">
            <h3>NTE Recommendations</h3>
            <p>Thermal environment guidance</p>
          </div>
        </div>
        <div className="widget-actions">
          <button
            type="button"
            className={`btn-chip ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh((prev) => !prev)}
          >
            <span className="chip-indicator" aria-hidden="true"></span>
            {autoRefresh ? 'Auto refresh' : 'Manual mode'}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={fetchRecommendations}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className={loading ? 'spin' : ''}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
                d="M16.5 7.5l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Refresh now
          </button>
        </div>
      </div>

      <div className={`nte-status variant-${widgetVariant}`}>
        <div className="status-content">
          <span className="status-label">Environment outlook</span>
          <strong className="status-headline">
            {widgetVariant === 'critical' && 'Immediate action recommended'}
            {widgetVariant === 'warning' && 'Attention required'}
            {widgetVariant === 'normal' && 'Within expected range'}
          </strong>
          <span className="status-subtext">
            {widgetVariant === 'critical' &&
              'One or more recommendations flagged as critical. Review guidance below.'}
            {widgetVariant === 'warning' &&
              'Moderate adjustments suggested to maintain optimal incubator conditions.'}
            {widgetVariant === 'normal' &&
              'All monitored parameters currently sit within the ideal range.'}
          </span>
        </div>
      </div>

      <div className="nte-content">
        {!compact && (
          <div className="baby-summary">
            <div className="summary-item">
              <span className="summary-label">Baby ID</span>
              <span className="summary-value">{activeBaby.baby_id}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Age</span>
              <span className="summary-value">
                {recommendations?.age_hours
                  ? `${recommendations.age_hours.toFixed(1)}h (${Math.floor(
                      recommendations.age_hours / 24
                    )}d)`
                  : activeBaby.age_hours
                  ? `${activeBaby.age_hours.toFixed(1)}h (${Math.floor(activeBaby.age_hours / 24)}d)`
                  : '0h (0d)'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Weight</span>
              <span className="summary-value">
                {activeBaby.weight_g ? `${activeBaby.weight_g} g` : '—'}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="nte-error">
            <div className="error-glyph">!</div>
            <div className="error-copy">
              <strong>Unable to update recommendations</strong>
              <p>{error}</p>
            </div>
            <button type="button" className="btn-ghost" onClick={fetchRecommendations}>
              Try again
            </button>
          </div>
        )}

        {loading && !recommendations && (
          <div className="nte-loading">
            <div className="spinner"></div>
            <p>Calculating personalised incubator guidance…</p>
          </div>
        )}

        {recommendations && (
          <>
            {recommendations.nte_range && (
              <div className="nte-range">
                <div className="range-meta">
                  <span className="range-label">Target neutral thermal environment</span>
                  <span className="range-value">
                    {`${recommendations.nte_range[0].toFixed(1)}\u00B0C`} –{' '}
                    {`${recommendations.nte_range[1].toFixed(1)}\u00B0C`}
                  </span>
                </div>
                <p className="range-description">
                  Keep ambient air temperature within this band to minimise infant energy
                  expenditure.
                </p>
              </div>
            )}

            {!compact && (
              <div className="nte-readings">
                <div className="reading-card">
                  <span className="reading-label">Air temperature</span>
                  <strong className="reading-value">28 C</strong>
                  <span className="reading-footnote">Configured incubator setting</span>
                </div>
                <div className="reading-card">
                  <span className="reading-label">Skin temperature</span>
                  <strong className="reading-value">
                    {vitals?.skin_temp ? `${vitals.skin_temp.toFixed(1)}\u00B0C` : '—'}
                  </strong>
                  <span className="reading-footnote">Continuous probe reading</span>
                </div>
                <div className="reading-card">
                  <span className="reading-label">Humidity</span>
                  <strong className="reading-value">
                    {vitals?.humidity ? `${vitals.humidity.toFixed(0)}%` : '—'}
                  </strong>
                  <span className="reading-footnote">Ambient saturation</span>
                </div>
              </div>
            )}

            <div className="advice-section">
              <div className="advice-header">
                <h4>Recommended actions</h4>
                <span className="advice-count">
                  {recommendations.advice && recommendations.advice.length > 0
                    ? `${recommendations.advice.length} item${
                        recommendations.advice.length > 1 ? 's' : ''
                      }`
                    : 'No actions'}
                </span>
              </div>

              {recommendations.advice && recommendations.advice.length > 0 ? (
                <div className="advice-list">
                  {recommendations.advice.map((advice, index) => (
                    <div key={`${advice.message}-${index}`} className={`advice-card severity-${advice.severity || 'info'}`}>
                      <div className="advice-icon">{renderAdviceIcon(advice.severity)}</div>
                      <div className="advice-copy">
                        <strong>{advice.message}</strong>
                        {advice.detail && <p>{advice.detail}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-advice">
                  <div className="no-advice-icon">✓</div>
                  <div className="no-advice-copy">
                    <strong>No adjustments required</strong>
                    <p>All indicators are within the neutral thermal envelope.</p>
                  </div>
                </div>
              )}
            </div>

            {recommendations.timestamp && (
              <div className="nte-timestamp">
                Updated {new Date(recommendations.timestamp).toLocaleString()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default NTEWidget;
