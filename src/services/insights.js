import { CHAT_API_BASE } from '../config/site';

const LIVE_SESSION_KEY = 'portfolio_live_session_id';

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

  const heartbeat = async () => {
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
  const fallback = {
    totalVisitors: Number(localStorage.getItem('portfolio_visitors_v1') || 0),
    todayVisitors: Number(localStorage.getItem('portfolio_visitors_today_v1') || 0),
    liveVisitors: 1,
    resumeDownloads: Number(localStorage.getItem('portfolio_resume_downloads_local') || 0),
    deviceDistribution: [
      { label: 'Mobile', count: 0, percentage: 0 },
      { label: 'Desktop', count: 1, percentage: 100 },
      { label: 'Tablet', count: 0, percentage: 0 },
    ],
    trafficDistribution: [
      { label: 'Google Search', count: 0, percentage: 0 },
      { label: 'Direct', count: 1, percentage: 100 },
      { label: 'LinkedIn', count: 0, percentage: 0 },
      { label: 'Instagram', count: 0, percentage: 0 },
      { label: 'Other', count: 0, percentage: 0 },
    ],
  };

  try {
    const response = await fetch(`${CHAT_API_BASE}/api/admin/insights`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error('Insights API unavailable');
    return { ...fallback, ...data };
  } catch {
    return fallback;
  }
};
