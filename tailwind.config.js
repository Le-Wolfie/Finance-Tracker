import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f7f9fb",
        surface: "#ffffff",
        "surface-muted": "#f2f4f6",
        "surface-subtle": "#eceef0",
        "surface-border": "#e0e3e5",
        "text-primary": "#191c1e",
        "text-secondary": "#505f76",
        "text-muted": "#6e7378",
        primary: "#000000",
        "primary-strong": "#001453",
        accent: "#3755c3",
        success: "#1f9d6a",
        danger: "#ba1a1a",
      },
      borderRadius: {
        xl: "0.75rem",
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 28px rgba(14, 25, 49, 0.08)",
      },
      backgroundImage: {
        editorial: "linear-gradient(135deg, #000000 0%, #001453 100%)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
