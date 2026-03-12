import { useEffect } from 'react';
import { SITE_CONFIG } from '../config/site';

const upsertMeta = (attribute, key, content) => {
  if (!key || !content) return;

  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
};

export default function SeoHead({
  title,
  description,
  keywords,
  path = '/',
  image = '/vite.svg',
  type = 'website',
}) {
  useEffect(() => {
    const pageTitle = title || SITE_CONFIG.title;
    const pageDescription = description || SITE_CONFIG.description;
    const pageKeywords = keywords || SITE_CONFIG.keywords;
    const pageUrl = `${SITE_CONFIG.siteUrl}${path}`;
    const imageUrl = image.startsWith('http') ? image : `${SITE_CONFIG.siteUrl}${image}`;

    document.title = pageTitle;

    upsertMeta('name', 'description', pageDescription);
    upsertMeta('name', 'keywords', pageKeywords);
    upsertMeta('name', 'author', SITE_CONFIG.author);

    upsertMeta('property', 'og:title', pageTitle);
    upsertMeta('property', 'og:description', pageDescription);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', pageUrl);
    upsertMeta('property', 'og:image', imageUrl);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', pageTitle);
    upsertMeta('name', 'twitter:description', pageDescription);
    upsertMeta('name', 'twitter:image', imageUrl);
  }, [description, image, keywords, path, title, type]);

  return null;
}
