/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'mockup': ['Paytone One', 'sans-serif'],
      },
      colors: {
        'green': {
          400: '#00a652',
          500: '#004b23',
          600: '#003d1c',
        },
      },
    },
  },
  plugins: [],
}
