const GITHUB_API_BASE = 'https://api.github.com';

const toIsoDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const getCommitItems = (events, limit = 8) => {
  const commits = [];

  events.forEach((event) => {
    if (event?.type !== 'PushEvent') return;
    const repoName = event?.repo?.name || 'unknown/repo';
    const createdAt = toIsoDate(event?.created_at);

    (event?.payload?.commits || []).forEach((commit) => {
      if (commits.length >= limit) return;
      commits.push({
        id: commit?.sha || `${repoName}-${createdAt || Date.now()}`,
        repo: repoName,
        message: (commit?.message || 'No commit message').split('\n')[0],
        url: commit?.url || '',
        timestamp: createdAt,
      });
    });
  });

  return commits.slice(0, limit);
};

const getContributionSummary = (events = [], repos = []) => {
  const summary = {
    totalEvents: events.length,
    pushEvents: 0,
    pullRequests: 0,
    issues: 0,
    repositories: repos.length,
  };

  events.forEach((event) => {
    if (event?.type === 'PushEvent') summary.pushEvents += 1;
    if (event?.type === 'PullRequestEvent') summary.pullRequests += 1;
    if (event?.type === 'IssuesEvent') summary.issues += 1;
  });

  return summary;
};

export const fetchGithubActivity = async (username) => {
  if (!username) {
    throw new Error('GitHub username is required.');
  }

  const [profileRes, eventsRes, reposRes] = await Promise.all([
    fetch(`${GITHUB_API_BASE}/users/${username}`),
    fetch(`${GITHUB_API_BASE}/users/${username}/events/public?per_page=30`),
    fetch(`${GITHUB_API_BASE}/users/${username}/repos?sort=updated&per_page=12`),
  ]);

  if (!profileRes.ok || !eventsRes.ok || !reposRes.ok) {
    throw new Error('Failed to fetch GitHub activity.');
  }

  const profile = await profileRes.json();
  const events = await eventsRes.json();
  const repos = await reposRes.json();

  const normalizedRepos = (Array.isArray(repos) ? repos : []).map((repo) => ({
    id: repo.id,
    name: repo.name,
    url: repo.html_url,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    language: repo.language || 'N/A',
    updatedAt: toIsoDate(repo.updated_at),
  }));

  return {
    profile: {
      login: profile?.login || username,
      name: profile?.name || '',
      avatarUrl: profile?.avatar_url || '',
      bio: profile?.bio || '',
      publicRepos: Number(profile?.public_repos || 0),
      followers: Number(profile?.followers || 0),
      following: Number(profile?.following || 0),
      profileUrl: profile?.html_url || `https://github.com/${username}`,
    },
    commits: getCommitItems(Array.isArray(events) ? events : []),
    repositories: normalizedRepos.slice(0, 6),
    contribution: getContributionSummary(Array.isArray(events) ? events : [], normalizedRepos),
  };
};
