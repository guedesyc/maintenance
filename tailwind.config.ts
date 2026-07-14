import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4fbf7",
          100: "#d9f0e1",
          200: "#b2e0c1",
          300: "#86c99c",
          400: "#58ac75",
          500: "#358d59",
          600: "#256f44",
          700: "#1f5838",
          800: "#1d472f",
          900: "#193b29"
        },
        sand: "#f6f1e8",
        ink: "#132218"
      },
      boxShadow: {
        soft: "0 20px 50px rgba(19, 34, 24, 0.08)"
      },
      backgroundImage: {
        haze: "radial-gradient(circle at top, rgba(134, 201, 156, 0.28), transparent 40%), linear-gradient(135deg, #f6f1e8 0%, #ffffff 50%, #eef7f0 100%)"
      }
    },
  },
  plugins: [],
} satisfies Config;
