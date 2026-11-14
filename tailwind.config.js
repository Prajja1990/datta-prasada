/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFCF7',
          100: '#FAF6EE',
          200: '#F5EED9',
          300: '#EBDDBB',
          400: '#DEC494',
          500: '#CCA86E',
        },
        ivory: {
          DEFAULT: '#FDFBF7',
          dark: '#F5EFE6',
        },
        temple: {
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          500: '#2D6A4F',
          600: '#1B4332',
          700: '#143628',
          800: '#0E271D',
          900: '#081C15',
        },
        gold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
      },
      fontFamily: {
        serif: ['Marcellus', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        kannada: ['"Noto Sans Kannada"', 'system-ui', 'sans-serif'],
      },
      screens: {
        'print': { 'raw': 'print' },
      },
      boxShadow: {
        'traditional': '0 4px 20px -2px rgba(180, 83, 9, 0.12), 0 2px 6px -1px rgba(27, 67, 50, 0.08)',
        'gold': '0 4px 20px -2px rgba(217, 119, 6, 0.25)',
      }
    },
  },
  plugins: [],
}
