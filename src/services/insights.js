import { CHAT_API_BASE } from '../config/site';

const LIVE_SESSION_KEY = 'portfolio_live_session_id';
const LIVE_SESSIONS_KEY = 'portfolio_live_sessions_v1';
const LIVE_VISITOR_TTL_MS = 120000;
const DEVICE_COUNTS_KEY = 'portfolio_device_counts_v1';
const SOURCE_COUNTS_KEY = 'portfolio_source_counts_v1';
const DEVICE_TYPES = ['Mobile', 'Desktop', 'Tablet'];
const TRAFFIC_SOURCES = ['Google Search', 'Direct', 'LinkedIn', 'Instagram', 'Other'];

const buildSessionId = () => {
  const random = Math.random().toString(36).slice(2, 10);
  return `sess_${Date.now()}_${random}`;
};

export const getLiveSessionId = () => {
  let sessionId = sessionStorage.getItem(LIVE_SESSION_KEY);
  if (!sessionId) {
    sessionId = buildSessionId();
    sessionStorage.setItem(LIVE_SESSION_KEY, sessionId);
  }
  return sessionId;
};

export const startLiveVisitorHeartbeat = () => {
  const sessionId = getLiveSessionId();
  let timer = null;

  const readLiveSessions = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(LIVE_SESSIONS_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  };

  const writeLiveSessions = (value) => {
    localStorage.setItem(LIVE_SESSIONS_KEY, JSON.stringify(value));
  };

  const cleanupLiveSessions = (sessions) => {
    const cutoff = Date.now() - LIVE_VISITOR_TTL_MS;
    const next = { ...sessions };
    Object.keys(next).forEach((key) => {
      if (Number(next[key] || 0) < cutoff) delete next[key];
    });
    return next;
  };

  const touchLocalSession = () => {
    const current = cleanupLiveSessions(readLiveSessions());
    current[sessionId] = Date.now();
    writeLiveSessions(current);
  };

  const removeLocalSession = () => {
    const current = cleanupLiveSessions(readLiveSessions());
    delete current[sessionId];
    writeLiveSessions(current);
  };

  const heartbeat = async () => {
    touchLocalSession();
    try {
      await fetch(`${CHAT_API_BASE}/api/live-visitors/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } catch {
      // Ignore heartbeat failures to keep UI stable.
    }
  };

  heartbeat();
  timer = window.setInterval(heartbeat, 30000);

  const disconnect = async () => {
    removeLocalSession();
    try {
      await fetch(`${CHAT_API_BASE}/api/live-visitors/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } catch {
      // Ignore disconnect failures.
    }
  };

  const onUnload = () => {
    removeLocalSession();
    fetch(`${CHAT_API_BASE}/api/live-visitors/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
      keepalive: true,
    }).catch(() => {});
  };

  window.addEventListener('beforeunload', onUnload);

  return () => {
    if (timer) window.clearInterval(timer);
    disconnect();
    window.removeEventListener('beforeunload', onUnload);
  };
};

export const incrementResumeDownload = async () => {
  try {
    const response = await fetch(`${CHAT_API_BASE}/api/resume-downloads/increment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && typeof data.totalResumeDownloads === 'number') {
      return data.totalResumeDownloads;
    }
  } catch {
    // Ignore failures.
  }

  const local = Number(localStorage.getItem('portfolio_resume_downloads_local') || 0) + 1;
  localStorage.setItem('portfolio_resume_downloads_local', String(local));
  return local;
};

export const getAdminInsights = async () => {
  const readCountMap = (key, labels) => {
    const base = labels.reduce((acc, item) => ({ ...acc, [item]: 0 }), {});
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '{}');
      if (parsed && typeof parsed === 'object') {
        return { ...base, ...parsed };
      }
    } catch {
      // Ignore malformed local values.
    }
    return base;
  };

  const toDistribution = (counts, labels) => {
    const total = labels.reduce((sum, label) => sum + Number(counts[label] || 0), 0);
    return labels.map((label) => ({
      label,
      count: Number(counts[label] || 0),
      percentage: total > 0 ? Math.round((Number(counts[label] || 0) / total) * 100) : 0,
    }));
  };

  const getLocalLiveVisitors = () => {
    const cutoff = Date.now() - LIVE_VISITOR_TTL_MS;
    try {
      const parsed = JSON.parse(localStorage.getItem(LIVE_SESSIONS_KEY) || '{}');
      if (!parsed || typeof parsed !== 'object') return 1;
      const active = Object.values(parsed).filter((ts) => Number(ts || 0) >= cutoff);
      return Math.max(active.length, 1);
    } catch {
      return 1;
    }
  };

  const localDeviceCounts = readCountMap(DEVICE_COUNTS_KEY, DEVICE_TYPES);
  const localSourceCounts = readCountMap(SOURCE_COUNTS_KEY, TRAFFIC_SOURCES);

  const fallback = {
    totalVisitors: Number(localStorage.getItem('portfolio_visitors_v1') || 0),
    todayVisitors: Number(localStorage.getItem('portfolio_visitors_today_v1') || 0),
    liveVisitors: getLocalLiveVisitors(),
    resumeDownloads: Number(localStorage.getItem('portfolio_resume_downloads_local') || 0),
    deviceDistribution: toDistribution(localDeviceCounts, DEVICE_TYPES),
    trafficDistribution: toDistribution(localSourceCounts, TRAFFIC_SOURCES),
  };

  try {
    const response = await fetch(`${CHAT_API_BASE}/api/admin/insights`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error('Insights API unavailable');
    const deviceDistribution =
      Array.isArray(data?.deviceDistribution) && data.deviceDistribution.length > 0
        ? data.deviceDistribution
        : fallback.deviceDistribution;
    const trafficDistribution =
      Array.isArray(data?.trafficDistribution) && data.trafficDistribution.length > 0
        ? data.trafficDistribution
        : fallback.trafficDistribution;
    const liveVisitors =
      typeof data?.liveVisitors === 'number' && data.liveVisitors > 0
        ? data.liveVisitors
        : fallback.liveVisitors;

    return {
      ...fallback,
      ...data,
      liveVisitors,
      deviceDistribution,
      trafficDistribution,
    };
  } catch {
    return fallback;
  }
};
