import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { createRequire } from 'module';
import type { Plugin } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

/**
 * Dev-only plugin: handles /api/get-agora-token locally so `pnpm dev` works
 * without needing `vercel dev`. Receives env vars explicitly from defineConfig
 * since Vite only auto-loads VITE_* vars into process.env.
 */
function agoraTokenDevPlugin(appId: string, appCertificate: string): Plugin {
  return {
    name: 'agora-token-dev',
    configureServer(server) {
      server.middlewares.use('/api/get-agora-token', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        if (!appId || !appCertificate) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing AGORA_APP_ID or AGORA_APP_CERTIFICATE in .env' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const { roomCode, uid } = JSON.parse(body) as { roomCode: string; uid: number };
            // CJS module loaded via createRequire — works in ESM vite.config.ts
            const _require = createRequire(import.meta.url);
            const { RtcTokenBuilder, RtcRole } = _require('agora-token') as {
              RtcTokenBuilder: any;
              RtcRole: { PUBLISHER: number };
            };
            const expiry = Math.floor(Date.now() / 1000) + 86400;
            const token = RtcTokenBuilder.buildTokenWithUid(
              appId, appCertificate, roomCode, uid, RtcRole.PUBLISHER, expiry, expiry
            );
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ token, appId }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Token generation failed' }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // loadEnv with '' prefix loads ALL vars — including non-VITE_ ones like AGORA_APP_CERTIFICATE
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      basicSsl(),
      agoraTokenDevPlugin(env.AGORA_APP_ID, env.AGORA_APP_CERTIFICATE),
      VitePWA({
        injectRegister: 'inline',
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Family Rummy',
          short_name: 'Rummy',
          description: 'Multiplayer Family Rummy Card Game',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'any',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'favicon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MB — needed for Agora SDK
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
      port: 5173,
    },
  };
});
