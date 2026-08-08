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
                    DEFAULT: '#0053a1',
                    foreground: '#ffffff',
                    container: '#1a6bc5',
                },
                secondary: {
                    DEFAULT: '#4a6a82',
                    foreground: '#ffffff',
                },
                muted: {
                    DEFAULT: '#e8f2fc',
                    foreground: '#4a6a82',
                },
                accent: {
                    DEFAULT: '#c8ddf0',
                    foreground: '#071627',
                },
                destructive: {
                    DEFAULT: '#d8002b',
                    foreground: '#ffffff',
                },
                card: {
                    DEFAULT: '#ffffff',
                    foreground: '#071627',
                },
                "outline-variant": "#bdd4ea",
                "on-background": "#071627",
                "primary-container": "#1a6bc5",
                "on-primary-container": "#ffffff",
                "surface-dim": "#c2d8ee",
                "on-surface": "#071627",
                "surface-container-lowest": "#ffffff",
                "surface-variant": "#c8ddf0",
                "on-surface-variant": "#1c3a5a",
                "surface-bright": "#f4f8ff",
                "surface-tint": "#0053a1",
                "tertiary": "#d8002b",
                "surface": "#f4f8ff",
                "outline": "#4a6a82",
                "surface-container": "#daeaf8",
                "on-primary": "#ffffff",
                "surface-container-high": "#d0e4f5",
                "surface-container-low": "#e4f0fb",
                "surface-container-highest": "#c8ddf0"
            },
            fontFamily: {
                headline: ["Exo 2", "sans-serif"],
                body: ["Inter", "sans-serif"],
                label: ["Inter", "sans-serif"]
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
                'step-forward': { '0%': { opacity: '0', transform: 'translateX(24px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
                'step-backward': { '0%': { opacity: '0', transform: 'translateX(-24px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
                'shake': { '0%, 100%': { transform: 'translateX(0)' }, '20%, 60%': { transform: 'translateX(-4px)' }, '40%, 80%': { transform: 'translateX(4px)' } },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-in': 'fade-in 0.3s ease-out',
                'step-forward': 'step-forward 0.25s ease-out',
                'step-backward': 'step-backward 0.25s ease-out',
                'shake': 'shake 0.4s ease-in-out',
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
};
