import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Real-Time Stock Tracker - Cloudflare Durable Objects WebSocket',
  description: 'Live real-time stock tracker using Cloudflare Durable Objects WebSocket server and D1 SQLite 2-second background alarms',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
