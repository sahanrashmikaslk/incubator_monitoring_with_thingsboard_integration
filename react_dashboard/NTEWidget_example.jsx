/**
 * NTE Widget for React Dashboard
 * Displays NTE recommendations from ThingsBoard
 */

import React, { useEffect, useState } from 'react';
import { Card, Badge, Progress, Divider } from 'antd';
import { AlertOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';

const NTEWidget = ({ thingsBoardData }) => {
  const [nteData, setNTEData] = useState(null);

  useEffect(() => {
    if (thingsBoardData) {
      setNTEData({
        babyId: extractValue(thingsBoardData.nte_baby_id, 'N/A'),
        ageHours: extractValue(thingsBoardData.nte_age_hours, 0),
        weightG: extractValue(thingsBoardData.nte_weight_g, 0),
        rangeMin: extractValue(thingsBoardData.nte_range_min, 0),
        rangeMax: extractValue(thingsBoardData.nte_range_max, 0),
        criticalCount: extractValue(thingsBoardData.nte_critical_count, 0),
        warningCount: extractValue(thingsBoardData.nte_warning_count, 0),
        infoCount: extractValue(thingsBoardData.nte_info_count, 0),
        latestAdvice: extractValue(thingsBoardData.nte_latest_advice, 'No advice available'),
        latestDetail: extractValue(thingsBoardData.nte_latest_detail, ''),
        timestamp: extractValue(thingsBoardData.nte_timestamp, 0)
      });
    }
  }, [thingsBoardData]);

  const extractValue = (field, defaultValue = 0) => {
    if (!field) return defaultValue;
    if (Array.isArray(field) && field.length > 0) {
      return field[0].value;
    }
    return defaultValue;
  };

  const getStatusColor = () => {
    if (!nteData) return 'gray';
    if (nteData.criticalCount > 0) return 'red';
    if (nteData.warningCount > 0) return 'orange';
    return 'green';
  };

  const getStatusIcon = () => {
    if (!nteData) return <InfoCircleOutlined />;
    if (nteData.criticalCount > 0) return <AlertOutlined style={{ color: 'red' }} />;
    if (nteData.warningCount > 0) return <AlertOutlined style={{ color: 'orange' }} />;
    return <CheckCircleOutlined style={{ color: 'green' }} />;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (!nteData) {
    return (
      <Card 
        title={<span>🌡️ NTE Recommendations</span>}
        style={{ height: '100%' }}
      >
        <p style={{ textAlign: 'center', color: '#999' }}>
          Waiting for NTE data...
        </p>
      </Card>
    );
  }

  return (
    <Card 
      title={<span>🌡️ NTE Recommendations</span>}
      extra={getStatusIcon()}
      style={{ height: '100%' }}
    >
      {/* Baby Information */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 8 }}>Baby: {nteData.babyId}</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span>Age: <strong>{nteData.ageHours.toFixed(1)} hours</strong></span>
          <span>Weight: <strong>{nteData.weightG}g</strong></span>
        </div>
      </div>

      <Divider />

      {/* NTE Range */}
      <div style={{ 
        padding: 16, 
        background: '#f0f5ff', 
        borderRadius: 8,
        marginBottom: 16,
        border: '2px solid #1890ff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
            NTE Range
          </div>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
            {nteData.rangeMin.toFixed(1)}°C - {nteData.rangeMax.toFixed(1)}°C
          </div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
            Target air temperature range
          </div>
        </div>
      </div>

      {/* Alert Counts */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {nteData.criticalCount > 0 && (
            <Badge 
              count={nteData.criticalCount} 
              style={{ backgroundColor: '#ff4d4f' }}
            >
              <span style={{ 
                padding: '4px 12px', 
                background: '#fff1f0',
                borderRadius: 4,
                fontSize: 12
              }}>
                🚨 Critical
              </span>
            </Badge>
          )}
          {nteData.warningCount > 0 && (
            <Badge 
              count={nteData.warningCount} 
              style={{ backgroundColor: '#faad14' }}
            >
              <span style={{ 
                padding: '4px 12px', 
                background: '#fffbe6',
                borderRadius: 4,
                fontSize: 12
              }}>
                ⚠️ Warnings
              </span>
            </Badge>
          )}
          {nteData.infoCount > 0 && (
            <Badge 
              count={nteData.infoCount} 
              style={{ backgroundColor: '#52c41a' }}
            >
              <span style={{ 
                padding: '4px 12px', 
                background: '#f6ffed',
                borderRadius: 4,
                fontSize: 12
              }}>
                ℹ️ Info
              </span>
            </Badge>
          )}
        </div>
      </div>

      {/* Latest Advice */}
      <div style={{ 
        padding: 12, 
        background: getStatusColor() === 'red' ? '#fff1f0' : 
                   getStatusColor() === 'orange' ? '#fffbe6' : '#f6ffed',
        borderRadius: 8,
        borderLeft: `4px solid ${getStatusColor()}`
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 13 }}>
          {nteData.latestAdvice}
        </div>
        {nteData.latestDetail && (
          <div style={{ fontSize: 11, color: '#666' }}>
            {nteData.latestDetail}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div style={{ 
        marginTop: 12, 
        textAlign: 'center', 
        fontSize: 11, 
        color: '#999' 
      }}>
        Last updated: {formatTimestamp(nteData.timestamp)}
      </div>
    </Card>
  );
};

export default NTEWidget;

/**
 * USAGE EXAMPLE:
 * 
 * In your ClinicalDashboard.js or ParentPortal.js:
 * 
 * import NTEWidget from '../components/NTEWidget';
 * import { useData } from '../../context/DataContext';
 * 
 * function Dashboard() {
 *   const { latestVitals } = useData();
 * 
 *   return (
 *     <div className="dashboard-grid">
 *       <NTEWidget thingsBoardData={latestVitals} />
 *     </div>
 *   );
 * }
 * 
 * INTEGRATION NOTES:
 * 
 * 1. Make sure DataContext.js fetches NTE telemetry keys from ThingsBoard
 * 2. Add to telemetry key list in thingsboard.service.js:
 *    keys: "nte_baby_id,nte_age_hours,nte_weight_g,nte_range_min,nte_range_max,
 *           nte_critical_count,nte_warning_count,nte_info_count,
 *           nte_latest_advice,nte_latest_detail,nte_timestamp"
 * 
 * 3. The widget will automatically update when new data arrives from ThingsBoard
 */
