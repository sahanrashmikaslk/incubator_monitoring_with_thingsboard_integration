// Use nginx proxy paths instead of direct Pi access
// In production, requests go through Cloud Run nginx → Tailscale proxy VM → Pi
const USE_PROXY = true; // Set to false only for local development with direct Pi access

const DEFAULT_PI_HOST = process.env.REACT_APP_PI_HOST || '100.89.162.22';
const HEALTH_PORT = Number(process.env.REACT_APP_PI_HEALTH_PORT || 9000);
const CRY_PORT = Number(process.env.REACT_APP_PI_CRY_PORT || 8888);
const LCD_PORT = Number(process.env.REACT_APP_PI_LCD_PORT || 9001);
const JAUNDICE_PORT = Number(process.env.REACT_APP_PI_JAUNDICE_PORT || 8887);
const NTE_PORT = Number(process.env.REACT_APP_PI_NTE_PORT || 8886);
const TEST_DASHBOARD_PORT = Number(process.env.REACT_APP_PI_TEST_DASHBOARD_PORT || 8090);

const DEFAULT_TIMEOUT = 8000;

// Helper to get the correct base URL for Pi services
function getPiBaseUrl() {
  if (USE_PROXY) {
    // Use nginx proxy path (works in both Cloud Run and local Docker)
    return '/api/pi';
  }
  // Direct Pi access (only for local dev with Tailscale)
  return `http://${DEFAULT_PI_HOST}`;
}

const isJsonResponse = (response) => {
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json');
};

async function fetchWithTimeout(url, { timeout = DEFAULT_TIMEOUT, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Request to ${url} failed with ${response.status}`);
    }

    if (isJsonResponse(response)) {
      return await response.json();
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPiHealth(piHost = DEFAULT_PI_HOST) {
  if (USE_PROXY) {
    return fetchWithTimeout(`/api/pi:${HEALTH_PORT}/health`);
  }
  return fetchWithTimeout(`http://${piHost}:${HEALTH_PORT}/health`);
}

export async function fetchCryStatus(piHost = DEFAULT_PI_HOST) {
  if (USE_PROXY) {
    return fetchWithTimeout(`/api/pi:${CRY_PORT}/cry/status`);
  }
  return fetchWithTimeout(`http://${piHost}:${CRY_PORT}/cry/status`);
}

export async function fetchLatestJaundice(piHost = DEFAULT_PI_HOST) {
  if (USE_PROXY) {
    return fetchWithTimeout(`/api/pi/jaundice/latest`);
  }
  return fetchWithTimeout(`http://${piHost}:${JAUNDICE_PORT}/latest`);
}

export async function fetchLcdReadings(piHost = DEFAULT_PI_HOST) {
  if (USE_PROXY) {
    return fetchWithTimeout(`/api/pi/lcd/readings`);
  }
  return fetchWithTimeout(`http://${piHost}:${LCD_PORT}/readings`);
}

export async function fetchNteSummary(piHost = DEFAULT_PI_HOST) {
  try {
    const listUrl = USE_PROXY ? `/api/pi:${NTE_PORT}/baby/list` : `http://${piHost}:${NTE_PORT}/baby/list`;
    const list = await fetchWithTimeout(listUrl);
    const babies = Array.isArray(list?.babies) ? list.babies : [];
    const activeBaby = babies.length > 0 ? babies[babies.length - 1] : null;
    const activeBabyId = activeBaby?.baby_id || activeBaby?.babyId;

    if (!activeBabyId) {
      return { babies };
    }

    const summary = {
      babies,
      activeBaby: {
        ...activeBaby
      }
    };

    try {
      const detailsUrl = USE_PROXY 
        ? `/api/pi:${NTE_PORT}/baby/${encodeURIComponent(activeBabyId)}`
        : `http://${piHost}:${NTE_PORT}/baby/${encodeURIComponent(activeBabyId)}`;
      const details = await fetchWithTimeout(detailsUrl);
      summary.activeBaby.details = details?.data || details;
    } catch (error) {
      summary.activeBaby.detailsError = error.message;
    }

    try {
      const recommendationsUrl = USE_PROXY 
        ? `/api/pi:${NTE_PORT}/recommendations`
        : `http://${piHost}:${NTE_PORT}/recommendations`;
      const recommendations = await fetchWithTimeout(recommendationsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ baby_id: activeBabyId })
      });
      summary.recommendations = recommendations?.data || recommendations;
    } catch (error) {
      summary.recommendationsError = error.message;
    }

    return summary;
  } catch (error) {
    return { error: error.message };
  }
}

export async function fetchSystemSnapshot(piHost = DEFAULT_PI_HOST) {
  const tasks = {
    health: () => fetchPiHealth(piHost),
    cry: () => fetchCryStatus(piHost),
    jaundice: () => fetchLatestJaundice(piHost),
    lcd: () => fetchLcdReadings(piHost),
    nte: () => fetchNteSummary(piHost)
  };

  const entries = await Promise.all(
    Object.entries(tasks).map(async ([key, task]) => {
      try {
        const value = await task();
        return [key, { status: 'fulfilled', value }];
      } catch (error) {
        return [key, { status: 'rejected', reason: error?.message || 'Unknown error' }];
      }
    })
  );

  const snapshot = {
    piHost,
    timestamp: new Date().toISOString(),
    data: {},
    errors: {}
  };

  for (const [key, result] of entries) {
    if (result.status === 'fulfilled') {
      snapshot.data[key] = result.value;
    } else {
      snapshot.errors[key] = result.reason;
      snapshot.data[key] = null;
    }
  }

  const allFailed = Object.keys(snapshot.errors).length === Object.keys(tasks).length;
  if (allFailed) {
    throw new Error(`Unable to reach Raspberry Pi host at ${piHost}`);
  }

  return snapshot;
}

export async function shutdownPi(piHost = DEFAULT_PI_HOST) {
  return fetchWithTimeout(`http://${piHost}:${HEALTH_PORT}/shutdown`, {
    method: 'POST',
    timeout: 10000
  });
}

export async function rebootPi(piHost = DEFAULT_PI_HOST) {
  return fetchWithTimeout(`http://${piHost}:${HEALTH_PORT}/reboot`, {
    method: 'POST',
    timeout: 10000
  });
}

export function getTestDashboardUrl(piHost = DEFAULT_PI_HOST) {
  if (process.env.REACT_APP_PI_TEST_DASHBOARD_URL) {
    return process.env.REACT_APP_PI_TEST_DASHBOARD_URL;
  }
  return `http://${piHost}:${TEST_DASHBOARD_PORT}/`;
}

export { DEFAULT_PI_HOST, HEALTH_PORT, CRY_PORT, LCD_PORT, JAUNDICE_PORT, NTE_PORT, TEST_DASHBOARD_PORT };
