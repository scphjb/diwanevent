export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: 'var(--brand-dark)',
          primary: 'var(--brand-primary)',
          secondary: 'var(--brand-secondary)',
          surface: 'var(--brand-surface)',
          text: 'var(--brand-text)',
          muted: 'var(--brand-muted)',
          gold: {
            DEFAULT: 'var(--brand-secondary)',
            light: '#F0C040'
          },
        }
      },
      fontFamily: {
        sans: ['Inter', 'Cairo', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
        arabic: ['Cairo', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(ellipse at 20% 50%, rgba(29, 181, 138, 0.15), transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(212, 175, 55, 0.1), transparent 50%)',
      }
    },
  },
  plugins: [],
}
