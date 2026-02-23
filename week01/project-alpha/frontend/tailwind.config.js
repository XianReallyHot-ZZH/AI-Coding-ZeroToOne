/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        md: {
          yellow: "#FFE234",
          "yellow-dark": "#F5D800",
          "yellow-pale": "#FFFBE6",
          blue: "#1A2B6B",
          "blue-mid": "#2C3E9A",
          "blue-light": "#E8ECFF",
          "duck-orange": "#F4820A",
          teal: "#00BFA5",
          white: "#FFFFFF",
          "off-white": "#F9F8F5",
          "gray-100": "#F3F2EE",
          "gray-200": "#E5E3DC",
          "gray-400": "#9E9B8F",
          "gray-600": "#5C5A53",
          "gray-900": "#1C1B17",
        },
        success: {
          DEFAULT: "#00BFA5",
          foreground: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#F4820A",
          foreground: "#FFFFFF",
        },
        info: {
          DEFAULT: "#2C3E9A",
          foreground: "#FFFFFF",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
        "3xl": "48px",
        pill: "9999px",
      },
      boxShadow: {
        'md-sm': '0 1px 3px rgba(26,43,107,0.08)',
        'md-md': '0 4px 16px rgba(26,43,107,0.10)',
        'md-lg': '0 12px 40px rgba(26,43,107,0.14)',
        'md-xl': '0 24px 64px rgba(26,43,107,0.18)',
        'md-card': '3px 3px 0 0 #1A2B6B',
        'md-card-hover': '5px 5px 0 0 #1A2B6B',
        'md-card-active': '1px 1px 0 0 #1A2B6B',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0' }],
        'base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.02em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em' }],
        '5xl': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.03em' }],
        '6xl': ['3.75rem', { lineHeight: '1.15', letterSpacing: '-0.04em' }],
        '7xl': ['4.5rem', { lineHeight: '1.15', letterSpacing: '-0.04em' }],
      },
      spacing: {
        '4.5': '1.125rem',
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
      },
      transitionTimingFunction: {
        'md-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        'fast': '150ms',
        'base': '250ms',
        'slow': '400ms',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'scroll': 'scroll 30s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        scroll: {
          'from': { transform: 'translateX(0)' },
          'to': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}
