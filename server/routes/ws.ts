import { defineWebSocketHandler } from 'h3';
import { getCachedStocks } from '../plugins/stock-tracker';

export default defineWebSocketHandler({
  async open(peer) {
    // 1. Subscribe this client to the 'stocks' broadcast channel
    peer.subscribe('stocks');

    // 2. Access Cloudflare D1 to send the freshest snapshot
    let stocks = getCachedStocks();
    const cloudflare = (peer.ctx as any)?.cloudflare || (globalThis as any).__env__;
    const db = cloudflare?.DB;

    if (db) {
      try {
        const { results } = await db.prepare('SELECT * FROM stocks ORDER BY id ASC').all();
        if (results && results.length > 0) {
          stocks = results as any;
        }
      } catch (e) {
        // Fallback to in-memory cached stocks
      }
    }

    // 3. Immediately send snapshot to this newly connected client
    peer.send(JSON.stringify({
      type: 'snapshot',
      clientCount: 'Connected to Cloudflare Durable Object',
      timestamp: new Date().toISOString(),
      stocks
    }));
  },

  message(peer, message) {
    const text = message.text();
    if (text === 'ping') {
      peer.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
    }
  },

  close(peer) {
    peer.unsubscribe('stocks');
  }
});
