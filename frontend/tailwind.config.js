/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0B0F19",
        darkPanel: "#161B26",
        darkBorder: "#272E3F",
        cyanAccent: "#00E5FF",
        tealAccent: "#00F5D4",
      },
    },
  },
  plugins: [],
}
