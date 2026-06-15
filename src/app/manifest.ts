import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Heimdall — THORChain Dashboard',
    short_name: 'Heimdall',
    description:
      'Real-time THORChain bond provider exposure, LP, and rewards dashboard.',
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
