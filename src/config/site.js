export const SITE_CONFIG = {
  siteName: 'Mohit Pandey Portfolio',
  siteUrl: (import.meta.env.VITE_SITE_URL || 'https://example.com').replace(/\/$/, ''),
  author: 'Mohit Pandey',
  title: 'Mohit Pandey | AI & ML Developer',
  description:
    'Portfolio of Mohit Pandey, AI & ML focused developer showcasing projects, skills, and engineering work.',
  keywords:
    'Mohit Pandey, AI developer, ML developer, React portfolio, web developer, projects, software engineer',
  githubUsername: import.meta.env.VITE_GITHUB_USERNAME || 'MohitKumar-9090',
  googleAnalyticsId: import.meta.env.VITE_GA_MEASUREMENT_ID || '',
};

export const CHAT_API_BASE = (
  import.meta.env.VITE_CHAT_API_URL || 'https://portfolio-n4ko.onrender.com'
).replace(/\/$/, '');
