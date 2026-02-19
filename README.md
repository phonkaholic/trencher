# 🔍 trencher

> Real-time AI-powered gem scanner for Solana launchpads — pump.fun · Meteora · Bonk

[![Live Dashboard](https://img.shields.io/badge/dashboard-live-brightgreen)](https://phonkaholic.github.io/trencher)
[![Telegram](https://img.shields.io/badge/alerts-%40trencheralertbot-blue)](https://t.me/trencheralertbot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**trencher** monitors every token launch on Solana launchpads in real-time, scores them across 5 signal dimensions, and fires Telegram alerts before the crowd notices.

## How It Works

Every new token is scored 0–100 across:
- 🔥 **Momentum** — buy pressure, price velocity, unique buyers
- 🧠 **Smart Money** — known alpha wallet overlap
- 🛡️ **Safety** — dev holdings, bundle detection, LP status
- 📱 **Social** — Twitter/Telegram velocity
- 📊 **Structure** — holder distribution, mint authority

Tokens scoring 80+ (Grade S) fire an immediate Telegram alert. Grade A (60–79) fires a softer alert. Everything is logged to the live dashboard.

## Stack

- **Scanner**: Node.js + Helius WebSocket RPC
- **Database**: Supabase (Postgres)
- **Alerts**: Telegram Bot API
- **Dashboard**: React + Vite → GitHub Pages
- **CI/CD**: GitHub Actions

## Self-Host

```bash
git clone https://github.com/phonkaholic/trencher
cd trencher/scanner
cp .env.example .env
# Fill in your keys
npm install
npm start
```

## Dashboard

Live at [phonkaholic.github.io/trencher](https://phonkaholic.github.io/trencher)

## Telegram Alerts

Join [@trencheralertbot](https://t.me/trencheralertbot) for real-time Grade S and A alerts fired directly to Telegram the moment a token scores high enough.

## Disclaimer

This tool is for informational purposes only. Nothing here is financial advice. Memecoins are extremely high-risk. Only use money you can afford to lose entirely.

---

Built by [@phonkaholic](https://github.com/phonkaholic) · MIT License
