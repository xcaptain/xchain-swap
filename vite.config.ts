import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { cjsInterop } from "vite-plugin-cjs-interop";

export default defineConfig({
	plugins: [sveltekit(), tailwindcss(), nodePolyfills(), cjsInterop({
		dependencies: [
			'safe-buffer',
			'buffer',
			'coininfo',
		],
	})],
	define: {
		'process.env': {
			ETHERSCAN_API_KEY: '', // because this is hardcoded in xchainlib
		},
		'process.version': JSON.stringify('v23.10.0'),
	},
});
