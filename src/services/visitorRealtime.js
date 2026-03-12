import { CHAT_API_BASE } from '../config/site';
import { detectDeviceType } from './visitorCounter';

const VISITOR_LOGGED_KEY = 'portfolio_visitor_log_recorded';

export const detectBrowser = () => {
  const ua = navigator.userAgent || '';
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera';
  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return 'Chrome';
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return 'Safari';
  if (/firefox\//i.test(ua)) return 'Firefox';
  return 'Other';
};

export const fetchVisitorGeoData = async () => {
  const response = await fetch('https://ipapi.co/json/');
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error('Unable to resolve geolocation.');
  }

  return {
    city: data?.city || 'Unknown City',
    country_name: data?.country_name || 'Unknown Country',
    latitude: Number(data?.latitude),
    longitude: Number(data?.longitude),
    ip: data?.ip || '',
    timestamp: Date.now(),
  };
};

export const logCurrentVisitor = async () => {
  if (sessionStorage.getItem(VISITOR_LOGGED_KEY) === '1') return;

  try {
    const geo = await fetchVisitorGeoData();
    if (!Number.isFinite(geo.latitude) || !Number.isFinite(geo.longitude)) return;

    await fetch(`${CHAT_API_BASE}/api/visitors/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: geo.city,
        country_name: geo.country_name,
        latitude: geo.latitude,
        longitude: geo.longitude,
        ip: geo.ip,
        visitTimeMs: geo.timestamp,
        deviceType: detectDeviceType(),
        browser: detectBrowser(),
      }),
    });

    sessionStorage.setItem(VISITOR_LOGGED_KEY, '1');
  } catch {
    // Silent fail; dashboard remains functional.
  }
};

export const getRecentVisitors = async (limit = 50) => {
  const response = await fetch(`${CHAT_API_BASE}/api/visitors/recent?limit=${limit}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Failed to fetch visitors');
  return Array.isArray(data?.visitors) ? data.visitors : [];
};

export const subscribeToVisitorStream = (onMessage) => {
  const stream = new EventSource(`${CHAT_API_BASE}/api/visitors/stream`);

  stream.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data || '{}');
      if (typeof onMessage === 'function') {
        onMessage(payload);
      }
    } catch {
      // Ignore malformed stream frames.
    }
  };

  return () => stream.close();
};
