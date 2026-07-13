import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/cut-sheets/' : '/',
  preview: {
    host: true,           // listen on 0.0.0.0 inside the container
    allowedHosts: true,   // accept requests from any domain (platform proxies)
  },
});
