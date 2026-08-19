import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand: Cyan accent
        brand: {
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        // Deep obsidian backgrounds
        obsidian: {
          950: '#050a0f',
          900: '#070e18',
          800: '#0a1628',
          700: '#0d1e38',
          600: '#0f2040',
          500: '#132848',
          400: '#1a3a5c',
          300: '#2c5f7a',
          200: '#5a8ca8',
          100: '#a8c8dc',
        },
        // Glassmorphism tints
        glass: {
          cyan:  'rgba(6, 182, 212, 0.06)',
          blue:  'rgba(14, 116, 144, 0.08)',
          dark:  'rgba(5, 10, 15, 0.70)',
          white: 'rgba(226, 244, 255, 0.05)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan':    '0 0 24px rgba(6, 182, 212, 0.35)',
        'glow-cyan-sm': '0 0 12px rgba(6, 182, 212, 0.25)',
        'glow-cyan-lg': '0 0 48px rgba(6, 182, 212, 0.25)',
        'card':         '0 4px 24px rgba(0, 0, 0, 0.6), 0 1px 3px rgba(0, 0, 0, 0.4)',
        'card-hover':   '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 12px rgba(6, 182, 212, 0.25)',
        'inner-glow':   'inset 0 1px 0 rgba(6, 182, 212, 0.1)',
      },
      backgroundImage: {
        'obsidian-gradient': 'linear-gradient(135deg, #050a0f 0%, #0a1628 50%, #071525 100%)',
        'cyan-gradient':     'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
        'hero-gradient':     'linear-gradient(135deg, #050a0f 0%, #0a1628 40%, #071d35 70%, #083650 100%)',
        'card-gradient':     'linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(10,22,40,0.8) 100%)',
      },
      animation: {
        'fade-slide-up':  'fadeSlideUp 0.4s ease-out both',
        'fade-in':        'fadeIn 0.35s ease-out both',
        'slide-in-left':  'slideInLeft 0.3s ease-out both',
        'aurora':         'auroraFloat 8s ease-in-out infinite',
        'pulse-ring':     'pulseRing 2s ease-out infinite',
        'cyan-pulse':     'cyanPulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeSlideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        auroraFloat: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)', opacity: '0.25' },
          '33%':      { transform: 'translate(30px, -20px) scale(1.08)', opacity: '0.35' },
          '66%':      { transform: 'translate(-20px, 30px) scale(0.95)', opacity: '0.28' },
        },
        pulseRing: {
          '0%':    { boxShadow: '0 0 0 0 rgba(6, 182, 212, 0.5)' },
          '70%':   { boxShadow: '0 0 0 12px rgba(6, 182, 212, 0)' },
          '100%':  { boxShadow: '0 0 0 0 rgba(6, 182, 212, 0)' },
        },
        cyanPulse: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(6, 182, 212, 0.6)' },
          '50%':      { opacity: '0.8', boxShadow: '0 0 0 6px rgba(6, 182, 212, 0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
