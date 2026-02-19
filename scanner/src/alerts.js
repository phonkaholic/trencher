const TelegramBot = require('node-telegram-bot-api');
const { saveAlert } = require('./database');
const { log } = require('./utils/logger');

let bot = null;

function getBot() {
  if (!bot && process.env.TELEGRAM_BOT_TOKEN) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    log('info', '✅ Telegram bot initialized');
  }
  return bot;
}

const GRADE_CONFIG = {
  S: { emoji: '🚨', label: 'STRONG SIGNAL', color: '🔴' },
  A: { emoji: '⚡', label: 'WATCH THIS',    color: '🟡' },
  B: { emoji: '👀', label: 'SPECULATIVE',   color: '🟢' },
  C: { emoji: '💤', label: 'SKIP',          color: '⚪' },
};

async function sendAlert(tokenData, scoreResult) {
  const b = getBot();
  if (!b) {
    log('warn', 'Telegram bot not configured — skipping alert');
    return;
  }

  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!channelId) {
    log('warn', 'TELEGRAM_CHANNEL_ID not set — skipping alert');
    return;
  }

  try {
    const cfg = GRADE_CONFIG[scoreResult.grade];
    const ageMin = tokenData.pairCreatedAt
      ? Math.round((Date.now() - tokenData.pairCreatedAt) / 60000)
      : '?';

    const flagsFormatted = scoreResult.flags
      .slice(0, 5)
      .map(f => `<code>${f}</code>`)
      .join(' ');

    const message = `
${cfg.emoji} <b>[${scoreResult.grade}] ${tokenData.name || 'Unknown'} — $${tokenData.symbol || '???'}</b>
<i>${cfg.label} • Score: ${scoreResult.score}/100</i>
━━━━━━━━━━━━━━━━━━━━
💰 Price: <b>$${formatPrice(tokenData.priceUsd)}</b>
📊 FDV: <b>$${formatLarge(tokenData.fdv)}</b>
💧 Liquidity: <b>$${formatLarge(tokenData.liquidityUsd)}</b>
📈 5m Change: <b>${tokenData.priceChange5m > 0 ? '+' : ''}${(tokenData.priceChange5m || 0).toFixed(1)}%</b>
🔥 Buy Ratio: <b>${((tokenData.buyRatio5m || 0.5) * 100).toFixed(0)}%</b>
👥 Holders: <b>${tokenData.holderData?.holderCount || '?'}</b>
⏱️ Age: <b>${ageMin}m</b>
━━━━━━━━━━━━━━━━━━━━
🏷️ ${flagsFormatted}
━━━━━━━━━━━━━━━━━━━━
<a href="https://pump.fun/${tokenData.address}">pump.fun</a> | <a href="https://dexscreener.com/solana/${tokenData.address}">chart</a> | <a href="https://solscan.io/token/${tokenData.address}">solscan</a>

<i>⚠️ Not financial advice. DYOR. #trencher</i>
`.trim();

    await b.sendMessage(channelId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    log('info', `📨 Alert sent for ${tokenData.symbol} (Grade ${scoreResult.grade})`);

    // Save alert to DB for dashboard history
    await saveAlert(tokenData, scoreResult);

  } catch (err) {
    log('error', `Telegram sendAlert error: ${err.message}`);
  }
}

function formatPrice(price) {
  if (!price || price === 0) return '0';
  if (price < 0.000001) return price.toExponential(3);
  if (price < 0.01) return price.toFixed(8);
  if (price < 1) return price.toFixed(6);
  return price.toFixed(4);
}

function formatLarge(num) {
  if (!num) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return Math.round(num).toString();
}

module.exports = { sendAlert };
