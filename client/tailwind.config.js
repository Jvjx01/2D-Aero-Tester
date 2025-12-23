/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'aero-bg': '#020617',
                'aero-panel': '#0f172a',
                'aero-blue': '#38bdf8',
                'aero-cyan': '#22d3ee',
                'aero-accent': '#f43f5e',
            }
        },
    },
    plugins: [],
}
