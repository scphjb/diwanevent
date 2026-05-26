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
            light: '#7DD3FC'
          },
        },
        emerald: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: 'var(--brand-secondary)',
          500: 'var(--brand-primary)',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: 'var(--brand-surface)',
          900: 'var(--brand-dark)',
          950: 'var(--brand-dark)',
        },
        green: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: 'var(--brand-secondary)',
          500: 'var(--brand-primary)',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: 'var(--brand-surface)',
          900: 'var(--brand-dark)',
          950: 'var(--brand-dark)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Cairo', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
        arabic: ['Cairo', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(ellipse at 20% 50%, rgba(42, 100, 236, 0.15), transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(56, 189, 248, 0.1), transparent 50%)',
      }
    },
  },
  plugins: [],
}
