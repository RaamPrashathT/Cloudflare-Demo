import { resolve } from 'path';
import { defineNitroConfig } from 'nitropack/config';

export default defineNitroConfig({
  preset: 'cloudflare-durable',
  compatibilityDate: '2024-09-23',
  srcDir: 'server',
  experimental: {
    websocket: true
  },
  publicAssets: [
    {
      dir: resolve(__dirname, 'out'),
      baseURL: '/'
    }
  ]
});
