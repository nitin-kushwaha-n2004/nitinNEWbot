/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dark: { 900:'#0a0a0a', 800:'#111111', 700:'#161616', 600:'#1a1a1a', 500:'#222222', 400:'#2a2a2a' },
        brand: { DEFAULT:'#378ADD', light:'#5b9ee8', dark:'#185FA5' },
        success: '#1D9E75',
        danger:  '#E24B4A',
        warning: '#EF9F27',
      }
    }
  },
  plugins: []
}
