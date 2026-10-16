import { defineEventHandler } from 'h3';
import { getCachedStocks } from '../plugins/stock-tracker';

export default defineEventHandler(async (event) => {
  const cloudflare = (event.context as any)?.cloudflare || (event.node.req as any)?.runtime?.cloudflare;
  const db = cloudflare?.env?.DB;

  if (db) {
    try {
      const { results } = await db.prepare('SELECT * FROM stocks ORDER BY id ASC').all();
      if (results && results.length > 0) {
        return {
          success: true,
          source: 'Cloudflare D1 (SQLite Edge)',
          databaseId: '55efcb6d-1bae-4f73-aa6d-6aa48abdb58f',
          count: results.length,
          stocks: results
        };
      }
    } catch (err: any) {
      console.warn('[D1 Query Warning]:', err.message);
    }
  }

  const cached = getCachedStocks();
  return {
    success: true,
    source: 'Durable Object In-Memory Cache',
    databaseId: '55efcb6d-1bae-4f73-aa6d-6aa48abdb58f',
    count: cached.length,
    stocks: cached
  };
});
