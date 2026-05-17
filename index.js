/**
 * Discord Gateway Forwarder
 * Nhận MESSAGE_CREATE từ Discord → Forward sang Cloudflare Worker
 *
 * Deploy: Render.com (Free tier)
 */

import { Client, GatewayIntentBits, Events } from 'discord.js';
import { createServer } from 'http';

// ── Config từ environment variables ──────────────────────────────
const DISCORD_TOKEN    = process.env.DISCORD_TOKEN;
const WORKER_URL       = process.env.WORKER_URL;       // https://discord-translate-bot.xxx.workers.dev
const WORKER_SECRET    = process.env.WORKER_SECRET;    // Secret key để verify request
const PORT             = process.env.PORT || 3000;

// ── Validate config ───────────────────────────────────────────────
if (!DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN is required');
  process.exit(1);
}
if (!WORKER_URL) {
  console.error('❌ WORKER_URL is required');
  process.exit(1);
}

// ── Stats ────────────────────────────────────────────────────────
const stats = {
  forwarded: 0,
  failed: 0,
  skipped: 0,
  startTime: Date.now(),
};

// ── Discord Client ────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Bắt buộc bật trong Developer Portal
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Gateway connected: ${c.user.tag}`);
  console.log(`📡 Forwarding to: ${WORKER_URL}`);
});

client.on(Events.MessageCreate, async (message) => {
  // ── Ignore bots & webhooks ─────────────────────────────────────
  if (message.author.bot) return;
  if (message.webhookId) return;

  // ── Ignore tin nhắn quá ngắn ──────────────────────────────────
  const content = message.content?.trim();
  if (!content || content.length < 3) return;

  // ── Forward sang Worker ────────────────────────────────────────
  try {
    const payload = {
      id:         message.id,
      content:    content,
      channel_id: message.channelId,
      guild_id:   message.guildId,
      type:       0,
      author: {
        id:          message.author.id,
        username:    message.author.username,
        global_name: message.author.globalName,
        avatar:      message.author.avatar,
        bot:         false,
      },
    };

    const res = await fetch(`${WORKER_URL}/webhook/message`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bot ${DISCORD_TOKEN}`,
        'X-Forwarder-Secret': WORKER_SECRET || '',
      },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      stats.forwarded++;
      if (stats.forwarded % 10 === 0) {
        console.log(`📨 Forwarded ${stats.forwarded} messages`);
      }
    } else {
      stats.failed++;
      const text = await res.text();
      console.warn(`⚠️ Worker returned ${res.status}: ${text.slice(0, 100)}`);
    }

  } catch (err) {
    stats.failed++;
    if (err.name === 'TimeoutError') {
      console.warn(`⏱️ Worker timeout for message ${message.id}`);
    } else {
      console.error(`❌ Forward error: ${err.message}`);
    }
  }
});

client.on(Events.Error, (err) => {
  console.error(`❌ Discord client error: ${err.message}`);
});

client.on(Events.Warn, (msg) => {
  console.warn(`⚠️ Discord warning: ${msg}`);
});

// ── HTTP server để Render.com health check ────────────────────────
// Render yêu cầu app phải lắng nghe một port
const server = createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status:    'online',
      bot:       client.user?.tag ?? 'connecting...',
      uptime:    `${uptime}s`,
      stats,
      worker:    WORKER_URL,
      timestamp: new Date().toISOString(),
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🌐 Health check server: http://localhost:${PORT}`);
});

// ── Login ─────────────────────────────────────────────────────────
console.log('🔌 Connecting to Discord gateway...');
client.login(DISCORD_TOKEN).catch((err) => {
  console.error(`❌ Login failed: ${err.message}`);
  process.exit(1);
});

// ── Graceful shutdown ─────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('👋 Shutting down gracefully...');
  client.destroy();
  server.close();
  process.exit(0);
});
