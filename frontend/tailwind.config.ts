import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-bricolage)", "Bricolage Grotesque", "sans-serif"],
        sans: ["var(--font-figtree)", "Figtree", "system-ui", "sans-serif"],
      },
      colors: {
        /* Verde institucional UNIFESP — escala baseada em Pantone 350 C */
        brand: {
          50:  "#e9f4ee",
          100: "#c3e3cf",
          200: "#93ccad",
          300: "#5cb48b",
          400: "#2e9e70",
          500: "#0d8757",
          600: "#0a7049",
          700: "#085738",  /* ~UNIFESP principal verde escuro */
          800: "#054228",
          900: "#032b19",
          950: "#011509",
        },
        /* Ouro — acento complementar ao verde */
        gold: {
          400: "#d4a017",
          500: "#b8880e",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(6px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
