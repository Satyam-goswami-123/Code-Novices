/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0B0F17',
          800: '#111827',
          700: '#1F2937',
          600: '#374151',
        },
        primary: {
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        mule: {
          500: '#F59E0B',
          600: '#D97706',
        },
        terminal: {
          500: '#EF4444',
          600: '#DC2626',
        }
      }
    },
  },
  plugins: [],
}
