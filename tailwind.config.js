/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        title: ['Cinzel', 'serif'],
        body: ['Crimson Pro', 'serif'],
      },
      colors: {
        night: '#0d0f14',
        parchment: '#ece1c6',
        ember: '#d6b36e',
        ink: '#1d130f',
        moss: '#748661',
      },
      boxShadow: {
        ornate: '0 25px 60px rgba(0, 0, 0, 0.55)',
      },
      animation: {
        'fade-slide': 'fadeSlide 380ms ease-out',
        shimmer: 'shimmer 1500ms linear infinite',
      },
      keyframes: {
        fadeSlide: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(120%)' },
        },
      },
    },
  },
  plugins: [],
}
