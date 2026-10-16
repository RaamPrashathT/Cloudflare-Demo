import { defineNitroConfig } from 'nitropack/config';

export default defineNitroConfig({
  preset: 'cloudflare-durable',
  compatibilityDate: '2024-09-23',
  experimental: {
    websocket: true
  },
  publicAssets: [
    {
      dir: 'out',
      baseURL: '/'
    }
  ]
});
