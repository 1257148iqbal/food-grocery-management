/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./views/**/*.{handlebars,html,js}'],
	mode: 'jit',
	purge: ['./views/**/*.handlebars', './views/**/*.{js,jsx,ts,tsx,vue}'],
	theme: {
		extend: {},
	},
	plugins: [],
};
