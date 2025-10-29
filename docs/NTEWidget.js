/**
 * NTE Widget Component
 * Displays NTE recommendations for the selected baby
 */

import React, { useState, useEffect } from 'react';
import nteService from '../../services/nte.service';
import notificationService from '../../services/notification.service';
import './NTEWidget.css';

function NTEWidget({ activeBaby, vitals, onBabyChange }) {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch recommendations
  const fetchRecommendations = async () => {
    if (!activeBaby) return;

    setLoading(true);
    setError(null);

    try {
      // Extract values from vitals (handle ThingsBoard format)
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
        air_temp: null, // Hardcoded 28°C on server
        skin_temp: extractValue(vitals?.skin_temp),
        humidity: extractValue(vitals?.humidity)
      };

      const result = await nteService.getRecommendations(activeBaby.baby_id, readings);
      setRecommendations(result.data);
      
      // Create notification if there are critical/warning recommendations
      if (result.data && result.data.advice && result.data.advice.length > 0) {
        notificationService.createNTENotification({
          baby_id: activeBaby.baby_id,
          nte_range: result.data.nte_range,
          advice: result.data.advice
        });
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      setError(err.message || 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh recommendations
  useEffect(() => {
    if (activeBaby && autoRefresh) {
      fetchRecommendations();
      const interval = setInterval(fetchRecommendations, 60000); // Every 60 seconds
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBaby, autoRefresh]);

  // Fetch on baby change
  useEffect(() => {
    if (activeBaby) {
      fetchRecommendations();
    } else {
      setRecommendations(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBaby]);

  // Fetch when vitals change (skin temp or humidity updated)
  useEffect(() => {
    if (activeBaby && vitals && (vitals.skin_temp || vitals.humidity)) {
      // Debounce to avoid too many calls
      const timer = setTimeout(() => {
        fetchRecommendations();
      }, 2000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vitals?.skin_temp, vitals?.humidity]);

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  };

  const getSeverityClass = (severity) => {
    return severity || 'info';
  };

  if (!activeBaby) {
    return (
      <div className="nte-widget empty">
        <div className="nte-header">
          <h3>🌡️ NTE Recommendations</h3>
        </div>
        <div className="nte-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <p>No baby selected</p>
          <small>Register and select a baby to view NTE recommendations</small>
        </div>
      </div>
    );
  }

  return (
    <div className="nte-widget">
      <div className="nte-header">
        <div className="header-left">
          <h3>NTE Recommendations</h3>
          {/* <span className="baby-info">
            {activeBaby.name ? `${activeBaby.name} (${activeBaby.baby_id})` : activeBaby.baby_id}
          </span> */}
        </div>
        <div className="header-actions">
          <button
            onClick={fetchRecommendations}
            disabled={loading}
            className="btn-refresh-nte"
            title="Refresh recommendations"
          >
            <svg className={loading ? 'spinning' : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`btn-auto-refresh ${autoRefresh ? 'active' : ''}`}
            title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {autoRefresh ? 'Auto' : 'Manual'}
          </button>
        </div>
      </div>

      <div className="nte-content">
        {/* Baby Info */}
        {/* <div className="baby-details"> */}
          {/* <div className="detail-item"> */}
            {/* <span className="label">Age:</span>
            <span className="value">
              {recommendations?.age_hours 
                ? `${recommendations.age_hours.toFixed(1)}h (${Math.floor(recommendations.age_hours / 24)}d)` 
                : activeBaby.age_hours 
                ? `${activeBaby.age_hours.toFixed(1)}h (${Math.floor(activeBaby.age_hours / 24)}d)`
                : '0h (0d)'}
            </span> */}
          {/* </div> */}
          {/* <div className="detail-item"> */}
            {/* <span className="label">Weight:</span>
            <span className="value">{activeBaby.weight_g}g</span> */}
          {/* </div> */}
        {/* </div> */}

        {error && (
          <div className="nte-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
            <button onClick={fetchRecommendations} className="btn-retry">
              Try Again
            </button>
          </div>
        )}

        {loading && !recommendations && (
          <div className="nte-loading">
            <div className="spinner-large"></div>
            <p>Calculating recommendations...</p>
          </div>
        )}

        {recommendations && (
          <>
            {/* NTE Range */}
            {recommendations.nte_range && (
              <div className="nte-range-card">
                <div className="range-label">NTE Range</div>
                <div className="range-value">
                  {recommendations.nte_range[0].toFixed(1)}°C - {recommendations.nte_range[1].toFixed(1)}°C
                </div>
                <div className="range-description">Target air temperature range</div>
              </div>
            )}

            {/* Current Readings - Use live vitals */}
            {/* <div className="current-readings"> */}
              {/* <div className="reading-item">
                <div className="reading-label">Air Temp</div>
                <div className="reading-value">28°C</div>
              </div> */}
              {/* <div className="reading-item">
                <div className="reading-label">Skin Temp</div>
                <div className="reading-value">
                  {vitals?.skin_temp ? `${vitals.skin_temp.toFixed(1)}°C` : '--'}
                </div> */}
              {/* </div> */}
              {/* <div className="reading-item">
                <div className="reading-label">Humidity</div>
                <div className="reading-value">
                  {vitals?.humidity ? `${vitals.humidity.toFixed(0)}%` : '--'}
                </div>
              </div> */}
            {/* </div> */}

            {/* Recommendations */}
            <div className="recommendations-section">
              <h4>Recommendations</h4>
              {recommendations.advice && recommendations.advice.length > 0 ? (
                <div className="advice-list">
                  {recommendations.advice.map((advice, index) => (
                    <div key={index} className={`advice-item ${getSeverityClass(advice.severity)}`}>
                      <div className="advice-header">
                        <span className="severity-icon">{getSeverityIcon(advice.severity)}</span>
                        <span className="advice-message">{advice.message}</span>
                      </div>
                      {advice.detail && (
                        <div className="advice-detail">{advice.detail}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-advice">
                  <p>No specific recommendations at this time.</p>
                  <small>All parameters are within normal range</small>
                </div>
              )}
            </div>

            {/* Timestamp */}
            {recommendations.timestamp && (
              <div className="nte-timestamp">
                Last updated: {new Date(recommendations.timestamp).toLocaleString()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default NTEWidget;
