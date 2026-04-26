export default {
    darkMode: ['class'],
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: '#f3faff',
                foreground: '#071e27',
                primary: {
                    DEFAULT: '#a43700',
                    foreground: '#ffffff',
                    container: '#cd4700',
                },
                secondary: {
                    DEFAULT: '#546067',
                    foreground: '#ffffff',
                },
                muted: {
                    DEFAULT: '#e6f6ff',
                    foreground: '#546067',
                },
                accent: {
                    DEFAULT: '#cfe6f2',
                    foreground: '#071e27',
                },
                destructive: {
                    DEFAULT: '#ba1a1a',
                    foreground: '#ffffff',
                },
                card: {
                    DEFAULT: '#ffffff',
                    foreground: '#071e27',
                },
                "outline-variant": "#e3bfb2",
                "on-background": "#071e27",
                "primary-container": "#cd4700",
                "on-primary-container": "#fffbff",
                "surface-dim": "#c7dde9",
                "on-surface": "#071e27",
                "surface-container-lowest": "#ffffff",
                "surface-variant": "#cfe6f2",
                "on-surface-variant": "#5a4138",
                "surface-bright": "#f3faff",
                "surface-tint": "#a83900",
                "tertiary": "#005bb3",
                "surface": "#f3faff",
                "outline": "#8f7066",
                "surface-container": "#dbf1fe",
                "on-primary": "#ffffff",
                "surface-container-high": "#d5ecf8",
                "surface-container-low": "#e6f6ff",
                "surface-container-highest": "#cfe6f2"
            },
            fontFamily: {
                headline: ["Work Sans", "sans-serif"],
                body: ["Manrope", "sans-serif"],
                label: ["Manrope", "sans-serif"]
            },
            borderRadius: {
                lg: '0.25rem',
                md: '0.125rem',
                sm: '0.125rem',
                xl: '0.5rem',
                full: '0.75rem',
            },
            keyframes: {
                'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
                'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
                'fade-in': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-in': 'fade-in 0.3s ease-out',
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
};
