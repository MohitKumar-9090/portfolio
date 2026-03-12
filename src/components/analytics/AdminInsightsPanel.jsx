export default function AdminInsightsPanel({ insights, loading }) {
  const deviceDistribution = insights?.deviceDistribution || [];
  const trafficDistribution = insights?.trafficDistribution || [];

  return (
    <div className="dashboard-card dashboard-wide admin-insights-card">
      <h3>
        <i className="fas fa-shield-halved"></i> Admin Insights
      </h3>
      <p className="executive-subtitle">
        Aggregated snapshot of visitor behavior, live traffic, and resume conversion.
      </p>

      <div className="admin-insight-grid">
        <article>
          <small>Total Visitors</small>
          <strong>{loading ? 'Loading...' : Number(insights.totalVisitors || 0).toLocaleString()}</strong>
        </article>
        <article>
          <small>Live Visitors Right Now</small>
          <strong>{loading ? 'Loading...' : Number(insights.liveVisitors || 0).toLocaleString()}</strong>
        </article>
        <article>
          <small>Resume Downloads</small>
          <strong>{loading ? 'Loading...' : Number(insights.resumeDownloads || 0).toLocaleString()}</strong>
        </article>
        <article>
          <small>Today's Visitors</small>
          <strong>{loading ? 'Loading...' : Number(insights.todayVisitors || 0).toLocaleString()}</strong>
        </article>
      </div>

      <div className="admin-distribution-wrap">
        <section>
          <h4>Device Analytics</h4>
          <div className="admin-bars">
            {deviceDistribution.map((item) => (
              <div key={item.label} className="admin-bar-item">
                <div className="admin-bar-head">
                  <span>{item.label}</span>
                  <span>{item.percentage}%</span>
                </div>
                <div className="admin-bar-track">
                  <div className="admin-bar-fill" style={{ width: `${item.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4>Traffic Source Analytics</h4>
          <div className="admin-bars">
            {trafficDistribution.map((item) => (
              <div key={item.label} className="admin-bar-item">
                <div className="admin-bar-head">
                  <span>{item.label}</span>
                  <span>{item.percentage}%</span>
                </div>
                <div className="admin-bar-track">
                  <div className="admin-bar-fill admin-bar-fill-alt" style={{ width: `${item.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
