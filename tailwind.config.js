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
        gray: {
          50: '#FAF8F5',
          100: '#F2EFE9',
          200: '#E5E0D8',
          300: '#CDC6BB',
          400: '#A8A095',
          500: '#8A8278',
          600: '#6B645C',
          700: '#524C45',
          800: '#3D3731',
          900: '#1F1C18',
          950: '#141210',
        },
        indigo: {
          50: '#FBF6F4',
          100: '#F2E4DF',
          200: '#E3C9C0',
          300: '#CEA699',
          400: '#B88373',
          500: '#A26B59',
          600: '#885649',
          700: '#6E453A',
          800: '#5C3A31',
          900: '#4A2E27',
          950: '#3D241F',
        },
      },
    },
  },
  plugins: [],
}