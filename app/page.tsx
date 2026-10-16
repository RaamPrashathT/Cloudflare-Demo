'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Stock {
  id?: number;
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  day_high: number;
  day_low: number;
  volume: number;
  category: string;
  updated_at?: string;
}

interface WsEventLog {
  time: string;
  type: string;
  symbols: string[];
}

export default function StockTrackerHome() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [updatedSymbols, setUpdatedSymbols] = useState<{ [symbol: string]: 'up' | 'down' }>({});
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [messageCount, setMessageCount] = useState(0);
  const [lastTickTime, setLastTickTime] = useState<string>('Waiting for first tick...');
  const [secondsUntilNextTick, setSecondsUntilNextTick] = useState(2);
  const [eventLogs, setEventLogs] = useState<WsEventLog[]>([]);
  const [manualTickLoading, setManualTickLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to Cloudflare Durable Object WebSocket server
  const connectWebSocket = () => {
    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = protocol + '//' + window.location.host + '/ws';

    setWsStatus('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMessageCount((prev) => prev + 1);
          setLastTickTime(new Date().toLocaleTimeString());
          setSecondsUntilNextTick(2);

          if (data.type === 'snapshot' && Array.isArray(data.stocks)) {
            setStocks(data.stocks);
            setEventLogs((prev) => [
              { time: new Date().toLocaleTimeString(), type: 'Initial Snapshot (10 Companies)', symbols: data.stocks.map((s: Stock) => s.symbol) },
              ...prev.slice(0, 15)
            ]);
          } else if (data.type === 'ticker_tick' && Array.isArray(data.stocks)) {
            // Determine price direction (up/down) for animation
            const flashes: { [sym: string]: 'up' | 'down' } = {};
            const symbolsUpdated = data.updatedSymbols || [];

            symbolsUpdated.forEach((sym: string) => {
              const oldStock = stocks.find((s) => s.symbol === sym);
              const newStock = data.stocks.find((s: Stock) => s.symbol === sym);
              if (oldStock && newStock) {
                flashes[sym] = newStock.price >= oldStock.price ? 'up' : 'down';
              } else {
                flashes[sym] = 'up';
              }
            });

            setUpdatedSymbols(flashes);
            setStocks(data.stocks);

            // Log event
            setEventLogs((prev) => [
              { time: new Date().toLocaleTimeString(), type: '2s Alarm Trigger -> D1 Update -> WS Broadcast', symbols: symbolsUpdated },
              ...prev.slice(0, 15)
            ]);

            // Clear flash animation after 1.5s
            setTimeout(() => {
              setUpdatedSymbols({});
            }, 1500);
          }
        } catch (err) {
          console.error('Failed to parse WS payload', err);
        }
      };

      ws.onclose = () => {
        setWsStatus('disconnected');
        // Auto-reconnect after 2.5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 2500);
      };

      ws.onerror = (err) => {
        console.warn('WebSocket error:', err);
        ws.close();
      };
    } catch (e) {
      setWsStatus('disconnected');
    }
  };

  useEffect(() => {
    // 1. Fetch initial HTTP fallback snapshot in case WS takes a moment
    fetch('/api/stocks')
      .then((r) => r.json())
      .then((data) => {
        if (data.stocks && stocks.length === 0) {
          setStocks(data.stocks);
        }
      })
      .catch(() => {});

    // 2. Establish persistent WebSocket connection to Durable Object
    connectWebSocket();

    // 3. Heartbeat countdown timer (2s loop)
    const countdownInterval = setInterval(() => {
      setSecondsUntilNextTick((prev) => (prev > 0.1 ? Number((prev - 0.2).toFixed(1)) : 2.0));
    }, 200);

    return () => {
      clearInterval(countdownInterval);
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  const handleManualTrigger = async () => {
    setManualTickLoading(true);
    try {
      await fetch('/api/tick', { method: 'POST' });
    } catch (e) {
      console.error(e);
    } finally {
      setManualTickLoading(false);
    }
  };

  const handleOpenSecondTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="header-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f8fafc' }}>
                Cloudflare Durable Objects WebSocket Stock Tracker
              </h1>
              <span className="badge badge-orange">Durable Objects + D1 SQLite</span>
              <span className="badge badge-purple">Every 2s Alarm Trigger</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: 14 }}>
              Demonstrating stateful WebSocket broadcasting from Cloudflare Durable Objects. A 2-second background alarm trigger updates stock prices in Cloudflare D1 SQLite and pushes real-time changes to all connected clients simultaneously.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={wsStatus === 'connected' ? 'badge badge-green' : 'badge badge-red'}>
              <span className={wsStatus === 'connected' ? 'pulse-dot' : ''}></span>
              {wsStatus === 'connected' ? 'WebSocket Connected' : wsStatus === 'connecting' ? 'Connecting to DO...' : 'Reconnecting...'}
            </span>
            <button onClick={handleOpenSecondTab} className="btn btn-secondary" style={{ fontSize: 13, padding: '6px 12px' }}>
              ? Open 2nd Client Tab (Sync Test)
            </button>
          </div>
        </div>

        {/* Diagnostic Meta Bar */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexWrap: 'wrap', gap: 24, fontSize: 13 }}>
          <div>
            <span style={{ color: '#64748b' }}>WebSocket Server: </span>
            <strong style={{ color: '#c084fc' }}>Cloudflare Durable Object</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Alarm Frequency: </span>
            <strong style={{ color: '#f38020' }}>Every 2.0s (DO setAlarm)</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Packets Received: </span>
            <strong style={{ color: '#38bdf8' }}>{messageCount} ticks</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Last Edge Tick: </span>
            <strong style={{ color: '#10b981' }}>{lastTickTime}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>D1 Database ID: </span>
            <code style={{ background: '#090a0f', padding: '2px 6px', borderRadius: 4, color: '#38bdf8' }}>
              55efcb6d-1bae-4f73-aa6d-6aa48abdb58f
            </code>
          </div>
        </div>
      </div>

      {/* Top 4 Featured Ticker Cards */}
      <div className="stock-grid">
        {stocks.slice(0, 4).map((stock) => {
          const flash = updatedSymbols[stock.symbol];
          return (
            <div
              key={stock.symbol}
              className={'stock-card ' + (flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : '')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>{stock.symbol}</span>
                <span className="badge badge-blue" style={{ fontSize: 11 }}>{stock.category}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 10 }}>{stock.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc' }}>
                  
                </div>
                <div className={stock.change >= 0 ? 'positive' : 'negative'} style={{ fontSize: 14 }}>
                  {stock.change >= 0 ? '? +' : '? '}
                  {Number(stock.change).toFixed(2)} ({Number(stock.change_percent).toFixed(2)}%)
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Stock Table */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>
              Live Market Feed (10 Seeded Companies)
            </h2>
            <p style={{ fontSize: 12, color: '#94a3b8' }}>
              All 10 companies seeded in D1 SQLite. When the 2s Durable Object alarm fires, SQLite is updated and broadcasted here.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleManualTrigger}
              disabled={manualTickLoading}
              className="btn btn-primary"
            >
              {manualTickLoading ? 'Fluctuating...' : '? Instant Price Fluctuation'}
            </button>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Company Name</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Price (USD)</th>
                <th style={{ textAlign: 'right' }}>Change ($)</th>
                <th style={{ textAlign: 'right' }}>Change (%)</th>
                <th style={{ textAlign: 'right' }}>Day High</th>
                <th style={{ textAlign: 'right' }}>Day Low</th>
                <th style={{ textAlign: 'right' }}>Volume</th>
              </tr>
            </thead>
            <tbody>
              {stocks.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    Connecting to Cloudflare Durable Object WebSocket...
                  </td>
                </tr>
              ) : (
                stocks.map((stock) => {
                  const flash = updatedSymbols[stock.symbol];
                  return (
                    <tr
                      key={stock.symbol}
                      className={flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : ''}
                    >
                      <td style={{ fontWeight: 700, color: '#f38020' }}>{stock.symbol}</td>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>{stock.name}</td>
                      <td>
                        <span className="badge badge-orange" style={{ fontSize: 11 }}>{stock.category}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 15, color: '#f8fafc' }}>
                        
                      </td>
                      <td style={{ textAlign: 'right' }} className={stock.change >= 0 ? 'positive' : 'negative'}>
                        {stock.change >= 0 ? '+' : ''}{Number(stock.change).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }} className={stock.change >= 0 ? 'positive' : 'negative'}>
                        {stock.change >= 0 ? '+' : ''}{Number(stock.change_percent).toFixed(2)}%
                      </td>
                      <td style={{ textAlign: 'right', color: '#94a3b8' }}></td>
                      <td style={{ textAlign: 'right', color: '#94a3b8' }}></td>
                      <td style={{ textAlign: 'right', color: '#94a3b8' }}>{Number(stock.volume).toLocaleString()}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-time WebSocket Event Log */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="pulse-dot-orange"></span>
          Live WebSocket Message Stream (Durable Object Broadcasts)
        </h3>
        <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
          Real-time stream of WebSocket packets pushed by the Cloudflare Durable Object every 2 seconds:
        </p>

        <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {eventLogs.length === 0 ? (
            <div style={{ fontSize: 13, color: '#64748b' }}>Awaiting initial broadcast from Durable Object...</div>
          ) : (
            eventLogs.map((log, idx) => (
              <div
                key={idx}
                style={{
                  background: '#090a10',
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderLeft: '3px solid #f38020'
                }}
              >
                <div>
                  <strong style={{ color: '#38bdf8' }}>[{log.time}]</strong>{' '}
                  <span style={{ color: '#e2e8f0' }}>{log.type}</span>
                </div>
                <div style={{ color: '#a1a1aa' }}>
                  Updated: <strong style={{ color: '#10b981' }}>{log.symbols.join(', ')}</strong>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Presentation Cheatsheet */}
      <div className="card" style={{ background: 'rgba(15, 17, 26, 0.95)' }}>
        <h3 style={{ fontSize: 16, marginBottom: 8, color: '#f38020' }}>
          ?? Presentation Cheatsheet (Durable Objects & D1 Seed)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <span style={{ fontSize: 12, color: '#a1a1aa' }}>1. Populate 10 Seeded Stocks in Cloudflare D1:</span>
            <div className="code-box">npx wrangler d1 execute demo --remote --file=./schema.sql</div>
          </div>
          <div>
            <span style={{ fontSize: 12, color: '#a1a1aa' }}>2. Build & Deploy to Cloudflare Workers (with Durable Objects):</span>
            <div className="code-box">npm run deploy</div>
          </div>
          <div>
            <span style={{ fontSize: 12, color: '#a1a1aa' }}>3. Verify Live D1 Updates in Terminal:</span>
            <div className="code-box">npx wrangler d1 execute demo --remote --command="SELECT symbol, price, change, updated_at FROM stocks LIMIT 5;"</div>
          </div>
        </div>
      </div>
    </div>
  );
}
