/**
 * NTE Widget Component
 * Presents incubator thermal environment recommendations with a modern, theme-aware UI.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
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
  const { nteData } = useData();
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);

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

  // Helper function to extract value from ThingsBoard data format
  const extractTbValue = (tbData) => {
    if (!tbData || !Array.isArray(tbData) || tbData.length === 0) return null;
    const latest = tbData[0];
    return latest?.value !== undefined ? latest.value : null;
  };

  // Parse NTE data from ThingsBoard and update recommendations
  useEffect(() => {
    if (!nteData || !activeBaby) {
      setRecommendations(null);
      setError(null);
      return;
    }

    try {
      // Check if we have NTE data for the current baby
      const nteBabyId = extractTbValue(nteData.nte_baby_id);
      
      if (!nteBabyId || nteBabyId !== activeBaby.baby_id) {
        // No NTE data for this baby yet
        setRecommendations(null);
        setError(null);
        return;
      }

      // Extract NTE values from ThingsBoard
      const ageHours = extractTbValue(nteData.nte_age_hours) || 0;
      const weightG = extractTbValue(nteData.nte_weight_g) || activeBaby.weight_g || 0;
      const rangeMin = parseFloat(extractTbValue(nteData.nte_range_min));
      const rangeMax = parseFloat(extractTbValue(nteData.nte_range_max));
      const criticalCount = extractTbValue(nteData.nte_critical_count) || 0;
      const warningCount = extractTbValue(nteData.nte_warning_count) || 0;
      const infoCount = extractTbValue(nteData.nte_info_count) || 0;
      const latestAdvice = extractTbValue(nteData.nte_latest_advice);
      const latestDetail = extractTbValue(nteData.nte_latest_detail);
      const timestamp = extractTbValue(nteData.nte_timestamp);

      // Parse advice into structured format
      const advice = [];
      
      if (latestAdvice && latestAdvice !== 'None') {
        // Determine severity based on counts
        let severity = 'info';
        if (criticalCount > 0) {
          severity = 'critical';
        } else if (warningCount > 0) {
          severity = 'warning';
        }

        advice.push({
          message: latestAdvice,
          detail: latestDetail || '',
          severity: severity
        });
      }

      // Build recommendations object
      const recs = {
        baby_id: nteBabyId,
        age_hours: ageHours,
        weight_g: weightG,
        nte_range: (!isNaN(rangeMin) && !isNaN(rangeMax)) ? [rangeMin, rangeMax] : null,
        advice: advice,
        timestamp: timestamp && !isNaN(new Date(timestamp).getTime()) 
          ? new Date(timestamp).toISOString() 
          : new Date().toISOString(),
        critical_count: criticalCount,
        warning_count: warningCount,
        info_count: infoCount
      };

      setRecommendations(recs);
      setError(null);

      // Create notifications for critical/warning advice
      if (advice.length > 0 && (criticalCount > 0 || warningCount > 0)) {
        notificationService.createNTENotification({
          baby_id: nteBabyId,
          nte_range: recs.nte_range,
          advice: advice
        });
      }
    } catch (err) {
      console.error('Error parsing NTE data from database:', err);
      setError('Failed to parse NTE data');
    }
  }, [nteData, activeBaby]);

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
                  ? `${Number(recommendations.age_hours).toFixed(1)}h (${Math.floor(
                      Number(recommendations.age_hours) / 24
                    )}d)`
                  : activeBaby.age_hours
                  ? `${Number(activeBaby.age_hours).toFixed(1)}h (${Math.floor(Number(activeBaby.age_hours) / 24)}d)`
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
              <strong>Unable to load NTE data</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {!recommendations && !error && (
          <div className="nte-loading">
            <div className="spinner"></div>
            <p>Waiting for NTE calculations…</p>
          </div>
        )}

        {recommendations && (
          <>
            {recommendations.nte_range && Array.isArray(recommendations.nte_range) && (
              <div className="nte-range">
                <div className="range-meta">
                  <span className="range-label">Target neutral thermal environment</span>
                  <span className="range-value">
                    {`${Number(recommendations.nte_range[0]).toFixed(1)}\u00B0C`} –{' '}
                    {`${Number(recommendations.nte_range[1]).toFixed(1)}\u00B0C`}
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
                  <strong className="reading-value">
                    {vitals?.air_temp ? `${vitals.air_temp.toFixed(1)}\u00B0C` : '—'}
                  </strong>
                  <span className="reading-footnote">Live incubator reading</span>
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
