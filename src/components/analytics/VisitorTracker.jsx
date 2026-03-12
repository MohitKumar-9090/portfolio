import { useEffect, useState } from 'react';
import VisitorMap from './VisitorMap';
import VisitorList from './VisitorList';
import { getRecentVisitors, subscribeToVisitorStream } from '../../services/visitorRealtime';

export default function VisitorTracker() {
  const [visitors, setVisitors] = useState([]);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let stopStream = null;

    const load = async () => {
      try {
        const rows = await getRecentVisitors(60);
        if (!active) return;
        setVisitors(rows);
        setSelectedVisitor(rows[0] || null);
        setError('');
      } catch {
        if (!active) return;
        setError('Unable to fetch recent visitors right now.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    stopStream = subscribeToVisitorStream((payload) => {
      if (!active || payload?.type !== 'visitor_logged' || !payload?.visitor) return;
      setVisitors((prev) => {
        const next = [payload.visitor, ...prev.filter((item) => item.id !== payload.visitor.id)].slice(0, 60);
        return next;
      });
      setSelectedVisitor((prev) => prev || payload.visitor);
    });

    return () => {
      active = false;
      if (typeof stopStream === 'function') stopStream();
    };
  }, []);

  if (loading) {
    return (
      <div className="dashboard-card dashboard-wide">
        <h3>
          <i className="fas fa-location-dot"></i> Live Visitor Tracking
        </h3>
        <p>Loading real-time visitor map and list...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-card dashboard-wide">
        <h3>
          <i className="fas fa-location-dot"></i> Live Visitor Tracking
        </h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <>
      <VisitorMap visitors={visitors} selectedVisitor={selectedVisitor} />
      <VisitorList
        visitors={visitors}
        selectedVisitorId={selectedVisitor?.id}
        onSelectVisitor={setSelectedVisitor}
      />
    </>
  );
}
