import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  initAnalytics,
  startBehaviorTracking,
  trackBehaviorEvent,
  trackPageView,
} from '../services/analytics';
import { recordVisit } from '../services/visitorCounter';
import { startLiveVisitorHeartbeat } from '../services/insights';
import { logCurrentVisitor } from '../services/visitorRealtime';

const ANALYTICS_SESSION_KEY = 'portfolio_analytics_session_started';

export const useAppTracking = () => {
  const location = useLocation();

  useEffect(() => {
    initAnalytics();
    recordVisit();
    logCurrentVisitor();
    const stopHeartbeat = startLiveVisitorHeartbeat();
    if (sessionStorage.getItem(ANALYTICS_SESSION_KEY) !== '1') {
      sessionStorage.setItem(ANALYTICS_SESSION_KEY, '1');
      trackBehaviorEvent('session_start');
    }
    const stopTracking = startBehaviorTracking();
    return () => {
      if (typeof stopTracking === 'function') stopTracking();
      if (typeof stopHeartbeat === 'function') stopHeartbeat();
    };
  }, []);

  useEffect(() => {
    const path = `${location.pathname}${location.search || ''}`;
    trackPageView(path, document.title);
  }, [location.pathname, location.search]);
};
