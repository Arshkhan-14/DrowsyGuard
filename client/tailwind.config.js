/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        danger: {
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
        },
        warn: {
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        success: {
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
        surface: {
          900: "#0a0a14",
          800: "#10101e",
          700: "#16162a",
          600: "#1e1e38",
          500: "#252544",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "hero-gradient": "radial-gradient(ellipse at top, #312e81 0%, #0a0a14 60%)",
        "card-gradient": "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(16,16,30,0.8) 100%)",
        "alert-high": "linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(16,16,30,0.8) 100%)",
        "alert-medium": "linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(16,16,30,0.8) 100%)",
        "alert-low": "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,16,30,0.8) 100%)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "ping-slow": "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(20px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      boxShadow: {
        glow: "0 0 20px rgba(99,102,241,0.4)",
        "glow-danger": "0 0 20px rgba(239,68,68,0.4)",
        "glow-success": "0 0 20px rgba(16,185,129,0.4)",
        card: "0 4px 24px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};
