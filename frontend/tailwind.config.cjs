// tailwind.config.js (ES Module syntax)
/** @type {import('tailwindcss').Config} */
export default { // <-- Change module.exports to export default
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};