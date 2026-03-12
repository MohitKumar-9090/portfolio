import { useEffect, useState } from 'react';
import { getVisitorCount } from '../../services/visitorCounter';

export default function VisitorCounter({ onLoaded }) {
  const [visitors, setVisitors] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const count = await getVisitorCount();
      if (!active) return;
      setVisitors(count);
      setLoading(false);
      if (typeof onLoaded === 'function') {
        onLoaded(count);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [onLoaded]);

  return (
    <div className="dashboard-card">
      <h3>Total Visitors</h3>
      <p className="dashboard-number">{loading ? 'Loading...' : visitors.toLocaleString()}</p>
      <small>Tracks total portfolio visits (backend when available, local fallback).</small>
    </div>
  );
}
