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
        "pb-blue":    "#2C9DD5",
        "pb-orange":  "#E87C02",
        "pb-red":     "#BA0D0B",
        "pb-maroon":  "#5C0B03",

        // Light surfaces
        "pb-dark":    "#FFFFFF",
        "pb-surface": "#FFFFFF",
        "pb-raised":  "#F2F4F6",

        // Text
        "pb-light":   "#15191C",
        "pb-muted":   "#5B6670",
        "pb-silver":  "#1F242A",

        // Borders
        "pb-border":  "#E5E8EB",
        "pb-border2": "#D6DADD",

        // Tints
        "pb-blue-tint":   "#EAF4FB",
        "pb-red-tint":    "#FCEAEA",
        "pb-orange-tint": "#FDF1E5",
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
        "glow-blue":   "0 0 24px rgba(44, 157, 213, 0.15)",
        "glow-red":    "0 0 24px rgba(186, 13, 11, 0.20)",
        "glow-orange": "0 0 24px rgba(232, 124, 2, 0.15)",
        "card":        "0 2px 16px rgba(0, 0, 0, 0.4)",
        "card-hover":  "0 8px 32px rgba(0, 0, 0, 0.6)",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      backgroundImage: {
        "gradient-dark":
          "linear-gradient(135deg, #FFFFFF 0%, #F2F4F6 100%)",
        "gradient-blue":
          "linear-gradient(135deg, #EAF4FB 0%, #FFFFFF 100%)",
        "gradient-red":
          "linear-gradient(135deg, #BA0D0B 0%, #5C0B03 100%)",
        "radial-blue":
          "radial-gradient(ellipse at 50% 0%, rgba(44,157,213,0.08) 0%, transparent 70%)",
        "radial-red":
          "radial-gradient(ellipse at 50% 100%, rgba(186,13,11,0.06) 0%, transparent 70%)",
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
