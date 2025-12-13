/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                apify: {
                    green: '#71c837',
                    dark: '#0a1b2e',
                    navy: '#122540',
                    light: '#f8f9fa',
                    blue: '#1a75ff'
                }
            }
        },
    },
    plugins: [],
}
