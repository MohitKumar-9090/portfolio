const formatVisitTime = (value) => {
  const date = new Date(Number(value || 0));
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export default function VisitorList({ visitors = [], onSelectVisitor, selectedVisitorId }) {
  return (
    <div className="dashboard-card dashboard-wide visitor-list-card">
      <h3>
        <i className="fas fa-list"></i> Recent Visitors
      </h3>
      <p className="executive-subtitle">Click any visitor row to zoom map to their location.</p>

      <div className="visitor-list-wrap">
        {visitors.length === 0 ? (
          <p>No visitors yet.</p>
        ) : (
          <table className="visitor-table">
            <thead>
              <tr>
                <th>City</th>
                <th>Country</th>
                <th>Device</th>
                <th>Browser</th>
                <th>Visit Time</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((visitor) => {
                const active = selectedVisitorId && selectedVisitorId === visitor.id;
                return (
                  <tr
                    key={visitor.id}
                    className={active ? 'active' : ''}
                    onClick={() => onSelectVisitor?.(visitor)}
                  >
                    <td>{visitor.city}</td>
                    <td>{visitor.country}</td>
                    <td>{visitor.deviceType}</td>
                    <td>{visitor.browser}</td>
                    <td>{formatVisitTime(visitor.visitTimeMs)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
