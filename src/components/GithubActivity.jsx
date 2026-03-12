import { useEffect, useState } from 'react';
import { fetchGithubActivity } from '../services/githubActivity';

export default function GithubActivity({ username, onSummary }) {
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
        setState({ loading: false, error: 'Unable to load GitHub activity.', data: null });
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
        <p>Loading GitHub data...</p>
      </div>
    );
  }

  if (state.error || !state.data) {
    return (
      <div className="dashboard-card dashboard-wide">
        <h3>GitHub Activity</h3>
        <p>{state.error || 'No data available.'}</p>
      </div>
    );
  }

  const { profile, commits, repositories, contribution } = state.data;

  return (
    <div className="dashboard-card dashboard-wide">
      <h3>GitHub Activity</h3>

      <div className="github-profile-card">
        {profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.login} /> : null}
        <div>
          <strong>{profile.name || profile.login}</strong>
          <p>@{profile.login}</p>
          <p>{profile.bio || 'Developer profile'}</p>
          <a href={profile.profileUrl} target="_blank" rel="noreferrer">
            View Profile
          </a>
        </div>
      </div>

      <div className="github-summary-grid">
        <div>
          <strong>{profile.publicRepos}</strong>
          <span>Public Repos</span>
        </div>
        <div>
          <strong>{profile.followers}</strong>
          <span>Followers</span>
        </div>
        <div>
          <strong>{contribution.pushEvents}</strong>
          <span>Push Events</span>
        </div>
        <div>
          <strong>{contribution.pullRequests}</strong>
          <span>Pull Requests</span>
        </div>
      </div>

      <div className="github-sections">
        <section>
          <h4>Latest Commits</h4>
          <ul>
            {commits.length === 0 && <li>No recent public commits.</li>}
            {commits.map((commit) => (
              <li key={commit.id}>
                <strong>{commit.repo}</strong>: {commit.message}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4>Recent Repositories</h4>
          <div className="repo-cards">
            {repositories.map((repo) => {
              const updatedLabel = repo.updatedAt
                ? new Date(repo.updatedAt).toLocaleDateString()
                : 'N/A';
              return (
                <article key={repo.id} className="repo-card">
                  <div className="repo-card-head">
                    <a href={repo.url} target="_blank" rel="noreferrer">
                      {repo.name}
                    </a>
                    <span className="repo-lang">{repo.language}</span>
                  </div>
                  <div className="repo-meta">
                    <span>
                      <i className="fas fa-star"></i> {repo.stars}
                    </span>
                    <span>
                      <i className="fas fa-code-branch"></i> {repo.forks}
                    </span>
                    <span>
                      <i className="fas fa-clock"></i> {updatedLabel}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
