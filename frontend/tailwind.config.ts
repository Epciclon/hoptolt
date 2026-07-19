import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/modules/**/*.{js,ts,jsx,tsx,mdx}',
    './src/shared/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8faf6',
          100: '#c5f0e8',
          200: '#8edacf',
          300: '#57c4b6',
          400: '#2ec9a7',
          500: 'var(--color-primary)',
          600: 'var(--color-primary-dark)',
          700: '#12876e',
          800: '#0e6e58',
          900: '#0a5542',
        },
        sidebar: {
          DEFAULT: 'var(--color-sidebar)',
          light: 'var(--color-sidebar)',
          dark: 'var(--color-sidebar)',
        },
        theme: {
          bg: 'var(--color-page-bg)',
          card: 'var(--color-card-bg)',
          surface: 'var(--color-surface-bg)',
          text: 'var(--color-text-primary)',
          muted: 'var(--color-text-secondary)',
          faint: 'var(--color-text-muted)',
          border: 'var(--color-border)',
          'border-strong': 'var(--color-border-strong)',
        }
      },
      backgroundColor: {
        'page': 'var(--color-page-bg)',
        'card': 'var(--color-card-bg)',
        'theme-surface': 'var(--color-surface-bg)',
      },
      textColor: {
        'main': 'var(--color-text-primary)',
        'muted': 'var(--color-text-secondary)',
        'theme-faint': 'var(--color-text-muted)',
      },
      borderColor: {
        'default': 'var(--color-border)',
        'strong': 'var(--color-border-strong)',
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(44, 62, 80, 0.08)',
        'card-hover': '0 4px 20px rgba(44, 62, 80, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
