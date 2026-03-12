import { useEffect, useState } from 'react';
import { fetchGithubActivity } from '../../services/githubActivity';

export default function GitHubActivityTracker({ username, onSummary }) {
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    let active = true;

    const load = async () => {
      setState({ loading: true, error: '', data: null });
      try {
        const data = await fetchGithubActivity(username);
        if (!active) return;

        setState({ loading: false, error: '', data });
        if (typeof onSummary === 'function') {
          onSummary(data.contribution);
        }
      } catch {
        if (!active) return;
        setState({ loading: false, error: 'Unable to load GitHub activity right now.', data: null });
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [onSummary, username]);

  if (state.loading) {
    return (
      <div className="dashboard-card dashboard-wide">
        <h3>GitHub Activity</h3>
        <p>Loading GitHub activity...</p>
      </div>
    );
  }

  if (state.error || !state.data) {
    return (
      <div className="dashboard-card dashboard-wide">
        <h3>GitHub Activity</h3>
        <p>{state.error || 'No GitHub data available.'}</p>
      </div>
    );
  }

  const { commits, repositories, contribution } = state.data;

  return (
    <div className="dashboard-card dashboard-wide">
      <h3>GitHub Activity ({username})</h3>
      <div className="github-summary-grid">
        <div>
          <strong>{contribution.pushEvents}</strong>
          <span>Push Events</span>
        </div>
        <div>
          <strong>{contribution.pullRequests}</strong>
          <span>Pull Requests</span>
        </div>
        <div>
          <strong>{contribution.issues}</strong>
          <span>Issues</span>
        </div>
        <div>
          <strong>{contribution.repositories}</strong>
          <span>Repositories</span>
        </div>
      </div>

      <div className="github-sections">
        <section>
          <h4>Recent Commits</h4>
          <ul>
            {commits.length === 0 && <li>No recent public commits found.</li>}
            {commits.map((commit) => (
              <li key={commit.id}>
                <strong>{commit.repo}</strong>: {commit.message}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4>Repositories</h4>
          <ul>
            {repositories.map((repo) => (
              <li key={repo.id}>
                <a href={repo.url} target="_blank" rel="noreferrer">
                  {repo.name}
                </a>{' '}
                ({repo.language})
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
