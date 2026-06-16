import type { Config } from 'tailwindcss';

const config: Config = {
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
          500: '#1abc9c',
          600: '#16a085',
          700: '#12876e',
          800: '#0e6e58',
          900: '#0a5542',
        },
        sidebar: {
          DEFAULT: '#263445',
          light: '#2d3e50',
          dark: '#1a252f',
        },
      },
      backgroundColor: {
        'page': '#f4f6fa',
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
