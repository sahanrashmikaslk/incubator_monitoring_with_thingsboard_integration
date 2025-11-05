import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from './AdminSidebar';
import {
  fetchSystemSnapshot,
  getTestDashboardUrl,
  DEFAULT_PI_HOST
} from '../../services/admin.service';
import parentService from '../../services/parent.service';
import Logo from '../../images/logo.png';
import './AdminPanel.css';

const SNAPSHOT_REFRESH_MS = 45_000;
const MAX_RELATIVE_MINUTES = 90;

const ICONS = {
  power: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M7.5 6.5a7.5 7.5 0 103 12.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  ),
  lcd: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 19h8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="7.5" y="8" width="9" height="4" rx="0.8" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  cry: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 13h2.5l2.2-4.8L12 18l2.2-5H20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7.5 10.5a3 3 0 115.9-1.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  jaundice: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.5c-2.7 3.4-5 6.4-5 9a5 5 0 1010 0c0-2.6-2.3-5.6-5-9z" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  nte: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 8l6-4 6 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 10v7a2 2 0 01-2 2H8a2 2 0 01-2-2v-7" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 18h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  access: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 8a4 4 0 11-8 0 4 4 0 018 0z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 19a6 6 0 0112 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M19 11.5a3 3 0 11-3-3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M19.5 19a3.5 3.5 0 00-4.6-3.3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 4v6h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 20v-6h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 10a8 8 0 00-8-6 7.8 7.8 0 00-5.6 2.4M4 14a8 8 0 008 6 7.8 7.8 0 005.6-2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 2.5v2.5M12 19v2.5M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M2.5 12H5M19 12h2.5M4.8 19.2l1.8-1.8M17.4 6.6l1.8-1.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 12.6A8.5 8.5 0 0111.4 4 6.5 6.5 0 0012 17.5a6.4 6.4 0 008-4.9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
};

const TONE_CLASS = {
  ok: 'status-card--ok',
  warning: 'status-card--warning',
  alert: 'status-card--alert',
  muted: 'status-card--muted'
};

const parseThrottledFlags = (raw) => {
  if (!raw || typeof raw !== 'string') {
    return { raw, value: null };
  }
  const trimmed = raw.trim();
  const value = trimmed.startsWith('0x') ? parseInt(trimmed, 16) : parseInt(trimmed, 10);
  if (Number.isNaN(value)) {
    return { raw: trimmed, value: null };
  }
  return {
    raw: trimmed,
    value,
    underVoltage: Boolean(value & 0x1),
    frequencyCapped: Boolean(value & 0x2),
    currentlyThrottled: Boolean(value & 0x4),
    temperatureLimit: Boolean(value & 0x8),
    underVoltageHistory: Boolean(value & 0x10000),
    frequencyHistory: Boolean(value & 0x20000),
    throttledHistory: Boolean(value & 0x40000),
    temperatureHistory: Boolean(value & 0x80000)
  };
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '—';
  const numeric = Number(timestamp);
  const millis = Number.isFinite(numeric) && numeric > 1_000_000_000 ? numeric * 1000 : Date.parse(timestamp);
  if (!Number.isFinite(millis)) return '—';

  const deltaMs = Date.now() - millis;
  if (deltaMs < 0) return 'just now';

  const minutes = Math.floor(deltaMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < MAX_RELATIVE_MINUTES) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatUptime = (uptimeHours) => {
  if (!Number.isFinite(uptimeHours)) return 'unknown';
  if (uptimeHours < 1) {
    return `${Math.round(uptimeHours * 60)} min`;
  }
  if (uptimeHours < 24) {
    return `${uptimeHours.toFixed(1)} h`;
  }

  const days = Math.floor(uptimeHours / 24);
  const hours = Math.round(uptimeHours % 24);
  return `${days}d ${hours}h`;
};

function StatusCard({ icon, title, value, tone = 'muted', description, footer }) {
  return (
    <article className={`status-card ${TONE_CLASS[tone] || ''}`}>
      <div className="status-card__icon">{icon}</div>
      <div className="status-card__content">
        <span className="status-card__title">{title}</span>
        <span className="status-card__value">{value}</span>
        {description && <p className="status-card__description">{description}</p>}
        {footer && <span className="status-card__footer">{footer}</span>}
      </div>
    </article>
  );
}

function MetricPill({ label, value, hint }) {
  return (
    <div className="metric-pill">
      <span className="metric-pill__label">{label}</span>
      <span className="metric-pill__value">{value}</span>
      {hint && <span className="metric-pill__hint">{hint}</span>}
    </div>
  );
}

function RecommendationCard({ item }) {
  return (
    <article className="recommendation-card">
      <header className="recommendation-card__header">
        <span className="recommendation-card__icon">✓</span>
        <div>
          <h3>{item?.title || 'Recommendation'}</h3>
          {item?.category && <span className="recommendation-card__badge">{item.category}</span>}
        </div>
      </header>
      {item?.summary && <p className="recommendation-card__summary">{item.summary}</p>}
      {item?.details && (
        <ul className="recommendation-card__list">
          {item.details.map((detail, index) => (
            <li key={index}>{detail}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('adminTheme') === 'dark' ? 'dark' : 'light';
  });
  const [section, setSection] = useState('overview');
  const [snapshot, setSnapshot] = useState(null);
  const [snapshotError, setSnapshotError] = useState('');
  const [isRefreshingSnapshot, setRefreshingSnapshot] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [parentQueue, setParentQueue] = useState([]);
  const [parentError, setParentError] = useState('');

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('adminTheme', next);
      }
      return next;
    });
  }, []);

  const loadSnapshot = useCallback(async () => {
    setRefreshingSnapshot(true);
    try {
      const data = await fetchSystemSnapshot();
      setSnapshot(data);
      setSnapshotError('');
    } catch (error) {
      setSnapshotError(error?.message || 'Unable to reach edge device health services.');
    } finally {
      setRefreshingSnapshot(false);
      setSnapshotLoading(false);
    }
  }, []);

  const refreshParentQueue = useCallback(async () => {
    try {
      const entries = await parentService.listCameraAccessQueue();
      setParentQueue(entries || []);
      setParentError('');
    } catch (error) {
      setParentError(error?.message || 'Unable to reach parent engagement backend.');
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
    const timer = window.setInterval(loadSnapshot, SNAPSHOT_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadSnapshot]);

  useEffect(() => {
    refreshParentQueue();
  }, [refreshParentQueue]);

  const testDashboardUrl = useMemo(() => getTestDashboardUrl(snapshot?.piHost || DEFAULT_PI_HOST), [snapshot]);

  const powerStatus = useMemo(() => {
    const health = snapshot?.data?.health;
    if (!health) {
      return {
        tone: 'muted',
        value: 'Offline',
        description: 'No health telemetry received from edge device.',
        footer: null
      };
    }

    const flags = parseThrottledFlags(health.throttled);
    const issues = [];
    if (flags.underVoltage) issues.push('Undervoltage');
    if (flags.currentlyThrottled) issues.push('CPU throttled');
    if (flags.frequencyCapped) issues.push('Frequency capped');
    if (flags.temperatureLimit) issues.push('Temp limit');

    const hasIssue = issues.length > 0;
    const tone = hasIssue ? (flags.underVoltage ? 'alert' : 'warning') : 'ok';
    const footerParts = [];
    if (flags.underVoltageHistory) footerParts.push('undervoltage flagged before');
    if (flags.throttledHistory) footerParts.push('throttled previously');

    return {
      tone,
      value: hasIssue ? 'Attention needed' : 'Nominal',
      description: hasIssue ? issues.join(' • ') : 'Power rails stable and within limits.',
      footer: flags.raw ? `cgencmd: ${flags.raw}` : footerParts.length ? footerParts.join(' • ') : null
    };
  }, [snapshot]);

  const lcdStatus = useMemo(() => {
    const lcd = snapshot?.data?.lcd;
    if (!lcd) {
      if (snapshot?.errors?.lcd) {
        return { tone: 'alert', value: 'Unavailable', description: snapshot.errors.lcd };
      }
      return { tone: 'muted', value: 'Pending', description: 'Awaiting LCD reader response.' };
    }

    const readings = lcd.readings || {};
    const keys = Object.keys(readings);
    if (lcd.status === 'success' && keys.length) {
      const summary = keys
        .map((key) => {
          const item = readings[key];
          const label = item?.name || key;
          const value = item?.value ?? item;
          const unit = item?.unit || '';
          return `${label}: ${value}${unit}`;
        })
        .join(' • ');
      const timestamp = typeof lcd.timestamp === 'number' ? lcd.timestamp * 1000 : lcd.timestamp;
      return {
        tone: 'ok',
        value: `${keys.length} parameters`,
        description: summary,
        footer: timestamp ? `Updated ${formatRelativeTime(timestamp)}` : null
      };
    }

    if (lcd.status === 'no_data') {
      return { tone: 'warning', value: 'No readings yet', description: lcd.message || 'LCD camera stream reachable, awaiting OCR pass.' };
    }

    return {
      tone: 'warning',
      value: lcd.status || 'Check reader',
      description: lcd.message || 'LCD reader responded without usable telemetry.'
    };
  }, [snapshot]);

  const cryStatus = useMemo(() => {
    const cry = snapshot?.data?.cry;
    if (!cry) {
      if (snapshot?.errors?.cry) {
        return { tone: 'alert', value: 'Offline', description: snapshot.errors.cry };
      }
      return { tone: 'muted', value: 'No data', description: 'Cry service not responding.' };
    }

    const lastEvent = cry.last_event || cry.latestEvent || cry.event;
    const label = lastEvent?.classification || lastEvent?.type || cry.state;
    const confidence = Number.isFinite(lastEvent?.confidence) ? `Confidence ${(lastEvent.confidence * 100).toFixed(0)}%` : null;
    return {
      tone: 'ok',
      value: label ? `${label}` : 'Monitoring',
      description: confidence || 'Listening for cry events.',
      footer: lastEvent?.timestamp ? `Last event ${formatRelativeTime(lastEvent.timestamp)}` : null
    };
  }, [snapshot]);

  const jaundiceStatus = useMemo(() => {
    const jaundice = snapshot?.data?.jaundice;
    if (!jaundice) {
      if (snapshot?.errors?.jaundice) {
        return { tone: 'warning', value: 'No feed', description: snapshot.errors.jaundice };
      }
      return { tone: 'muted', value: 'Pending', description: 'Awaiting jaundice inference results.' };
    }

    const score = jaundice.score ?? jaundice.result?.score ?? jaundice.bilirubin_index;
    const risk = jaundice.risk ?? jaundice.result?.risk ?? jaundice.classification;
    return {
      tone: risk && /high|critical/i.test(risk) ? 'alert' : 'ok',
      value: risk ? `${risk}` : 'Latest score',
      description: score ? `Index ${score}` : 'Jaundice server responded.'
    };
  }, [snapshot]);

  const nteSummary = useMemo(() => {
    const payload = snapshot?.data?.nte;
    if (!payload) {
      if (snapshot?.errors?.nte) {
        return { tone: 'alert', headline: 'NTE offline', body: snapshot.errors.nte, recommendations: [], activeBaby: null };
      }
      return { tone: 'muted', headline: 'No data', body: 'Thermal guidance engine not reached yet.', recommendations: [], activeBaby: null };
    }

    const activeBaby = payload.activeBaby || null;
    const recommendations = Array.isArray(payload.recommendations) ? payload.recommendations : [];
    const count = recommendations.length;
    const headline = count > 0 ? `${count} suggestions ready` : 'Monitoring baseline';
    const body = activeBaby?.details?.summary || activeBaby?.details?.status || 'NTE engine responded successfully.';

    return {
      tone: count > 0 ? 'ok' : 'warning',
      headline,
      body,
      recommendations,
      activeBaby
    };
  }, [snapshot]);

  const healthMetrics = useMemo(() => {
    const health = snapshot?.data?.health;
    if (!health) return [];
    const metrics = [];
    if (Number.isFinite(health.cpu)) {
      metrics.push({ label: 'CPU load', value: `${health.cpu}%` });
    }
    if (Number.isFinite(health.ram)) {
      metrics.push({ label: 'Memory use', value: `${health.ram}%` });
    }
    if (Number.isFinite(health.temp)) {
      metrics.push({ label: 'CPU temp', value: `${health.temp}°C` });
    }
    if (health.load && typeof health.load === 'object') {
      metrics.push({ label: 'Load avg', value: `${health.load['1m']}` });
    }
    if (Number.isFinite(health.uptime)) {
      metrics.push({ label: 'Uptime', value: formatUptime(health.uptime) });
    }
    return metrics;
  }, [snapshot]);

  const overviewCards = [
    { key: 'power', icon: ICONS.power, title: 'Power status', ...powerStatus },
    { key: 'lcd', icon: ICONS.lcd, title: 'LCD reader', ...lcdStatus },
    { key: 'cry', icon: ICONS.cry, title: 'Cry pipeline', ...cryStatus },
    { key: 'jaundice', icon: ICONS.jaundice, title: 'Jaundice AI', ...jaundiceStatus },
    { key: 'nte', icon: ICONS.nte, title: 'NTE guidance', tone: nteSummary.tone, value: nteSummary.headline, description: nteSummary.body }
  ];

  const lastUpdated = snapshot?.timestamp ? formatRelativeTime(snapshot.timestamp) : '—';

  const renderOverview = () => (
    <section className="panel-section">
      <header className="panel-section__header">
        <div>
          <h2>Cluster overview</h2>
          <p>Live snapshot from edge device services and analytics.</p>
        </div>
        <div className="panel-section__meta">
          <span className="meta-chip">Pi host: {snapshot?.piHost || DEFAULT_PI_HOST}</span>
          <span className="meta-chip">Refreshed {lastUpdated}</span>
        </div>
      </header>

      <div className="status-grid">
        {overviewCards.map((card) => (
          <StatusCard
            key={card.key}
            icon={card.icon}
            title={card.title}
            value={card.value}
            tone={card.tone}
            description={card.description}
            footer={card.footer}
          />
        ))}
      </div>

      {healthMetrics.length > 0 && (
        <div className="metrics-bar">
          {healthMetrics.map((metric) => (
            <MetricPill key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} />
          ))}
        </div>
      )}
    </section>
  );

  const renderSystems = () => (
    <section className="panel-section">
      <header className="panel-section__header">
        <div>
          <h2>Edge device services</h2>
          <p>Monitor Edge Device subsystems, power envelope, and inference services.</p>
        </div>
        <button type="button" className="ghost-button" onClick={loadSnapshot}>
          <span className="ghost-button__icon">{ICONS.refresh}</span>
          Refresh snapshot
        </button>
      </header>

      <div className="systems-layout">
        <div className="systems-card">
          <h3>Power &amp; health</h3>
          <div className="systems-card__body">
            <StatusCard
              icon={ICONS.power}
              title="Power rail"
              value={powerStatus.value}
              tone={powerStatus.tone}
              description={powerStatus.description}
              footer={powerStatus.footer}
            />
            {healthMetrics.length > 0 && (
              <div className="systems-metrics">
                {healthMetrics.map((metric) => (
                  <MetricPill key={`health-${metric.label}`} label={metric.label} value={metric.value} hint={metric.hint} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="systems-card">
          <h3>LCD reader</h3>
          <div className="systems-card__body">
            <StatusCard
              icon={ICONS.lcd}
              title="Incubator display"
              value={lcdStatus.value}
              tone={lcdStatus.tone}
              description={lcdStatus.description}
              footer={lcdStatus.footer}
            />
            {snapshot?.data?.lcd?.readings && (
              <div className="lcd-readings">
                {Object.entries(snapshot.data.lcd.readings).map(([key, value]) => {
                  const label = value?.name || key;
                  const display = typeof value === 'object' ? `${value.value ?? '—'}` : value;
                  const confidence = typeof value === 'object' && Number.isFinite(value.ocr_confidence)
                    ? `OCR ${(value.ocr_confidence * 100).toFixed(0)}%`
                    : null;
                  return <MetricPill key={key} label={label} value={display} hint={confidence} />;
                })}
              </div>
            )}
          </div>
        </div>

        <div className="systems-card">
          <h3>Cry pipeline</h3>
          <div className="systems-card__body">
            <StatusCard
              icon={ICONS.cry}
              title="Cry classifier"
              value={cryStatus.value}
              tone={cryStatus.tone}
              description={cryStatus.description}
              footer={cryStatus.footer}
            />
          </div>
        </div>

        <div className="systems-card">
          <h3>Jaundice inference</h3>
          <div className="systems-card__body">
            <StatusCard
              icon={ICONS.jaundice}
              title="Jaundice AI"
              value={jaundiceStatus.value}
              tone={jaundiceStatus.tone}
              description={jaundiceStatus.description}
              footer={jaundiceStatus.footer}
            />
          </div>
        </div>
      </div>
    </section>
  );

  const renderNte = () => (
    <section className="panel-section">
      <header className="panel-section__header">
        <div>
          <h2>Neutral Thermal Environment guidance</h2>
          <p>Review the latest incubator tuning suggestions and active baby context.</p>
        </div>
        <button type="button" className="ghost-button" onClick={loadSnapshot}>
          <span className="ghost-button__icon">{ICONS.refresh}</span>
          Pull latest NTE
        </button>
      </header>

      <div className="nte-summary">
        <StatusCard
          icon={ICONS.nte}
          title="NTE status"
          value={nteSummary.headline}
          tone={nteSummary.tone}
          description={nteSummary.body}
        />
        {nteSummary.activeBaby && typeof nteSummary.activeBaby === 'object' && (
          <div className="nte-active">
            <h3>Active baby</h3>
            <dl>
              <div>
                <dt>Baby ID</dt>
                <dd>{nteSummary.activeBaby.baby_id || nteSummary.activeBaby.babyId || nteSummary.activeBaby.baby_name || nteSummary.activeBaby.name || '—'}</dd>
              </div>
              {nteSummary.activeBaby.details?.weight && (
                <div>
                  <dt>Weight</dt>
                  <dd>{nteSummary.activeBaby.details.weight} g</dd>
                </div>
              )}
              {nteSummary.activeBaby.details?.gestation && (
                <div>
                  <dt>Gestation</dt>
                  <dd>{nteSummary.activeBaby.details.gestation}</dd>
                </div>
              )}
              {nteSummary.activeBaby.details?.temperature && (
                <div>
                  <dt>Incubator temp</dt>
                  <dd>{nteSummary.activeBaby.details.temperature} °C</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      {nteSummary.recommendations.length > 0 ? (
        <div className="recommendations-grid">
          {nteSummary.recommendations.map((item, index) => (
            <RecommendationCard key={item?.id || index} item={item} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No active recommendations. NTE engine is monitoring baseline profiles.</p>
        </div>
      )}
    </section>
  );

  const renderAccess = () => (
    <section className="panel-section">
      <header className="panel-section__header">
        <div>
          <h2>Parent access pipeline</h2>
          <p>Manage camera permissions and guide staff account provisioning.</p>
        </div>
        <div className="panel-section__actions">
          <button type="button" className="ghost-button" onClick={refreshParentQueue}>
            <span className="ghost-button__icon">{ICONS.refresh}</span>
            Refresh queue
          </button>
          <button type="button" className="ghost-button" onClick={() => navigate('/staff-signup')}>
            Provision staff account
          </button>
        </div>
      </header>

      <StatusCard
        icon={ICONS.access}
        title="Camera access queue"
        value={`${parentQueue.length} request(s)`}
        tone={parentQueue.length > 0 ? 'warning' : 'ok'}
        description={parentQueue.length > 0 ? 'Review pending parent camera access approvals below.' : 'No pending camera access requests.'}
      />

      {parentError && <div className="panel-notice panel-notice--warning">{parentError}</div>}

      {parentQueue.length > 0 ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Parent</th>
                <th>Phone</th>
                <th>Baby</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {parentQueue.map((entry) => (
                <tr key={`${entry.parentId}-${entry.timestamp}`}>
                  <td>{entry.parentName || entry.parentId}</td>
                  <td>{entry.phone || '—'}</td>
                  <td>{entry.babyId || '—'}</td>
                  <td>
                    <span className={`status-badge status-badge--${entry.status}`}>
                      {entry.status || 'unknown'}
                    </span>
                  </td>
                  <td>{entry.requestedAt ? formatRelativeTime(entry.requestedAt) : '—'}</td>
                  <td>{entry.updatedAt ? formatRelativeTime(entry.updatedAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>Queue is clear. Parents can request access via the portal when required.</p>
        </div>
      )}
    </section>
  );

  const renderLogs = () => (
    <section className="panel-section">
      <header className="panel-section__header">
        <div>
          <h2>Telemetry log</h2>
          <p>Cross-check service responses and error messages captured in the latest snapshot.</p>
        </div>
      </header>

      <div className="logs-grid">
        <div className="logs-column">
          <h3>Service responses</h3>
          {snapshot?.data ? (
            Object.entries(snapshot.data).map(([key, value]) => (
              <div key={key} className="log-entry">
                <strong>{key}</strong>
                <span className="log-entry__status">{value ? 'OK' : 'No payload'}</span>
                {value?.timestamp && <span className="log-entry__timestamp">{formatRelativeTime(value.timestamp)}</span>}
              </div>
            ))
          ) : (
            <p>No services responded.</p>
          )}
        </div>
        <div className="logs-column">
          <h3>Errors</h3>
          {snapshot?.errors && Object.keys(snapshot.errors).length > 0 ? (
            Object.entries(snapshot.errors).map(([key, reason]) => (
              <div key={key} className="log-entry log-entry--error">
                <strong>{key}</strong>
                <span className="log-entry__status">Error</span>
                <span className="log-entry__message">{reason}</span>
              </div>
            ))
          ) : (
            <p>No errors captured in the latest poll.</p>
          )}
        </div>
      </div>
    </section>
  );

  const renderSettings = () => (
    <section className="panel-section">
      <header className="panel-section__header">
        <div>
          <h2>Admin preferences</h2>
          <p>Adjust appearance, manage sessions, and reach Pi dashboards.</p>
        </div>
      </header>

      <div className="settings-grid">
        <div className="settings-card">
          <h3>Theme</h3>
          <p>Switch between the bright ward view and low-light theatre mode.</p>
          <button type="button" className="primary-button" onClick={toggleTheme}>
            <span className="primary-button__icon">{theme === 'dark' ? ICONS.sun : ICONS.moon}</span>
            {theme === 'dark' ? 'Use light mode' : 'Use dark mode'}
          </button>
        </div>

        <div className="settings-card">
          <h3>Snapshot</h3>
          <p>Force a refresh outside the automatic 45-second cadence.</p>
          <button type="button" className="outline-button" onClick={loadSnapshot}>
            <span className="outline-button__icon">{ICONS.refresh}</span>
            Refresh now
          </button>
        </div>

        <div className="settings-card">
          <h3>Staff provisioning</h3>
          <p>Launch the ThingsBoard staff onboarding wizard for new admin or nurse accounts.</p>
          <button type="button" className="outline-button" onClick={() => navigate('/staff-signup')}>
            Go to staff signup
          </button>
        </div>
      </div>
    </section>
  );

  const renderTestDashboard = () => (
    <section className="panel-section">
      <header className="panel-section__header">
        <div>
          <h2>Edge Device configuration dashboard</h2>
          <p>Embedded view of the edge-hosted monitoring dashboard (tailscale accessible).</p>
        </div>
        <a className="ghost-button" href={testDashboardUrl} target="_blank" rel="noreferrer">
          Open in new tab
        </a>
      </header>

      <div className="iframe-wrapper">
        <iframe title="Edge Device configuration dashboard" src={testDashboardUrl} allow="fullscreen" />
      </div>
    </section>
  );

  const renderContent = () => {
    switch (section) {
      case 'overview':
        return renderOverview();
      case 'systems':
        return renderSystems();
      case 'nte':
        return renderNte();
      case 'access':
        return renderAccess();
      case 'logs':
        return renderLogs();
      case 'settings':
        return renderSettings();
      case 'test-dashboard':
        return renderTestDashboard();
      default:
        return renderOverview();
    }
  };

  return (
    <div className={`admin-panel theme-${theme}`}>
      <header className="admin-header">
        <div className="admin-header__container">
          <div className="admin-brand">
            <div className="admin-brand__emblem">
              <img src={Logo} alt="NICU shield" />
            </div>
            <div className="admin-brand__text">
              <span className="admin-brand__title">National Hospital Galle</span>
              <span className="admin-brand__subtitle">NICU Monitoring Unit - Admin Edge device operations console</span>
            </div>
          </div>

          <div className="admin-header__actions">
            <button type="button" className="icon-button" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? ICONS.sun : ICONS.moon}
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={loadSnapshot}
              aria-label="Refresh snapshot"
            >
              {ICONS.refresh}
            </button>
            <div className="admin-user">
              <div className="admin-user__avatar">{user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}</div>
              <div className="admin-user__meta">
                <span className="admin-user__name">{user?.name || user?.email || 'Admin user'}</span>
                <span className="admin-user__role">Administrator</span>
              </div>
            </div>
            <button type="button" className="outline-button" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="admin-layout">
        <AdminSidebar current={section} onSelect={setSection} />

        <main className="admin-content">
          {snapshotLoading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Contacting edge device services…</p>
            </div>
          ) : (
            <>
              {snapshotError && <div className="panel-notice panel-notice--alert">{snapshotError}</div>}
              {renderContent()}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminPanel;
