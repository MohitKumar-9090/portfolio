import { CHAT_API_BASE, SITE_CONFIG } from '../config/site';

const GOOGLE_TAG_URL = 'https://www.googletagmanager.com/gtag/js';
const ANALYTICS_KEY = 'portfolio_analytics_overview_v1';

let initialized = false;

const readOverview = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '{}');
    if (parsed && typeof parsed === 'object') {
      return {
        pageViews: Number(parsed.pageViews || 0),
        byPath: parsed.byPath && typeof parsed.byPath === 'object' ? parsed.byPath : {},
        events: parsed.events && typeof parsed.events === 'object' ? parsed.events : {},
        lastVisitedAt: parsed.lastVisitedAt || null,
      };
    }
  } catch {
    // Ignore parse errors and reset in-memory shape.
  }

  return { pageViews: 0, byPath: {}, events: {}, lastVisitedAt: null };
};

const writeOverview = (next) => {
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(next));
};

const postAnalytics = async (endpoint, payload) => {
  try {
    await fetch(`${CHAT_API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
  } catch {
    // Keep client tracking resilient if backend is unavailable.
  }
};

const ensureGoogleTag = () => {
  const gaId = SITE_CONFIG.googleAnalyticsId;
  if (!gaId || initialized) return;

  if (!window.dataLayer) {
    window.dataLayer = [];
  }

  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  if (!document.querySelector(`script[src*="id=${gaId}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `${GOOGLE_TAG_URL}?id=${gaId}`;
    document.head.appendChild(script);
  }

  window.gtag('js', new Date());
  window.gtag('config', gaId, { send_page_view: false });
  initialized = true;
};

export const initAnalytics = () => {
  ensureGoogleTag();
};

export const trackBehaviorEvent = (eventName) => {
  if (!eventName) return;

  const overview = readOverview();
  overview.events[eventName] = Number(overview.events[eventName] || 0) + 1;
  writeOverview(overview);

  if (window.gtag && SITE_CONFIG.googleAnalyticsId) {
    window.gtag('event', eventName, {
      event_category: 'engagement',
      event_label: window.location.pathname,
    });
  }

  postAnalytics('/api/analytics/event', {
    eventName,
    path: window.location.pathname,
  });
};

export const trackPageView = (path, title = document.title) => {
  const safePath = path || '/';
  const overview = readOverview();

  overview.pageViews += 1;
  overview.byPath[safePath] = Number(overview.byPath[safePath] || 0) + 1;
  overview.lastVisitedAt = new Date().toISOString();
  writeOverview(overview);

  if (window.gtag && SITE_CONFIG.googleAnalyticsId) {
    window.gtag('event', 'page_view', {
      page_title: title,
      page_path: safePath,
    });
  }

  postAnalytics('/api/analytics/pageview', {
    path: safePath,
    title,
  });
};

export const getAnalyticsOverview = async () => {
  const localOverview = readOverview();
  try {
    const response = await fetch(`${CHAT_API_BASE}/api/analytics/overview`);
    const data = await response.json().catch(() => ({}));
    if (response.ok && data && typeof data === 'object') {
      const byPath = data.byPath && typeof data.byPath === 'object' ? data.byPath : {};
      const events = data.events && typeof data.events === 'object' ? data.events : {};
      const pageViews = Number(data.pageViews || 0);
      const lastVisitedAt = data.lastVisitedAt || localOverview.lastVisitedAt || null;
      const serverOverview = { pageViews, byPath, events, lastVisitedAt };
      writeOverview(serverOverview);
      const topPathEntry = Object.entries(byPath).sort((a, b) => b[1] - a[1])[0] || null;
      return {
        ...serverOverview,
        topPage: topPathEntry ? { path: topPathEntry[0], views: topPathEntry[1] } : null,
      };
    }
  } catch {
    // Fallback handled below.
  }

  const topPathEntry =
    Object.entries(localOverview.byPath).sort((a, b) => b[1] - a[1])[0] || null;

  return {
    ...localOverview,
    topPage: topPathEntry ? { path: topPathEntry[0], views: topPathEntry[1] } : null,
  };
};

export const startBehaviorTracking = () => {
  const firedScrollMarks = new Set();
  const scrollMarks = [25, 50, 75, 100];

  const onClick = (event) => {
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!anchor) return;

    const href = anchor.getAttribute('href') || '';
    if (!href) return;

    const isExternal = /^https?:\/\//i.test(href) && !href.includes(window.location.host);
    if (isExternal) {
      trackBehaviorEvent('outbound_link_click');
    }
  };

  const onScroll = () => {
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (documentHeight <= 0) return;

    const percent = Math.round((window.scrollY / documentHeight) * 100);
    scrollMarks.forEach((mark) => {
      if (percent >= mark && !firedScrollMarks.has(mark)) {
        firedScrollMarks.add(mark);
        trackBehaviorEvent(`scroll_depth_${mark}`);
      }
    });
  };

  document.addEventListener('click', onClick);
  window.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    document.removeEventListener('click', onClick);
    window.removeEventListener('scroll', onScroll);
  };
};
