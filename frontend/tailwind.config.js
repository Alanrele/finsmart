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
        // Paleta oficial (DOC/GUIA_DE_ESTILO.md) — única fuente de color de marca
        // Azul petróleo / teal: elementos primarios y CTA (AA sobre blanco)
        primary: {
          50: '#EEF4F5',
          100: '#DCE8EA',
          200: '#B7D0D4',
          300: '#8FB4BA',
          400: '#63929B',
          500: '#3F7079',
          600: '#355F67',
          700: '#2B4D54',
          800: '#213B40',
          900: '#16282C',
          DEFAULT: '#3F7079',
        },
        // Beige claro / arena: superficies suaves y fondos teñidos
        sand: {
          50: '#FAF8F2',
          100: '#F2EFE4',
          200: '#E5DFCC',
          300: '#D4CBB0',
          400: '#C4B894',
          500: '#B3A67B',
          DEFAULT: '#D4CBB0',
        },
        // Taupe / beige oscuro: texto secundario con tinte, bordes cálidos
        taupe: {
          100: '#EDEBE3',
          200: '#DBD7C8',
          300: '#C2BBA5',
          400: '#A79E82',
          500: '#8C8368',
          600: '#706953',
          700: '#554F3F',
          DEFAULT: '#A79E82',
        },
        // Verde salvia: éxito, positivo, acentos suaves
        sage: {
          50: '#F1F6F3',
          100: '#E3EDE8',
          200: '#C8DBD1',
          300: '#A6C0B4',
          400: '#84A595',
          500: '#658876',
          600: '#4F6C5E',
          700: '#3D5348',
          DEFAULT: '#A6C0B4',
        },
        // Fondo de página según la guía (claro/oscuro)
        page: {
          DEFAULT: '#F2F2F7',
          dark: '#09090C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      screens: {
        'xs': '375px',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
