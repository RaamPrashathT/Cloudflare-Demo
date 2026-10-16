# Cloudflare Durable Objects WebSocket Stock Tracker (Next.js + Nitro + D1)

A real-time financial stock tracker demonstrating that **Cloudflare Durable Objects** can be utilized as a stateful **WebSocket broadcasting server**, coupled with a **2-second background alarm trigger** that updates a **Cloudflare D1 SQLite database** and broadcasts price fluctuations to all connected clients simultaneously.

---

## ? Architecture Flow

```text
+------------------------------------------------------------------------+
¦                        Cloudflare Global Edge                          ¦
¦                                                                        ¦
¦  +-------------------------+        +-------------------------------+  ¦
¦  ¦ Next.js Frontend        ¦        ¦ Durable Object                ¦  ¦
¦  ¦ Client 1, Client 2, ... ¦        ¦ ($DurableObject)              ¦  ¦
¦  +-------------------------+        +-------------------------------+  ¦
¦              ¦                                     ¦                   ¦
¦              ¦ 1. ws(s)://.../ws (WebSocket)       ¦                   ¦
¦              +------------------------------------?¦                   ¦
¦              ¦                                     ¦                   ¦
¦              ¦                                     ¦ 2. Background     ¦
¦              ¦                                     ¦    Alarm (Every 2s¦
¦              ¦                                     ¦                   ¦
¦              ¦                                     ?                   ¦
¦              ¦                           +-------------------+         ¦
¦              ¦                           ¦ Cloudflare D1     ¦         ¦
¦              ¦                           ¦ SQLite Database   ¦         ¦
¦              ¦                           ¦ (stocks table)    ¦         ¦
¦              ¦                           +-------------------+         ¦
¦              ¦                                     ¦                   ¦
¦              ¦ 3. Real-time WebSocket Broadcast    ¦ 2b. Price updated ¦
¦              ¦    { symbol, price, change }        ?     in SQLite     ¦
¦              ¦?------------------------------------¦                   ¦
+------------------------------------------------------------------------+
```

1. **Client Connection**: When clients open the dashboard, they establish a persistent WebSocket connection to `/ws`.
2. **2-Second Alarm Trigger**: The Durable Object Alarms API (`ctx.storage.setAlarm(Date.now() + 2000)`) fires every 2 seconds on Cloudflare's edge.
3. **Database Mutation**: In each alarm cycle, the Durable Object selects individual companies from the 10 seeded stocks and updates the SQLite record in Cloudflare D1 (`UPDATE stocks SET price = ?, change = ...`).
4. **WebSocket Broadcast**: The Durable Object broadcasts the updated stock data to all active WebSocket clients. Every connected tab receives the update instantly and flashes green (price up) or red (price down).

---

## ?? Database Configuration

The project targets your specific Cloudflare D1 database:
- **Database Name**: `demo`
- **Database UUID**: `55efcb6d-1bae-4f73-aa6d-6aa48abdb58f`
- **Binding Name**: `DB` (configured in `wrangler.toml`)
- **Durable Object Binding**: `$DurableObject`

---

## ?? 10 Seeded Companies

The database schema (`schema.sql`) seeds 10 prominent tech & cloud companies:

| Symbol | Company Name | Sector | Base Price |
|---|---|---|---|
| **NET** | Cloudflare Inc. | Cloud & Edge | \$92.40 |
| **AAPL** | Apple Inc. | Consumer Tech | \$232.15 |
| **GOOGL** | Alphabet Inc. | Search & AI | \$186.50 |
| **MSFT** | Microsoft Corp. | Cloud & Enterprise | \$428.30 |
| **NVDA** | NVIDIA Corp. | Semiconductors | \$138.25 |
| **AMZN** | Amazon.com Inc. | E-Commerce & Cloud | \$194.80 |
| **META** | Meta Platforms | Social & VR | \$585.60 |
| **TSLA** | Tesla Inc. | Automotive & Energy | \$220.45 |
| **NFLX** | Netflix Inc. | Streaming Media | \$715.10 |
| **AMD** | Advanced Micro Devices | Semiconductors | \$156.90 |

---

## ?? Live Demo Presentation Steps

### Step 1: Seed the 10 Stocks into Cloudflare D1
Execute the SQL schema to create the `stocks` table and populate the 10 companies:

```bash
# Seed the remote Cloudflare D1 database:
npx wrangler d1 execute demo --remote --file=./schema.sql
```

*(Optional: check the records directly from the CLI)*
```bash
npx wrangler d1 execute demo --remote --command="SELECT symbol, name, price, change FROM stocks LIMIT 5;"
```

---

### Step 2: Build the Application
Compile the Next.js static export and package the Nitro Cloudflare Durable Object Worker:

```bash
npm run build
```

---

### Step 3: (Optional) Local Preview
Test the WebSocket server and Miniflare local emulation:

```bash
npm run preview
```
Visit `http://localhost:8787` to see the live WebSocket ticker locally.

---

### Step 4: Deploy Live to Cloudflare Workers
Deploy the application with Durable Object support:

```bash
npx wrangler deploy
```

> [!NOTE]
> Durable Objects require a Cloudflare Workers Paid plan for production deployment. In local development / preview (`npm run preview`), Durable Objects run completely free via Miniflare emulation.

---

### Step 5: Multi-Tab Synchronization Demo
1. Open the deployed application URL in two side-by-side browser windows (or click the **"? Open 2nd Client Tab (Sync Test)"** button in the dashboard).
2. Watch as both tabs receive the **exact same price fluctuations simultaneously every 2 seconds**.
3. Point out the **flashing green/red price highlights** and the real-time packet log streaming from the Durable Object.
4. Click **"? Instant Price Fluctuation"** to show on-demand D1 mutation and instant WebSocket delivery across all tabs.

---

## ?? Project Structure

```text
+-- app/
¦   +-- globals.css          # Ticker styling & keyframe flash animations
¦   +-- layout.tsx           # Next.js layout metadata
¦   +-- page.tsx             # Real-time WebSocket stock ticker dashboard
+-- server/
¦   +-- plugins/
¦   ¦   +-- stock-tracker.ts # 2-second DO Alarm hook, D1 SQLite updater & broadcast
¦   +-- routes/
¦   ¦   +-- ws.ts            # WebSocket connection handler (subscribes clients)
¦   +-- api/
¦       +-- health.get.ts    # Edge health diagnostic
¦       +-- stocks.get.ts    # HTTP stock snapshot endpoint
¦       +-- tick.post.ts     # Manual price trigger endpoint
+-- schema.sql               # SQLite stocks schema & 10 seed records
+-- migrations/
¦   +-- 0001_init.sql        # Migration copy of schema.sql
+-- next.config.mjs          # Next.js configuration (static export)
+-- nitro.config.ts          # Nitro config (preset: cloudflare-durable, websockets: true)
+-- wrangler.toml            # Cloudflare Worker, Durable Objects & D1 bindings
+-- package.json             # Build and deployment scripts
```
