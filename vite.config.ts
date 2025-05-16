import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from "vite-plugin-node-polyfills"; // Fix Buffer is not defined

export default defineConfig({
	plugins: [sveltekit(), tailwindcss(), nodePolyfills()],
	define: {
		'process.env': {
			ETHERSCAN_API_KEY: '',
		}
	}
});
