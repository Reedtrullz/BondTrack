import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // This app uses lucide-react SVG icons and no <Image>/<img> assets, so skip image optimization overhead.
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
