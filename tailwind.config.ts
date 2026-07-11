import type { Config } from "tailwindcss";

// Aberdeen Advisors brand palette (Aberdeen Style Guide 1.0) — light theme.
// Primary: Aberdeen Blue #09375F · Verdigris #44B0B1 · White · Onyx #404040
// Secondary (charts/status): Jade #00A676 · Gold #F7D002 · Jasper #DB504A · Deep Sky #5CC8FF
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "Arial", "sans-serif"],
      },
      colors: {
        hv: {
          bg: "#F5F8FB",      // light page background
          panel: "#FFFFFF",   // white panels/cards
          border: "#DCE6EF",
          accent: "#09375F",  // Aberdeen Blue (buttons, emphasis)
          accent2: "#2E8A8B", // Verdigris, darkened for text on white (ADA)
          text: "#404040",    // Onyx body text
          muted: "#64778C",
        },
        // Map utility status colors to the Aberdeen secondary palette.
        // 300/400 tuned dark enough for text on white; 500 = fills.
        emerald: { 300: "#00795A", 400: "#008F65", 500: "#00A676" }, // Jade
        amber: { 300: "#8A6D00", 400: "#8A6D00", 500: "#F7D002" },   // Gold
        red: { 400: "#C23A34", 500: "#DB504A" },                     // Jasper
        sky: { 400: "#1C7FB8" },                                     // Deep Sky (text-safe)
        blue: { 500: "#0C4A80" },                                    // button hover
      },
    },
  },
  plugins: [],
};
export default config;
