/** @type {import('tailwindcss').Config} */
export default {
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
                apify: {
                    primary: '#2BC56B',
                    dark: '#1B1D1F',
                    gray: '#6B7280',
                    lightGray: '#F5F5F5',
                    border: '#E5E7EB',
                    text: '#374151',
                    heading: '#111827',
                }
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