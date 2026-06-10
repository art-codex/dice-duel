/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        retro: {
          yellow: '#FFD700',
          red: '#FF3333',
          blue: '#3366FF',
          purple: '#9933CC',
          cyan: '#00FFFF',
          black: '#000000',
        },
      },
      fontFamily: {
        pixel: ['VT323', 'monospace'],
      },
      animation: {
        blink: 'blink 1s step-start infinite',
      },
      keyframes: {
        blink: {
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};