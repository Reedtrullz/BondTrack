import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Heimdall — THORChain Dashboard',
    short_name: 'Heimdall',
    description:
      'Source-checked THORChain command center for bond provider exposure, LP context, rewards scenarios, and wallet transaction review.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#f59e0b',
    icons: [
      { src: '/heimdall-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/heimdall-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
