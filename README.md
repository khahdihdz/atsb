# ATSB — AI Translator Bot (Cloudflare Workers)

Privacy-first AI translation bot for Telegram and Discord, deployed entirely on Cloudflare Workers. No Render, no VPS, no database.

## Architecture

- **Cloudflare Workers + Static Assets:** API routes and landing page.
- **Telegram:** webhook receives group/private messages and translates automatically.
- **Discord:** a Cloudflare Durable Object maintains the Gateway WebSocket and translates new messages automatically; verified Interactions Endpoint also provides `/translate` and **Translate message** context-menu actions.
- **AI:** Gemini API first, Groq fallback.
- **Privacy:** no D1, KV, R2 or message-history storage. Durable Object is used only to keep the Discord Gateway connection alive; messages and translations are never written to its storage. No message content or AI output in logs.

> Discord Gateway runs as an outbound WebSocket client inside a Durable Object. It stays active while connected and may incur Durable Object duration usage. A scheduled trigger checks/restarts the connection every minute. Enable the privileged Message Content Intent in the Discord Developer Portal. Telegram automatic translation runs through webhooks.

## 1. Cloudflare deployment

1. Import `khahdihdz/atsb` into GitHub-connected Cloudflare Workers, or deploy using Wrangler.
2. Build/deploy commands: `npm install` and `npm run deploy`.
3. Add these Worker secrets in **Workers & Pages → atsb-ai-translator → Settings → Variables and Secrets**:

| Secret | Required | Description |
|---|---:|---|
| `GEMINI_API_KEY` | Yes (or Groq) | Gemini API key |
| `GROQ_API_KEY` | Optional | Fallback AI key |
| `TELEGRAM_BOT_TOKEN` | Telegram | BotFather token |
| `TELEGRAM_WEBHOOK_SECRET` | Recommended | Random webhook secret |
| `DISCORD_PUBLIC_KEY` | Discord interactions | Application public key |\n| `DISCORD_TOKEN` | Discord | Bot token for Gateway and REST |

Set vars (non-secret): `DEFAULT_LANGUAGE=vi`, `GEMINI_MODEL=gemini-2.5-flash`, `GROQ_MODEL=openai/gpt-oss-20b`.

For Wrangler:
```bash
npm install
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put DISCORD_PUBLIC_KEY
npm run deploy
```

No secrets are stored in GitHub source files. Never commit API keys or bot tokens.

## 2. Telegram webhook

After deploying, set the Worker URL and the same secret configured above:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://<YOUR_WORKER>.workers.dev/telegram" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Check:
```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

For group-wide automatic translation, use BotFather `/setprivacy` → select bot → Disable, then remove/re-add bot to the group if Telegram requires it. Ensure the bot can read messages and send replies. Privacy Mode disabled means Telegram sends group messages to the bot; review the privacy policy and inform group members.

Commands: `/translate hello en`, `/privacy`, `/help`. The default target language is `DEFAULT_LANGUAGE=vi` globally; no per-chat settings are persisted.

## 3. Discord Interactions

1. In Discord Developer Portal, open your application → General Information.
2. Copy **Public Key** to Worker secret `DISCORD_PUBLIC_KEY`.
3. Set **Interactions Endpoint URL** to `https://<YOUR_WORKER>.workers.dev/discord`.
4. Invite the application with `applications.commands` scope.
5. Register commands once from a trusted local terminal:
   ```bash
   DISCORD_TOKEN=<bot-token> DISCORD_CLIENT_ID=<application-id> npm run register:discord
   ```
   Or run `node scripts/register-discord.mjs` after setting those environment variables.

Commands:
- `/translate text:<message> language:<vi|en|ja>`
- Right-click a message → Apps → Translate message (default language).

Discord verifies Ed25519 signatures and rejects stale timestamps. The Worker acknowledges interactions immediately and completes translation via the Discord follow-up webhook.

## 4. Landing page and health

- `/` — landing page
- `/privacy` or `/privacy.html` — privacy policy
- `/terms` or `/terms.html` — terms
- `/health` — service status JSON

## 5. Free AI and limits

Gemini and Groq may offer free quotas, but model availability, rate limits, and free-tier terms can change. This project uses Gemini first and Groq as fallback. Create keys from Google AI Studio and Groq Console. Cloudflare Workers and Durable Objects have request/CPU/duration quotas. An active Discord Gateway outbound WebSocket pins its Durable Object in memory and incurs duration usage while connected; review current Cloudflare plan limits. No service is guaranteed unlimited or 24/7 beyond provider plans.

## 6. Privacy

ATSB does not persist message text, translations, user profiles, or chat history. It does not use a database or message cache. Translation input exists transiently in request memory and is sent to the selected AI provider. Telegram and Discord also process messages under their own policies. AI providers and hosting providers have separate retention and processing terms; do not send passwords, OTPs, financial details, or sensitive personal data.

## Local development

```bash
npm install
npm run check
npm test
npm run dev
```

Repository: https://github.com/khahdihdz/atsb
