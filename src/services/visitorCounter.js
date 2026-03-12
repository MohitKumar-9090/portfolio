import { CHAT_API_BASE } from '../config/site';

const VISITOR_KEY = 'portfolio_visitors_v1';
const TODAY_VISITOR_KEY = 'portfolio_visitors_today_v1';
const SESSION_KEY = 'portfolio_visit_recorded';

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

  try {
    const response = await fetch(`${CHAT_API_BASE}/api/visitors/increment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
