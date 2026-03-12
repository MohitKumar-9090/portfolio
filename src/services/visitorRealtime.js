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

const fetchIpGeo = async () => {
  const response = await fetch('https://ipapi.co/json/');
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error('Unable to resolve IP geolocation.');
  }
  return data;
};

const fetchBrowserGeo = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Browser geolocation unavailable.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });

const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return null;
    const address = data?.address || {};
    const city =
      address?.city || address?.town || address?.village || address?.state_district || '';
    const country = address?.country || '';
    return { city, country_name: country };
  } catch {
    return null;
  }
};

export const fetchVisitorGeoData = async () => {
  const timestamp = Date.now();
  const ipGeoPromise = fetchIpGeo().catch(() => ({}));

  try {
    const [position, ipGeo] = await Promise.all([fetchBrowserGeo(), ipGeoPromise]);
    const latitude = Number(position?.coords?.latitude);
    const longitude = Number(position?.coords?.longitude);
    const reverse = await reverseGeocode(latitude, longitude);

    return {
      city: reverse?.city || ipGeo?.city || 'Unknown City',
      country_name: reverse?.country_name || ipGeo?.country_name || 'Unknown Country',
      latitude,
      longitude,
      ip: ipGeo?.ip || '',
      timestamp,
      locationSource: 'browser_gps',
    };
  } catch {
    const ipGeo = await ipGeoPromise;
    const latitude = Number(ipGeo?.latitude);
    const longitude = Number(ipGeo?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error('Unable to resolve geolocation.');
    }

    return {
      city: ipGeo?.city || 'Unknown City',
      country_name: ipGeo?.country_name || 'Unknown Country',
      latitude,
      longitude,
      ip: ipGeo?.ip || '',
      timestamp,
      locationSource: 'ip',
    };
  }
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
