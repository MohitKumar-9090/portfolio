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
      <div className="dashboard-card dashboard-wide github-activity-card">
        <h3>
          <i className="fab fa-github"></i> GitHub Activity
        </h3>
        <p>Loading GitHub data...</p>
      </div>
    );
  }

  if (state.error || !state.data) {
    return (
      <div className="dashboard-card dashboard-wide github-activity-card">
        <h3>
          <i className="fab fa-github"></i> GitHub Activity
        </h3>
        <p>{state.error || 'No data available.'}</p>
      </div>
    );
  }

  const { profile, commits, repositories, contribution } = state.data;

  return (
    <div className="dashboard-card dashboard-wide github-activity-card">
      <h3>
        <i className="fab fa-github"></i> GitHub Activity
      </h3>

      <div className="github-profile-card">
        <div className="github-avatar-wrap">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.login} /> : null}
        </div>
        <div>
          <strong>{profile.name || profile.login}</strong>
          <p>@{profile.login}</p>
          <p>{profile.bio || 'Developer profile'}</p>
          <div className="github-profile-badges">
            <span>Open Source</span>
            <span>Active Developer</span>
          </div>
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
          <div className="commit-cards">
            {commits.length === 0 && <p>No recent public commits.</p>}
            {commits.map((commit) => {
              const commitDate = commit.timestamp
                ? new Date(commit.timestamp).toLocaleDateString()
                : 'N/A';
              return (
                <article key={commit.id} className="commit-card">
                  <div className="commit-card-head">
                    <strong>{commit.repo}</strong>
                    <span>{commitDate}</span>
                  </div>
                  <p>{commit.message}</p>
                </article>
              );
            })}
          </div>
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
