/** @type {import('tailwindcss').Config} */
// Wraps a CSS variable so Tailwind opacity modifiers (bg-success/15) work via color-mix.
const v = (name) => ({ opacityValue }) =>
  opacityValue === undefined || opacityValue === "1" || String(opacityValue).startsWith("var(") ? `var(${name})` : `color-mix(in srgb, var(${name}) ${Number(opacityValue) * 100}%, transparent)`;
// Tokens mirror monoZHubUI-Core (tailwind.config.js + app.css): Inter, surface-0..3 scale, blue accent,
// dark default with a light mode toggled via [data-mode].
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: ["selector", '[data-mode="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "DM Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      colors: {
        background: v("--background"),
        foreground: v("--foreground"),
        border: v("--border"),
        surface: { 0: v("--surface-0"), 1: v("--surface-1"), 2: v("--surface-2"), 3: v("--surface-3") },
        ink: { primary: v("--text-primary"), secondary: v("--text-secondary"), muted: v("--text-muted") },
        accent: { DEFAULT: v("--accent"), hover: v("--accent-hover"), foreground: v("--accent-foreground") },
        primary: {
          0: v("--primary-0"), 100: v("--primary-100"), 200: v("--primary-200"), 300: v("--primary-300"),
          400: v("--primary-400"), 500: v("--primary-500"), 600: v("--primary-600"), 700: v("--primary-700"),
        },
        gray: {
          0: v("--gray-0"), 100: v("--gray-100"), 200: v("--gray-200"), 300: v("--gray-300"), 400: v("--gray-400"),
          500: v("--gray-500"), 600: v("--gray-600"), 700: v("--gray-700"), 800: v("--gray-800"), 900: v("--gray-900"),
        },
        btn: { DEFAULT: v("--btn-bg"), foreground: v("--btn-fg"), hover: v("--btn-hover") },
        link: v("--link"),
        success: v("--success"),
        warning: v("--warning"),
        danger: v("--danger"),
        info: v("--info"),
      },
    },
  },
  plugins: [],
};
