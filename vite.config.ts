import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { buildCommentPrompt, fallbackComment, type CommentPayload } from './src/lib/commentPrompt';

const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

// Dev-only POST /api/comment — calls Gemini server-side so the API key never
// reaches the browser. Falls back to a templated line when no key is set.
// In production this lives in supabase/functions/comment (see README).
function commentApi(env: Record<string, string>): Plugin {
  return {
    name: 'startwin-comment-api',
    configureServer(server) {
      server.config.server.host = true;
      server.config.server.allowedHosts = true;
      server.middlewares.use('/api/comment', async (req: IncomingMessage, res: ServerResponse) => {
        res.setHeader('Content-Type', 'application/json');
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end(JSON.stringify({ error: 'method not allowed' }));
        }
        let payload: CommentPayload;
        try {
          payload = JSON.parse(await readBody(req));
        } catch {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'invalid json' }));
        }

        const key = env.GEMINI_API_KEY;
        const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
        if (!key) return res.end(JSON.stringify({ comment: fallbackComment(payload), source: 'fallback' }));

        try {
          const { system, user } = buildCommentPrompt(payload);
          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: [{ parts: [{ text: user }] }],
              generationConfig: { maxOutputTokens: 256, temperature: 1, thinkingConfig: { thinkingBudget: 0 } },
            }),
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data: any = await r.json();
          if (!r.ok) throw new Error(data?.error?.message ?? `HTTP ${r.status}`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const text: string = (data?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('').trim();
          return res.end(JSON.stringify({ comment: text || fallbackComment(payload), source: text ? 'gemini' : 'fallback', model }));
        } catch (e) {
          return res.end(JSON.stringify({ comment: fallbackComment(payload), source: 'fallback', error: String((e as Error)?.message ?? e) }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return { 
    server: {
      host: true,
      allowedHosts: true,
    },
    plugins: [
      react(), 
      commentApi(env),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          importScripts: ['/push-worker.js'],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}']
        },
        manifest: {
          name: 'StarTwin',
          short_name: 'StarTwin',
          description: 'Kozmik uyumunu keşfet ve yakındaki ruh eşlerini bul!',
          theme_color: '#06060f',
          background_color: '#06060f',
          display: 'standalone',
          icons: [
            {
              src: 'icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ] 
  };
});
