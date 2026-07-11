/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Bundle the branded PPTX skeleton with the deck API route on Vercel.
    outputFileTracingIncludes: {
      "/api/reports/steering-deck": ["./src/assets/steerco-skeleton.pptx"],
    },
  },
  async rewrites() {
    // Public marketing site (trAIlhead) served at the root.
    return [{ source: "/", destination: "/home.html" }];
  },
};

export default nextConfig;
