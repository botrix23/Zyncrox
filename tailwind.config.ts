import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      },
      keyframes: {
        widgetFloat: {
          '0%, 100%': { transform: 'translateY(0px) rotateX(2deg) rotateY(-3deg)' },
          '33%': { transform: 'translateY(-8px) rotateX(-1deg) rotateY(2deg)' },
          '66%': { transform: 'translateY(-4px) rotateX(3deg) rotateY(-1deg)' },
        },
        glowPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.08)', opacity: '0.7' },
        },
        notif1: {
          '0%, 100%': { transform: 'translateY(0) rotate(-1.5deg)' },
          '50%': { transform: 'translateY(-7px) rotate(-0.5deg)' },
        },
        notif2: {
          '0%, 100%': { transform: 'translateY(0) rotate(1deg)' },
          '50%': { transform: 'translateY(-6px) rotate(0deg)' },
        },
        badgeBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        orbDrift1: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%':       { transform: 'translate(40px, -30px) scale(1.08)' },
          '66%':       { transform: 'translate(-25px, 20px) scale(0.94)' },
        },
        orbDrift2: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%':       { transform: 'translate(-35px, 25px) scale(0.96)' },
          '66%':       { transform: 'translate(30px, -20px) scale(1.06)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        ringPulse: {
          '0%':   { transform: 'scale(1)',   opacity: '0.6' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        floatUp: {
          '0%':   { transform: 'translateY(0)',    opacity: '0.7' },
          '100%': { transform: 'translateY(-80px)', opacity: '0' },
        },
      },
      animation: {
        'widget-float': 'widgetFloat 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 4s ease-in-out infinite',
        'notif-1': 'notif1 3.5s ease-in-out infinite',
        'notif-2': 'notif2 4s ease-in-out infinite',
        'badge-blink': 'badgeBlink 2s ease-in-out infinite',
        'orb-drift-1': 'orbDrift1 18s ease-in-out infinite',
        'orb-drift-2': 'orbDrift2 22s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
        'ring-pulse': 'ringPulse 2s ease-out infinite',
        'float-up': 'floatUp 4s ease-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
