import { CHAT_API_BASE } from '../config/site';

const VISITOR_KEY = 'portfolio_visitors_v1';
const TODAY_VISITOR_KEY = 'portfolio_visitors_today_v1';
const SESSION_KEY = 'portfolio_visit_recorded';
const DEVICE_KEY = 'portfolio_device_type';
const SOURCE_KEY = 'portfolio_traffic_source';
const DEVICE_COUNTS_KEY = 'portfolio_device_counts_v1';
const SOURCE_COUNTS_KEY = 'portfolio_source_counts_v1';
const DEVICE_TYPES = ['Mobile', 'Desktop', 'Tablet'];
const TRAFFIC_SOURCES = ['Google Search', 'Direct', 'LinkedIn', 'Instagram', 'Other'];

export const detectDeviceType = () => {
  const ua = navigator.userAgent || '';
  if (/tablet|ipad|playbook|silk|(android(?!.*mobile))/i.test(ua)) return 'Tablet';
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return 'Mobile';
  return 'Desktop';
};

export const detectTrafficSource = () => {
  const referrer = (document.referrer || '').toLowerCase();
  if (!referrer) return 'Direct';
  if (referrer.includes('google.')) return 'Google Search';
  if (referrer.includes('linkedin.')) return 'LinkedIn';
  if (referrer.includes('instagram.')) return 'Instagram';
  return 'Other';
};

const getCachedAttribution = () => {
  const cachedDevice = localStorage.getItem(DEVICE_KEY);
  const cachedSource = localStorage.getItem(SOURCE_KEY);
  if (cachedDevice && cachedSource) {
    return { deviceType: cachedDevice, source: cachedSource };
  }
  const deviceType = detectDeviceType();
  const source = detectTrafficSource();
  localStorage.setItem(DEVICE_KEY, deviceType);
  localStorage.setItem(SOURCE_KEY, source);
  return { deviceType, source };
};

const readCountMap = (key, baseKeys) => {
  const base = baseKeys.reduce((acc, item) => ({ ...acc, [item]: 0 }), {});
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

const writeCountMap = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const bumpLocalAttribution = (deviceType, source) => {
  const devices = readCountMap(DEVICE_COUNTS_KEY, DEVICE_TYPES);
  const sources = readCountMap(SOURCE_COUNTS_KEY, TRAFFIC_SOURCES);
  devices[deviceType] = Number(devices[deviceType] || 0) + 1;
  sources[source] = Number(sources[source] || 0) + 1;
  writeCountMap(DEVICE_COUNTS_KEY, devices);
  writeCountMap(SOURCE_COUNTS_KEY, sources);
};

const readLocalCount = () => {
  const value = Number(localStorage.getItem(VISITOR_KEY) || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const readLocalTodayCount = () => {
  const value = Number(localStorage.getItem(TODAY_VISITOR_KEY) || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const writeLocalCount = (count) => {
  localStorage.setItem(VISITOR_KEY, String(Math.max(0, Number(count) || 0)));
};

const writeLocalTodayCount = (count) => {
  localStorage.setItem(TODAY_VISITOR_KEY, String(Math.max(0, Number(count) || 0)));
};

const normalizeVisitorPayload = (payload) => {
  return {
    totalVisitors: Number(payload?.totalVisitors || 0),
    todayVisitors: Number(payload?.todayVisitors || 0),
  };
};

const incrementLocalCount = () => {
  const totalVisitors = readLocalCount() + 1;
  const todayVisitors = readLocalTodayCount() + 1;
  writeLocalCount(totalVisitors);
  writeLocalTodayCount(todayVisitors);
  return { totalVisitors, todayVisitors };
};

export const recordVisit = async () => {
  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    return getVisitorCount();
  }

  sessionStorage.setItem(SESSION_KEY, '1');
  const attribution = getCachedAttribution();
  bumpLocalAttribution(attribution.deviceType, attribution.source);

  try {
    const response = await fetch(`${CHAT_API_BASE}/api/visitors/increment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attribution),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data.totalVisitors !== 'number') {
      throw new Error('Visitor API unavailable');
    }

    const normalized = normalizeVisitorPayload(data);
    writeLocalCount(normalized.totalVisitors);
    writeLocalTodayCount(normalized.todayVisitors);
    return normalized;
  } catch {
    return incrementLocalCount();
  }
};

export const getVisitorCount = async () => {
  try {
    const response = await fetch(`${CHAT_API_BASE}/api/visitors`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data.totalVisitors !== 'number') {
      throw new Error('Visitor API unavailable');
    }

    const normalized = normalizeVisitorPayload(data);
    writeLocalCount(normalized.totalVisitors);
    writeLocalTodayCount(normalized.todayVisitors);
    return normalized;
  } catch {
    return {
      totalVisitors: readLocalCount(),
      todayVisitors: readLocalTodayCount(),
    };
  }
};
