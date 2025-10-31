/**
 * Parent Portal Service
 * Handles communication with the parent engagement backend.
 * Falls back to local demo data if the backend URL is not configured.
 */

const STREAM_REFRESH_MS = 60 * 1000; // refresh signed URLs every minute (placeholder)

const DEFAULT_PARENT_API_BASE = (() => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5055/api';
  }
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:5055/api`;
})();

const DEFAULT_CARE_TIPS = [
  {
    id: 'tip-1',
    title: 'Kangaroo care planning',
    description:
      'Skin-to-skin contact helps baby stability. Coordinate with the nursing staff to schedule a daily session that works for you.',
    icon: 'KC'
  },
  {
    id: 'tip-2',
    title: 'Hand hygiene',
    description:
      'Always sanitise before entering the waiting area. Sanitiser and gloves are provided by the NICU for your convenience.',
    icon: 'HH'
  },
  {
    id: 'tip-3',
    title: 'Support resources',
    description:
      'Counselling is available on Tuesdays and Fridays. Let the care team know if you would like to arrange a conversation.',
    icon: 'SR'
  }
];

const DEMO_MESSAGES = [
  {
    id: 'msg-1',
    baby_id: 'INC-001',
    sender_type: 'clinician',
    sender_name: 'Dr. Fernando',
    content:
      'INC-001 rested comfortably overnight. Temperature and oxygen levels remain stable. Next feeding is scheduled for 12:00.',
    created_at: new Date().toISOString()
  },
  {
    id: 'msg-2',
    baby_id: 'INC-001',
    sender_type: 'clinician',
    sender_name: 'Nurse Chamari',
    content:
      'Cluster care will take place at 18:00 today. Feel free to watch via the live stream if you cannot join in person.',
    created_at: new Date(Date.now() - 86400000).toISOString()
  }
];

function toClientMessage(raw) {
  return {
    id: raw.id,
    babyId: raw.baby_id,
    senderType: raw.sender_type,
    senderName: raw.sender_name,
    senderId: raw.sender_id,
    content: raw.content,
    createdAt: raw.created_at
  };
}

async function safeJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    return {};
  }
}

class ParentService {
  constructor() {
    const envBase = process.env.REACT_APP_PARENT_API_URL && process.env.REACT_APP_PARENT_API_URL.trim();
    this.baseUrl = (envBase && envBase.length > 0 ? envBase : DEFAULT_PARENT_API_BASE).replace(/\/$/, '');
    this.clinicianKey = (process.env.REACT_APP_PARENT_CLINICIAN_KEY || 'super-secret-clinician-key').trim();
  }

  get hasBackend() {
    return Boolean(this.baseUrl);
  }

  get clinicianApiKey() {
    return this.clinicianKey;
  }

  async login(phone, password) {
    if (!this.hasBackend) {
      throw new Error('Parent backend URL is not configured');
    }

    const response = await fetch(`${this.baseUrl}/auth/parent/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone, password })
    });

    if (!response.ok) {
      const payload = await safeJson(response);
      throw new Error(payload.error || 'Failed to login');
    }

    return response.json();
  }

  async registerWithInvitation({ code, name, phone, password, pin }) {
    if (!this.hasBackend) {
      throw new Error('Parent backend URL is not configured');
    }

    const response = await fetch(`${this.baseUrl}/auth/parent/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code, name, phone, password, pin })
    });

    if (!response.ok) {
      const payload = await safeJson(response);
      throw new Error(payload.error || 'Failed to register parent');
    }

    return response.json();
  }

  async fetchInvitation(code) {
    if (!this.hasBackend) {
      throw new Error('Parent backend URL is not configured');
    }

    const response = await fetch(`${this.baseUrl}/invitations/${code}`);
    if (!response.ok) {
      const payload = await safeJson(response);
      throw new Error(payload.error || 'Invitation not found');
    }
    return response.json();
  }

  async fetchMessages(token, { babyId } = {}) {
    if (!this.hasBackend) {
      return DEMO_MESSAGES.map(toClientMessage);
    }

    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let url = `${this.baseUrl}/parent/messages`;
    if (babyId) {
      if (!this.clinicianApiKey) {
        throw new Error('Clinician API key is not configured');
      }
      url = `${this.baseUrl}/clinician/babies/${encodeURIComponent(babyId)}/messages`;
      headers['x-api-key'] = this.clinicianApiKey;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const payload = await safeJson(response);
      throw new Error(payload.error || 'Failed to load messages');
    }

    const data = await response.json();
    const items = Array.isArray(data.messages) ? data.messages : data;
    return items.map(toClientMessage);
  }

  async sendMessage({ content, token, senderName, babyId }) {
    if (!this.hasBackend) {
      return toClientMessage({
        id: `demo-${Date.now()}`,
        baby_id: babyId || 'INC-001',
        sender_type: senderName ? 'clinician' : 'parent',
        sender_name: senderName || 'You',
        sender_id: null,
        content,
        created_at: new Date().toISOString()
      });
    }

    if (babyId && senderName) {
      if (!this.clinicianApiKey) {
        throw new Error('Clinician API key is not configured');
      }
      // clinician flow
      const response = await fetch(`${this.baseUrl}/clinician/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.clinicianApiKey
        },
        body: JSON.stringify({ babyId, senderName, content })
      });

      if (!response.ok) {
        const payload = await safeJson(response);
        throw new Error(payload.error || 'Failed to send message');
      }

      return toClientMessage(await response.json());
    }

    // parent flow
    const response = await fetch(`${this.baseUrl}/parent/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ content })
    });

    if (!response.ok) {
      const payload = await safeJson(response);
      throw new Error(payload.error || 'Failed to send message');
    }

    return toClientMessage(await response.json());
  }

  async fetchCareTips() {
    if (!this.hasBackend) {
      return DEFAULT_CARE_TIPS;
    }

    // No dedicated endpoint yet; return defaults until backend adds one
    return DEFAULT_CARE_TIPS;
  }

  async requestStreamToken(token) {
    if (!this.hasBackend) {
      return {
        url: null,
        refreshIn: STREAM_REFRESH_MS
      };
    }

    const response = await fetch(`${this.baseUrl}/parent/stream-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const payload = await safeJson(response);
      throw new Error(payload.error || 'Failed to obtain stream token');
    }

    return response.json();
  }

  async fetchCameraAccessStatus(token) {
    if (!this.hasBackend) {
      return { status: 'granted', pendingRequest: false, requestedAt: null, updatedAt: null };
    }

    if (!token) {
      return { status: 'revoked', pendingRequest: false, requestedAt: null, updatedAt: null };
    }

    const response = await fetch(`${this.baseUrl}/parent/camera-access`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const payload = await safeJson(response);
      throw new Error(payload.error || 'Failed to load camera access status');
    }

    const result = await response.json();
    return {
      status: result.status || 'revoked',
      pendingRequest: Boolean(result.pendingRequest),
      requestedAt: result.requestedAt || null,
      updatedAt: result.updatedAt || null,
      alreadyPending: Boolean(result.alreadyPending)
    };
  }

  async requestCameraAccess(token) {
    if (!this.hasBackend) {
      return { status: 'granted', pendingRequest: false, requestedAt: null, updatedAt: null };
    }

    if (!token) {
      throw new Error('Missing parent authentication token');
    }

    const response = await fetch(`${this.baseUrl}/parent/camera-access/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const payload = await safeJson(response);
      throw new Error(payload.error || 'Failed to request live view access');
    }

    const result = await response.json();
    return {
      status: result.status || 'revoked',
      pendingRequest: Boolean(result.pendingRequest),
      requestedAt: result.requestedAt || null,
      updatedAt: result.updatedAt || null,
      alreadyPending: Boolean(result.alreadyPending)
    };
  }

  async createInvitation({ babyId, babyName, caregiverRole, expiresInHours }) {
    if (!this.hasBackend) {
      throw new Error('Parent backend URL is not configured');
    }

    if (!this.clinicianApiKey) {
      throw new Error('Clinician API key is not configured');
    }

    const response = await fetch(`${this.baseUrl}/clinician/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.clinicianApiKey
      },
      body: JSON.stringify({ babyId, babyName, caregiverRole, expiresInHours })
    });

    if (!response.ok) {
      const payload = await safeJson(response);
      throw new Error(payload.error || 'Failed to create invitation');
    }

    return response.json();
  }

  async listParents(babyId) {
    if (!this.hasBackend) {
      return [];
    }

    if (!this.clinicianApiKey) {
      throw new Error('Clinician API key is not configured');
    }

    const response = await fetch(`${this.baseUrl}/clinician/babies/${encodeURIComponent(babyId)}/parents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.clinicianApiKey
      }
    });

    if (!response.ok) {
      const payload = await safeJson(response);
      throw new Error(payload.error || 'Failed to load parents');
    }

    const data = await response.json();
    return Array.isArray(data.parents) ? data.parents : [];
  }

  async listCameraAccessQueue() {
    if (!this.hasBackend) {
      return [];
    }

    if (!this.clinicianApiKey) {
      throw new Error('Clinician API key is not configured');
    }

    const response = await fetch(`${this.baseUrl}/clinician/camera-access/requests`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.clinicianApiKey
      }
    });

    if (!response.ok) {
      const payload = await safeJson(response);
      throw new Error(payload.error || 'Failed to load camera access requests');
    }

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.entries)) {
      return [];
    }

    return payload.entries.map(entry => ({
      parentId: entry.parentId,
      parentName: entry.parentName,
      phone: entry.phone,
      babyId: entry.babyId,
      status: entry.status || 'revoked',
      pendingRequest: Boolean(entry.pendingRequest),
      requestedAt: entry.requestedAt || null,
      updatedAt: entry.updatedAt || null
    }));
  }

  async updateCameraAccess({ parentId, babyId, status, parentName }) {
    if (!this.hasBackend) {
      return {
        parentId,
        babyId,
        status,
        pendingRequest: false,
        requestedAt: null,
        updatedAt: new Date().toISOString()
      };
    }

    if (!this.clinicianApiKey) {
      throw new Error('Clinician API key is not configured');
    }

    const response = await fetch(`${this.baseUrl}/clinician/camera-access/${encodeURIComponent(parentId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.clinicianApiKey
      },
      body: JSON.stringify({ babyId, status, parentName })
    });

    if (!response.ok) {
      const payload = await safeJson(response);
      throw new Error(payload.error || 'Failed to update camera access');
    }

    const payload = await response.json();
    const entry = payload?.entry || {};

    return {
      parentId: entry.parentId ?? parentId,
      babyId: entry.babyId ?? babyId,
      status: entry.status || status,
      pendingRequest: Boolean(entry.pendingRequest),
      requestedAt: entry.requestedAt || null,
      updatedAt: entry.updatedAt || null
    };
  }
}

const parentService = new ParentService();
export default parentService;
