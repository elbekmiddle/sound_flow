/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:                    '#c799ff',
        'primary-container':        '#bc87fe',
        'primary-fixed':            '#bc87fe',
        'on-primary':               '#440080',
        'on-primary-container':     '#340064',
        secondary:                  '#4af8e3',
        'on-secondary':             '#005b51',
        tertiary:                   '#ff94a4',
        'on-tertiary':              '#680826',
        error:                      '#ff6e84',
        background:                 '#0e0e0e',
        surface:                    '#0e0e0e',
        'surface-dim':              '#0e0e0e',
        'surface-bright':           '#2c2c2c',
        'surface-container-lowest': '#000000',
        'surface-container-low':    '#131313',
        'surface-container':        '#1a1919',
        'surface-container-high':   '#201f1f',
        'surface-container-highest':'#262626',
        'on-surface':               '#ffffff',
        'on-surface-variant':       '#adaaaa',
        outline:                    '#777575',
        'outline-variant':          '#484847',
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body:     ['Inter', 'sans-serif'],
        label:    ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        md:      '0.75rem',
        lg:      '1rem',
        xl:      '1.25rem',
        '2xl':   '1.5rem',
        full:    '9999px',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        'bar-eq': {
          '0%,100%': { scaleY: '0.4' },
          '50%':     { scaleY: '1' },
        },
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-glow': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(199,153,255,0)' },
          '50%':     { boxShadow: '0 0 24px 4px rgba(199,153,255,0.15)' },
        },
      },
      animation: {
        shimmer:     'shimmer 1.5s infinite',
        'bar-eq-1':  'bar-eq 0.8s ease-in-out infinite 0s',
        'bar-eq-2':  'bar-eq 0.8s ease-in-out infinite 0.15s',
        'bar-eq-3':  'bar-eq 0.8s ease-in-out infinite 0.3s',
        'slide-up':  'slide-up 0.45s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in':   'fade-in 0.35s ease forwards',
        'scale-in':  'scale-in 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
        'pulse-glow':'pulse-glow 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
