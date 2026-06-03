/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
                display: ['Inter', 'sans-serif'],
            },
            colors: {
                scrapi: {
                    primary: '#2BC56B',
                    dark: '#1B1D1F',
                    gray: '#6B7280',
                    lightGray: '#F5F5F5',
                    border: '#E5E7EB',
                    text: '#374151',
                    heading: '#111827',
                },
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
            },
            fontSize: {
                'display': ['64px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
                'hero': ['56px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
            },
            boxShadow: {
                'card': '0 1px 3px rgba(0,0,0,0.08)',
                'card-hover': '0 4px 12px rgba(0,0,0,0.1)',
            },
        },
    },
    plugins: [],
}