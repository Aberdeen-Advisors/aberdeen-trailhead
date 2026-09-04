import type { Config } from "tailwindcss";

// Aberdeen Advisors brand palette — kept in lockstep with the marketing site's
// design tokens in public/css/styles.css (:root). If a value changes there,
// change it here too so the portal and the site stay visually identical.
//
//   navy #09375F · navy-deep #003862 · teal #44B0B1 · teal-bright #00B3B2
//   azure #0072AD · ink #231F20 · mist #F4F8FA · line #DDE7ED
//   status: good #00A676 · gold #F7CE01 · bad #D85049 · cyan #03CBFF
//
// Status scales keep two tiers on purpose: 500 is the *fill* (matches the site's
// chart colors exactly) and 300/400 are darkened text-safe variants that clear
// 4.5:1 on white. Never use a 500 for small text.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "Segoe UI", "Arial", "sans-serif"],
        // Numerals and dense report chrome, mirroring the site's --pbi-font.
        num: ["Segoe UI", "-apple-system", "BlinkMacSystemFont", "Helvetica Neue", "Arial", "sans-serif"],
      },
      colors: {
        hv: {
          bg: "#F4F8FA",      // mist — page background
          panel: "#FFFFFF",   // cards / panels
          border: "#DDE7ED",  // line
          accent: "#09375F",  // navy — buttons, emphasis
          accent2: "#0E7C7D", // teal darkened for text on white (ADA)
          text: "#231F20",    // ink
          muted: "#5B6B78",
          subtle: "#8296A6",
        },
        navy: {
          DEFAULT: "#09375F",
          deep: "#003862",
          mid: "#0B4A7E",
          tint: "#E8EEF4",
        },
        teal: {
          DEFAULT: "#44B0B1",
          bright: "#00B3B2",
          tint: "#D9F0F0",
          ink: "#0E7C7D", // text-safe on white
        },
        azure: {
          DEFAULT: "#0072AD",
          tint: "#E4F1F9",
          ink: "#025C8C",
        },
        // Status — 500 = fill (site chart colors), 300/400 = text-safe on white.
        emerald: { 50: "#E6F6F1", 300: "#00694E", 400: "#00805B", 500: "#00A676", 600: "#00805B" },
        amber: { 50: "#FEF7DF", 300: "#7A6000", 400: "#8A6D00", 500: "#F7CE01", 600: "#B79800" },
        red: { 50: "#FBECEB", 300: "#AE332D", 400: "#C23A34", 500: "#D85049", 600: "#B8332C" },
        sky: { 50: "#E7F3FA", 300: "#176E9F", 400: "#1C7FB8", 500: "#0072AD" },
        blue: { 400: "#0B5FA0", 500: "#0C4A80", 600: "#09375F" },
      },
      borderRadius: {
        hv: "14px",
      },
      boxShadow: {
        // Matches --shadow / --shadow-lg on the marketing site.
        hv: "0 8px 30px rgba(9, 55, 95, 0.10)",
        "hv-lg": "0 18px 60px rgba(9, 55, 95, 0.18)",
        // Resting elevation for portal cards — quieter than the site's hover state.
        card: "0 1px 2px rgba(9, 55, 95, 0.05), 0 4px 16px rgba(9, 55, 95, 0.05)",
      },
      backgroundImage: {
        // The marketing hero, reused as the portal's executive band.
        "hv-hero":
          "radial-gradient(900px 420px at 88% -20%, rgba(68,176,177,0.38), transparent 60%), radial-gradient(700px 360px at -10% 120%, rgba(0,114,173,0.32), transparent 60%), linear-gradient(150deg, #003862 0%, #09375F 55%, #0B4A7E 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
