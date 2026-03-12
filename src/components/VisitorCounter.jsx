import { useEffect, useState } from 'react';
import { getVisitorCount } from '../services/visitorCounter';

export default function VisitorCounter({ onLoaded }) {
  const [stats, setStats] = useState({ totalVisitors: 0, todayVisitors: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const next = await getVisitorCount();
      if (!active) return;
      setStats(next);
      setLoading(false);
      if (typeof onLoaded === 'function') {
        onLoaded(next);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [onLoaded]);

  return (
    <div className="dashboard-card">
      <h3>Visitor Analytics</h3>
      <p className="dashboard-number">
        {loading ? 'Loading...' : stats.totalVisitors.toLocaleString()}
      </p>
      <small>Total visitors</small>
      <div className="dashboard-metrics" style={{ marginTop: '0.6rem' }}>
        <span>
          Today&apos;s visitors:{' '}
          <strong>{loading ? 'Loading...' : stats.todayVisitors.toLocaleString()}</strong>
        </span>
      </div>
    </div>
  );
}
