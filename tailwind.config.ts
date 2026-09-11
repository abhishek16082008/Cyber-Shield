import type { Config } from "tailwindcss";

/**
 * Tailwind configuration for Cyber Shield.
 *
 * The color palette is driven by CSS variables defined in `src/index.css`.
 * That means you change a color ONCE in index.css and it updates everywhere.
 * Tailwind classes like `bg-secure` or `text-threat` read those variables.
 */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // --- shadcn base tokens (all reference CSS variables) ---
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },

        // --- Cyber Shield semantic colors ---
        // Blue = secure / trusted / analysis signals
        secure: {
          DEFAULT: "hsl(var(--secure))",
          foreground: "hsl(var(--secure-foreground))",
        },
        // Red = threat / high-risk / critical
        threat: {
          DEFAULT: "hsl(var(--threat))",
          foreground: "hsl(var(--threat-foreground))",
        },
        // Amber = suspicious / warning
        warn: {
          DEFAULT: "hsl(var(--warn))",
          foreground: "hsl(var(--warn-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        // Clean, readable UI font + monospace for technical/forensic data.
        sans: ["Inter", "system-ui", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        // Soft glow used on trusted / threat elements.
        glow: "0 0 20px hsl(var(--secure) / 0.35)",
        "glow-threat": "0 0 20px hsl(var(--threat) / 0.4)",
      },
      keyframes: {
        // Slow drift of the background grid.
        "grid-pan": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "40px 40px" },
        },
        // Vertical scanning line used on the Investigation view.
        scan: {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { transform: "translateY(100%)", opacity: "0" },
        },
        // Pulsing glow for status chips / active states.
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        // Gentle float for the brand mark on the Home screen.
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-18px) rotate(3deg)" },
        },
        // Splash intro.
        "splash-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "60%": { opacity: "1", transform: "scale(1.02)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "dash": {
          to: { strokeDashoffset: "0" },
        },
        // Indeterminate horizontal loading sweep (splash + loading states).
        "loading-x": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
      },
      animation: {
        "grid-pan": "grid-pan 3s linear infinite",
        scan: "scan 2.2s ease-in-out infinite",
        "pulse-glow": "pulse-glow 1.6s ease-in-out infinite",
        float: "float 7s ease-in-out infinite",
        "splash-in": "splash-in 1s ease-out forwards",
        "fade-up": "fade-up 0.5s ease-out forwards",
        "loading-x": "loading-x 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
