/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'sans-serif'],
        display: ['"Fraunces"', 'serif'],
      },
      colors: {
        parchment: '#f7f2e7',
        ink: {
          50: '#f4f7f8',
          100: '#dde7ea',
          200: '#bfd2d8',
          300: '#97b4bc',
          400: '#688892',
          500: '#4b6973',
          600: '#36505a',
          700: '#243942',
          800: '#17262e',
          900: '#0e1b22',
        },
        tide: {
          50: '#f1fbfb',
          100: '#d0f1f2',
          200: '#a5e3e5',
          300: '#70d0d6',
          400: '#3ab4c1',
          500: '#1d96a7',
          600: '#157788',
          700: '#155f6d',
          800: '#164d59',
          900: '#173f49',
        },
        ember: {
          50: '#fff5eb',
          100: '#ffe4c8',
          200: '#ffc78a',
          300: '#ffa752',
          400: '#f78a28',
          500: '#df6b0b',
          600: '#c14f04',
          700: '#9f3b08',
          800: '#7f300d',
          900: '#67290f',
        },
      },
      boxShadow: {
        panel: '0 20px 60px -35px rgba(14, 27, 34, 0.35)',
        card: '0 18px 40px -24px rgba(14, 27, 34, 0.28)',
      },
      backgroundImage: {
        grain:
          'radial-gradient(circle at 20% 20%, rgba(29, 150, 167, 0.08), transparent 24%), radial-gradient(circle at 80% 0%, rgba(223, 107, 11, 0.1), transparent 22%)',
      },
    },
  },
  plugins: [],
}
