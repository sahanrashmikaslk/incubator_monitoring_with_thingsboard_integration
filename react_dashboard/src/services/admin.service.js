const DEFAULT_PI_HOST = process.env.REACT_APP_PI_HOST || '100.89.162.22';
const HEALTH_PORT = Number(process.env.REACT_APP_PI_HEALTH_PORT || 9000);
const CRY_PORT = Number(process.env.REACT_APP_PI_CRY_PORT || 8888);
const LCD_PORT = Number(process.env.REACT_APP_PI_LCD_PORT || 9001);
const JAUNDICE_PORT = Number(process.env.REACT_APP_PI_JAUNDICE_PORT || 8887);
const NTE_PORT = Number(process.env.REACT_APP_PI_NTE_PORT || 8886);
const TEST_DASHBOARD_PORT = Number(process.env.REACT_APP_PI_TEST_DASHBOARD_PORT || 8090);

const DEFAULT_TIMEOUT = 8000;

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
  return fetchWithTimeout(`http://${piHost}:${HEALTH_PORT}/health`);
}

export async function fetchCryStatus(piHost = DEFAULT_PI_HOST) {
  return fetchWithTimeout(`http://${piHost}:${CRY_PORT}/cry/status`);
}

export async function fetchLatestJaundice(piHost = DEFAULT_PI_HOST) {
  return fetchWithTimeout(`http://${piHost}:${JAUNDICE_PORT}/latest`);
}

export async function fetchLcdReadings(piHost = DEFAULT_PI_HOST) {
  return fetchWithTimeout(`http://${piHost}:${LCD_PORT}/readings`);
}

export async function fetchNteSummary(piHost = DEFAULT_PI_HOST) {
  try {
    const list = await fetchWithTimeout(`http://${piHost}:${NTE_PORT}/baby/list`);
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
      const details = await fetchWithTimeout(`http://${piHost}:${NTE_PORT}/baby/${encodeURIComponent(activeBabyId)}`);
      summary.activeBaby.details = details?.data || details;
    } catch (error) {
      summary.activeBaby.detailsError = error.message;
    }

    try {
      const recommendations = await fetchWithTimeout(`http://${piHost}:${NTE_PORT}/recommendations`, {
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

export function getTestDashboardUrl(piHost = DEFAULT_PI_HOST) {
  if (process.env.REACT_APP_PI_TEST_DASHBOARD_URL) {
    return process.env.REACT_APP_PI_TEST_DASHBOARD_URL;
  }
  return `http://${piHost}:${TEST_DASHBOARD_PORT}/`;
}

export { DEFAULT_PI_HOST, HEALTH_PORT, CRY_PORT, LCD_PORT, JAUNDICE_PORT, NTE_PORT, TEST_DASHBOARD_PORT };
