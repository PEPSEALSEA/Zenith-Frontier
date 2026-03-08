import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  basePath: '/Zenith-Frontier',
  images: {
    unoptimized: true, // required for static export
  }
};

export default nextConfig;
