/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        doral: {
          red: "#b91c1c",
          ink: "#18212f",
          paper: "#f8fafc",
        },
      },
      boxShadow: {
        soft: "0 18px 45px -28px rgba(15, 23, 42, 0.45)",
      },
    },
  },
  plugins: [],
};
