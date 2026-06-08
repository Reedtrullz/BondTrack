import type { MetadataRoute } from 'next';
import { articles } from './learn/articles';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bond.thorchain.no';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const learnArticles = articles.map((article) => ({
    url: `${APP_URL}/learn/${article.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [
    { url: APP_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${APP_URL}/learn`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...learnArticles,
  ];
}
