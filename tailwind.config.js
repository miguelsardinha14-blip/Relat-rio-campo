/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0A192F',
          800: '#0F2544',
          700: '#173763',
        }
      }
    }
  },
  plugins: []
};
