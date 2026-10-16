import { defineNitroPlugin } from 'nitropack/runtime';

// Fallback initial stock data for safety and simulation
const INITIAL_STOCKS = [
  { symbol: 'NET', name: 'Cloudflare Inc.', price: 92.40, change: 1.25, change_percent: 1.37, day_high: 94.10, day_low: 90.80, volume: 4210000, category: 'Cloud & Edge' },
  { symbol: 'AAPL', name: 'Apple Inc.', price: 232.15, change: -0.85, change_percent: -0.36, day_high: 234.50, day_low: 230.90, volume: 48200000, category: 'Consumer Tech' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 186.50, change: 2.10, change_percent: 1.14, day_high: 187.80, day_low: 184.20, volume: 21500000, category: 'Search & AI' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 428.30, change: -1.40, change_percent: -0.33, day_high: 431.20, day_low: 426.50, volume: 18900000, category: 'Cloud & Enterprise' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 138.25, change: 4.30, change_percent: 3.21, day_high: 140.10, day_low: 134.80, volume: 68400000, category: 'Semiconductors' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 194.80, change: 1.15, change_percent: 0.59, day_high: 196.20, day_low: 193.10, volume: 29100000, category: 'E-Commerce & Cloud' },
  { symbol: 'META', name: 'Meta Platforms', price: 585.60, change: 3.80, change_percent: 0.65, day_high: 589.40, day_low: 581.00, volume: 12700000, category: 'Social & VR' },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 220.45, change: -3.20, change_percent: -1.43, day_high: 225.80, day_low: 218.10, volume: 55200000, category: 'Automotive & Energy' },
  { symbol: 'NFLX', name: 'Netflix Inc.', price: 715.10, change: 5.40, change_percent: 0.76, day_high: 720.00, day_low: 708.50, volume: 5800000, category: 'Streaming Media' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', price: 156.90, change: -0.75, change_percent: -0.48, day_high: 159.20, day_low: 155.10, volume: 31400000, category: 'Semiconductors' }
];

// In-memory cache held by the Durable Object instance
let inMemoryStocks = [...INITIAL_STOCKS];

export default defineNitroPlugin((nitroApp) => {
  // 1. Initialize Durable Object: Set up the 2-second background alarm trigger
  nitroApp.hooks.hook('cloudflare:durable:init', async (durable: any, { state, env }: any) => {
    try {
      const existingAlarm = await state.storage.getAlarm();
      if (!existingAlarm) {
        // Schedule first alarm in 2 seconds
        await state.storage.setAlarm(Date.now() + 2000);
      }
    } catch (err) {
      console.error('[DO Init Error]', err);
    }
  });

  // 2. Alarm Trigger: Runs every 2 seconds in the background on Cloudflare Edge
  nitroApp.hooks.hook('cloudflare:durable:alarm', async (durable: any) => {
    try {
      const db = durable.env?.DB;

      // Select 1 to 2 random stocks to fluctuate this tick
      const countToUpdate = Math.random() > 0.5 ? 2 : 1;
      const updatedSymbols: string[] = [];

      for (let i = 0; i < countToUpdate; i++) {
        const randomIndex = Math.floor(Math.random() * inMemoryStocks.length);
        const stock = inMemoryStocks[randomIndex];

        // Random fluctuation between -1.8% and +1.8%
        const deltaPercent = (Math.random() * 3.6 - 1.8);
        const priceDelta = Number((stock.price * (deltaPercent / 100)).toFixed(2));
        const newPrice = Math.max(1, Number((stock.price + priceDelta).toFixed(2)));
        const newChange = Number((stock.change + priceDelta).toFixed(2));
        const newChangePercent = Number(((newChange / (newPrice - newChange)) * 100).toFixed(2));
        const newHigh = Math.max(stock.day_high, newPrice);
        const newLow = Math.min(stock.day_low, newPrice);

        // Update in-memory state
        stock.price = newPrice;
        stock.change = newChange;
        stock.change_percent = newChangePercent;
        stock.day_high = newHigh;
        stock.day_low = newLow;
        stock.volume += Math.floor(Math.random() * 5000 + 500);

        updatedSymbols.push(stock.symbol);

        // Update Cloudflare D1 SQLite database if bound
        if (db) {
          try {
            await db.prepare(
              'UPDATE stocks SET price = ?, change = ?, change_percent = ?, day_high = ?, day_low = ?, volume = ?, updated_at = CURRENT_TIMESTAMP WHERE symbol = ?'
            ).bind(newPrice, newChange, newChangePercent, newHigh, newLow, stock.volume, stock.symbol).run();
          } catch (dbErr) {
            console.warn('[D1 Update Warning - verify schema seeded]:', dbErr);
          }
        }
      }

      // If D1 is connected, synchronize state from D1
      let currentStocks = inMemoryStocks;
      if (db) {
        try {
          const { results } = await db.prepare('SELECT * FROM stocks ORDER BY id ASC').all();
          if (results && results.length > 0) {
            currentStocks = results as any;
            inMemoryStocks = results as any;
          }
        } catch (e) {
          // Use inMemoryStocks fallback
        }
      }

      // 3. Broadcast changed data over WebSockets to ALL connected clients
      const payload = JSON.stringify({
        type: 'ticker_tick',
        timestamp: new Date().toISOString(),
        updatedSymbols,
        trigger: '2-Second Durable Object Alarm',
        stocks: currentStocks
      });

      durable.publish('stocks', payload);
    } catch (alarmErr) {
      console.error('[DO Alarm Error]', alarmErr);
    } finally {
      // 4. Always re-arm the alarm for 2 seconds (2000ms) later
      try {
        await durable.ctx.storage.setAlarm(Date.now() + 2000);
      } catch (scheduleErr) {
        console.error('[Alarm Re-arm Error]', scheduleErr);
      }
    }
  });
});

export function getCachedStocks() {
  return inMemoryStocks;
}
