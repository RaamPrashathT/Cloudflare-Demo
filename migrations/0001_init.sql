-- Cloudflare D1 Demo Database Schema - Real-Time Stock Tracker
-- Database Name: demo
-- Database UUID: 55efcb6d-1bae-4f73-aa6d-6aa48abdb58f

DROP TABLE IF EXISTS stocks;

CREATE TABLE IF NOT EXISTS stocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  change REAL NOT NULL DEFAULT 0.0,
  change_percent REAL NOT NULL DEFAULT 0.0,
  day_high REAL NOT NULL,
  day_low REAL NOT NULL,
  volume INTEGER NOT NULL DEFAULT 1000000,
  category TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data: 10 Companies for Real-Time WebSocket Demonstration
INSERT INTO stocks (symbol, name, price, change, change_percent, day_high, day_low, volume, category) VALUES
  ('NET', 'Cloudflare Inc.', 92.40, 1.25, 1.37, 94.10, 90.80, 4210000, 'Cloud & Edge'),
  ('AAPL', 'Apple Inc.', 232.15, -0.85, -0.36, 234.50, 230.90, 48200000, 'Consumer Tech'),
  ('GOOGL', 'Alphabet Inc.', 186.50, 2.10, 1.14, 187.80, 184.20, 21500000, 'Search & AI'),
  ('MSFT', 'Microsoft Corp.', 428.30, -1.40, -0.33, 431.20, 426.50, 18900000, 'Cloud & Enterprise'),
  ('NVDA', 'NVIDIA Corp.', 138.25, 4.30, 3.21, 140.10, 134.80, 68400000, 'Semiconductors'),
  ('AMZN', 'Amazon.com Inc.', 194.80, 1.15, 0.59, 196.20, 193.10, 29100000, 'E-Commerce & Cloud'),
  ('META', 'Meta Platforms', 585.60, 3.80, 0.65, 589.40, 581.00, 12700000, 'Social & VR'),
  ('TSLA', 'Tesla Inc.', 220.45, -3.20, -1.43, 225.80, 218.10, 55200000, 'Automotive & Energy'),
  ('NFLX', 'Netflix Inc.', 715.10, 5.40, 0.76, 720.00, 708.50, 5800000, 'Streaming Media'),
  ('AMD', 'Advanced Micro Devices', 156.90, -0.75, -0.48, 159.20, 155.10, 31400000, 'Semiconductors');
