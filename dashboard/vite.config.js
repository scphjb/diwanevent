import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'offline.html', '*.png'],
      manifest: false, // نستخدم manifest.json الخارجي في /public
      workbox: {
        // صفحة Offline المخصصة
        offlineGoogleAnalytics: false,
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api/, /^\/ws/],
        // Cache الملفات الثابتة (JS, CSS, Images)
        runtimeCaching: [
          {
            // API calls — Network First
            urlPattern: /^https?.*\/api\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'diwan-api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // صور المشاركين والرعاة — Cache First
            urlPattern: /^https?.*\.(png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'diwan-images-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          {
            // Google Fonts — Cache First
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'diwan-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
          {
            // Locales / Translations — Stale While Revalidate
            urlPattern: /\/locales\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'diwan-locales-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 },
            },
          },
        ],
        // Pre-cache الصفحات الأساسية
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false, // لا نفعّله في وضع التطوير لتجنب التعقيد
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // تقسيم الـ bundle لتحسين الأداء
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react'],
          'vendor-charts': ['recharts'],
          'vendor-i18n': ['react-i18next', 'i18next'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
