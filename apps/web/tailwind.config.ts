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
        // Semantic surface tokens
        surface: {
          page: 'var(--surface-page)',
          base: 'var(--surface-base)',
          raised: 'var(--surface-raised)',
          overlay: 'var(--surface-overlay)',
          sunken: 'var(--surface-sunken)',
          hover: 'var(--surface-hover)',
          active: 'var(--surface-active)',
        },
        // Semantic border tokens
        border: {
          DEFAULT: 'var(--border-default)',
          default: 'var(--border-default)',
          strong: 'var(--border-strong)',
          subtle: 'var(--border-subtle)',
          focus: 'var(--border-focus)',
          divider: 'var(--border-divider)',
          card: 'var(--border-card)',
        },
        // Semantic text tokens
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          disabled: 'var(--text-disabled)',
          inverse: 'var(--text-inverse)',
        },
        // Semantic accent tokens
        accent: {
          DEFAULT: 'var(--accent-primary)',
          primary: 'var(--accent-primary)',
          hover: 'var(--accent-hover)',
          active: 'var(--accent-active)',
          subtle: 'var(--accent-subtle)',
          'subtle-border': 'var(--accent-subtle-border)',
          foreground: 'var(--accent-foreground)',
        },
        // Semantic status tokens
        status: {
          success: 'var(--status-success)',
          'success-bg': 'var(--status-success-bg)',
          'success-border': 'var(--status-success-border)',
          warning: 'var(--status-warning)',
          'warning-bg': 'var(--status-warning-bg)',
          'warning-border': 'var(--status-warning-border)',
          error: 'var(--status-error)',
          'error-bg': 'var(--status-error-bg)',
          'error-border': 'var(--status-error-border)',
          info: 'var(--status-info)',
          'info-bg': 'var(--status-info-bg)',
          'info-border': 'var(--status-info-border)',
        },
        // Retained for P2 Branding
        brand: {
          50: '#ecfeff',
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
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        card: 'var(--shadow-sm)',
        'card-hover': 'var(--shadow-md)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-slide-up': 'fadeSlideUp 0.3s ease-out both',
        'fade-in': 'fadeIn 0.2s ease-out both',
        'slide-in-left': 'slideInLeft 0.25s ease-out both',
      },
      keyframes: {
        fadeSlideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-10px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
