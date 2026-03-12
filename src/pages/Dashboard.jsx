import { useEffect, useState } from 'react';
import SeoHead from '../components/SeoHead';
import VisitorCounter from '../components/VisitorCounter';
import GithubActivity from '../components/GithubActivity';
import { SITE_CONFIG } from '../config/site';
import { getAnalyticsOverview } from '../services/analytics';
import '../styles/dashboard.css';

const AnalyticsOverviewCard = () => {
  const [overview, setOverview] = useState({
    pageViews: 0,
    byPath: {},
    events: {},
    lastVisitedAt: null,
    topPage: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadOverview = async () => {
      const data = await getAnalyticsOverview();
      if (!active) return;
      setOverview(data);
      setLoading(false);
    };

    loadOverview();
    return () => {
      active = false;
    };
  }, []);

  const totalEvents = Object.values(overview.events || {}).reduce(
    (acc, count) => acc + Number(count || 0),
    0
  );
  const sessions = Number(overview.events?.session_start || 0);

  return (
    <div className="dashboard-card">
      <h3>
        <i className="fas fa-chart-line"></i> Analytics Overview
      </h3>
      <p className="dashboard-number">
        {loading ? 'Loading...' : overview.pageViews.toLocaleString()}
      </p>
      <small>Total page views recorded by app tracking.</small>
      <div className="dashboard-metrics">
        <span>Sessions: {sessions}</span>
        <span>Tracked events: {totalEvents}</span>
        <span>Top page: {overview.topPage ? `${overview.topPage.path} (${overview.topPage.views})` : 'N/A'}</span>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [visitorStats, setVisitorStats] = useState({ totalVisitors: 0, todayVisitors: 0 });
  const [githubSummary, setGithubSummary] = useState(null);

  return (
    <>
      <SeoHead
        title="Portfolio Dashboard | Mohit Pandey"
        description="Portfolio insights dashboard with visitor analytics and GitHub activity overview."
        keywords="portfolio dashboard, visitor analytics, github tracker"
        path="/dashboard"
      />

      <main className="dashboard-page">
        <div className="dashboard-container">
          <header className="dashboard-header">
            <div className="dashboard-header-top">
              <h1>Portfolio Insights Dashboard</h1>
              <a className="dashboard-home-link" href="/">
                <i className="fas fa-arrow-left"></i> Back to Portfolio
              </a>
            </div>
            <p>Operational overview for portfolio traffic and GitHub development activity.</p>
            <div className="dashboard-pills">
              <span><i className="fas fa-users"></i> Live Visitor Metrics</span>
              <span><i className="fab fa-github"></i> GitHub Intelligence</span>
              <span><i className="fas fa-chart-pie"></i> Analytics Summary</span>
            </div>
          </header>

          <section className="dashboard-grid">
            <VisitorCounter onLoaded={setVisitorStats} />
            <AnalyticsOverviewCard />
          </section>

          <section className="dashboard-grid">
            <GithubActivity username={SITE_CONFIG.githubUsername} onSummary={setGithubSummary} />
          </section>

          <section className="dashboard-grid">
            <div className="dashboard-card dashboard-wide">
              <h3>
                <i className="fas fa-gauge-high"></i> Executive Summary
              </h3>
              <p>
                Total visitors: <strong>{visitorStats.totalVisitors.toLocaleString()}</strong>
              </p>
              <p>
                Today&apos;s visitors: <strong>{visitorStats.todayVisitors.toLocaleString()}</strong>
              </p>
              <p>
                GitHub push events:{' '}
                <strong>{githubSummary ? githubSummary.pushEvents : 'Loading...'}</strong>
              </p>
              <p>
                Public repositories tracked:{' '}
                <strong>{githubSummary ? githubSummary.repositories : 'Loading...'}</strong>
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
