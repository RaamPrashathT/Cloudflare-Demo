import { defineEventHandler } from 'h3';

export default defineEventHandler(async (event) => {
  const cloudflare = (event.context as any)?.cloudflare || (event.node.req as any)?.runtime?.cloudflare;
  const cf = cloudflare?.cf;
  const hasDB = Boolean(cloudflare?.env?.DB);

  return {
    status: 'online',
    runtime: 'Cloudflare Workers (V8 Isolate)',
    engine: 'Nitro + Next.js',
    databaseBinding: hasDB ? 'CONNECTED' : 'LOCAL_MOCK',
    databaseId: '55efcb6d-1bae-4f73-aa6d-6aa48abdb58f',
    edgeLocation: cf ? {
      colo: cf.colo,
      country: cf.country,
      city: cf.city,
      timezone: cf.timezone
    } : 'Local Development',
    timestamp: new Date().toISOString()
  };
});
