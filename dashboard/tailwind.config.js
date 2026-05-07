export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1A8A6A',   // Emerald
          secondary: '#D4AF37', // Gold
          gold: {
            DEFAULT: '#D4AF37',
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
        'hero-gradient': 'radial-gradient(ellipse at 20% 50%, rgba(26, 138, 106, 0.15), transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(212, 175, 55, 0.1), transparent 50%)',
      }
    },
  },
  plugins: [],
}
