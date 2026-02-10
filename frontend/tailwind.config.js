/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        shelf: {
          50: '#fdf8f0',
          100: '#f9eddb',
          200: '#f2d7b6',
          300: '#e9bb87',
          400: '#df9856',
          500: '#d87c33',
          600: '#c96528',
          700: '#a74e23',
          800: '#864023',
          900: '#6c351f',
        },
      },
    },
  },
  plugins: [],
}
