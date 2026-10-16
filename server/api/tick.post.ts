import { defineEventHandler } from 'h3';
import { getCachedStocks } from '../plugins/stock-tracker';

export default defineEventHandler(async (event) => {
  const cloudflare = (event.context as any)?.cloudflare || (event.node.req as any)?.runtime?.cloudflare;
  const db = cloudflare?.env?.DB;
  const stocks = getCachedStocks();

  // Pick a random stock to change
  const stock = stocks[Math.floor(Math.random() * stocks.length)];
  const delta = Number((Math.random() * 4 - 2).toFixed(2));
  stock.price = Math.max(1, Number((stock.price + delta).toFixed(2)));
  stock.change = Number((stock.change + delta).toFixed(2));
  stock.change_percent = Number(((stock.change / (stock.price - stock.change)) * 100).toFixed(2));
  stock.day_high = Math.max(stock.day_high, stock.price);
  stock.day_low = Math.min(stock.day_low, stock.price);
  stock.volume += Math.floor(Math.random() * 10000 + 1000);

  if (db) {
    try {
      await db.prepare(
        'UPDATE stocks SET price = ?, change = ?, change_percent = ?, day_high = ?, day_low = ?, volume = ?, updated_at = CURRENT_TIMESTAMP WHERE symbol = ?'
      ).bind(stock.price, stock.change, stock.change_percent, stock.day_high, stock.day_low, stock.volume, stock.symbol).run();
    } catch (e) {
      // ignore
    }
  }

  return {
    success: true,
    message: 'Manual price tick triggered',
    updatedSymbol: stock.symbol,
    newPrice: stock.price,
    stocks
  };
});
