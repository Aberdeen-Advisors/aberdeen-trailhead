/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Bundle the cover lockup with the deck API route on Vercel — public/ is not
    // readable from a serverless function unless it is traced in explicitly.
    outputFileTracingIncludes: {
      "/api/reports/steering-deck": [
        "./public/horizonview-logo-white.png",
        "./public/deck-cover.png",
        "./public/assets/aberdeen-logo.png",
      ],
      // The client's Executive Dashboard template, filled by this route.
      "/api/reports/executive-dashboard": ["./src/assets/templates/executive-dashboard.pptx"],
      "/api/reports/guest-deck": ["./src/assets/templates/executive-dashboard.pptx"],
    },
  },
  async rewrites() {
    // Public marketing site (trAIlhead) served at the root.
    return [{ source: "/", destination: "/home.html" }];
  },
};

export default nextConfig;
