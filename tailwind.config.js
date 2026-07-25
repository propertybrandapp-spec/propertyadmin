/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette
        "pb-blue":    "#1E88E5",
        "pb-orange":  "#F59E0B",
        "pb-red":     "#DC2626",
        "pb-maroon":  "#B91C1C",

        // Light surfaces
        "pb-dark":    "#FFFFFF",
        "pb-surface": "#FFFFFF",
        "pb-raised":  "#F1F5F9",

        // Text
        "pb-light":   "#1F2937",
        "pb-muted":   "#6B7280",
        "pb-silver":  "#1F2937",

        // Borders
        "pb-border":  "#E2E8F0",
        "pb-border2": "#E2E8F0",

        // Tints
        "pb-blue-tint":   "#EFF6FF",
        "pb-red-tint":    "#FEE2E2",
        "pb-orange-tint": "#FEF3C7",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        "glow-blue":   "0 0 24px rgba(30, 136, 229, 0.15)",
        "glow-red":    "0 0 24px rgba(220, 38, 38, 0.20)",
        "glow-orange": "0 0 24px rgba(245, 158, 11, 0.15)",
        "card":        "0 2px 16px rgba(0, 0, 0, 0.4)",
        "card-hover":  "0 8px 32px rgba(0, 0, 0, 0.6)",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      backgroundImage: {
        "gradient-dark":
          "linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 100%)",
        "gradient-blue":
          "linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)",
        "gradient-red":
          "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)",
        "radial-blue":
          "radial-gradient(ellipse at 50% 0%, rgba(30,136,229,0.08) 0%, transparent 70%)",
        "radial-red":
          "radial-gradient(ellipse at 50% 100%, rgba(220,38,38,0.06) 0%, transparent 70%)",
      },
      animation: {
        "fade-in":   "fadeIn 0.3s ease forwards",
        "pulse-dot": "pulse-dot 1.5s ease-in-out infinite",
        "shimmer":   "shimmer 1.5s infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0, transform: "translateY(8px)" },
          to:   { opacity: 1, transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: 1 },
          "50%":      { opacity: 0.35 },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
