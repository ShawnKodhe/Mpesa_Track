import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		fontFamily: {
  			heading: ['var(--font-heading)'],
  			body: ['var(--font-body)']
  		},
  		boxShadow: {
  			card: 'var(--shadow-card)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			buffer: 'hsl(var(--status-buffer) / <alpha-value>)',
  			debt: 'hsl(var(--status-debt) / <alpha-value>)',
  			invest: 'hsl(var(--status-invest) / <alpha-value>)',
  			inflow: 'hsl(var(--status-inflow) / <alpha-value>)',
  			alert: 'hsl(var(--status-alert) / <alpha-value>)',
  			money: {
  				in: 'hsl(var(--money-in) / <alpha-value>)',
  				out: 'hsl(var(--money-out) / <alpha-value>)',
  				moved: 'hsl(var(--money-moved) / <alpha-value>)'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			},
  			'aurora-a': {
  				'0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
  				'50%': { transform: 'translate3d(60px, 40px, 0) scale(1.12)' }
  			},
  			'aurora-b': {
  				'0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1.06)' },
  				'50%': { transform: 'translate3d(-50px, 50px, 0) scale(1)' }
  			},
  			'aurora-c': {
  				'0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
  				'50%': { transform: 'translate3d(40px, 60px, 0) scale(1.1)' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'aurora-a': 'aurora-a 38s ease-in-out infinite',
  			'aurora-b': 'aurora-b 52s ease-in-out infinite',
  			'aurora-c': 'aurora-c 45s ease-in-out infinite'
  		}
  	}
  },
  plugins: [tailwindcssAnimate],
}
