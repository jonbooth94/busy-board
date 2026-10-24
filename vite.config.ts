import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// APP_VERSION is set by CI (git commit) so every deploy is a distinct version.
const version = process.env.APP_VERSION ?? pkg.version;

export default defineConfig({
  base: '/busy-board/',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  build: {
    // Keep every animal SVG as its own file: one broken animal can't break the others.
    assetsInlineLimit: 0,
  },
  plugins: [
    VitePWA({
      registerType: 'prompt', // we decide when to activate updates (see src/pwa.ts)
      injectRegister: false,
      manifest: {
        id: '/busy-board/',
        name: 'Busy Board',
        short_name: 'Busy Board',
        description: 'A digital busy board and coloring app for toddlers. Works offline.',
        start_url: '/busy-board/',
        scope: '/busy-board/',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#c98f55',
        theme_color: '#a8723f',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache everything at install, including every animal SVG, so the whole app works
        // offline. (Sounds are generated in code; audio files are only optional animal sounds.)
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,mp3,ogg,wav,m4a}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
      },
    }),
  ],
});
