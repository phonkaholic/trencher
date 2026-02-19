const { getRecentTokens } = require('./database');
const { scoreAndProcess } = require('./processor');
const { log } = require('./utils/logger');

const POLL_INTERVAL_MS = parseInt(process.env.SCAN_INTERVAL_MS) || 30000;

function startDexScreenerPolling() {
  log('info', `📡 Starting DexScreener poller (every ${POLL_INTERVAL_MS / 1000}s)`);
  setInterval(pollActiveTokens, POLL_INTERVAL_MS);
}

async function pollActiveTokens() {
  try {
    // Get tokens from last 2 hours that aren't grade C
    const tokens = await getRecentTokens(50, 'B');
    if (!tokens.length) return;

    log('info', `🔄 Rescoring ${tokens.length} active tokens...`);

    // Stagger requests to avoid hammering APIs
    for (let i = 0; i < tokens.length; i++) {
      setTimeout(async () => {
        const token = tokens[i];
        // Re-fetch and re-score
        const { getTokenData } = require('./apis/dexscreener');
        const { analyzeHolders } = require('./apis/helius');
        const { scoreToken } = require('./scorer');
        const { saveToken } = require('./database');
        const { sendAlert } = require('./alerts');

        const fresh = await getTokenData(token.address);
        if (!fresh) return;

        const holderData = await analyzeHolders(token.address);
        const scoreResult = scoreToken(fresh, holderData);

        // If grade improved significantly, send a new alert
        const gradeImproved = gradeValue(scoreResult.grade) > gradeValue(token.grade);
        if (gradeImproved && scoreResult.shouldAlert) {
          log('info', `📈 ${token.symbol} grade improved: ${token.grade} → ${scoreResult.grade}`);
          await sendAlert({ ...token, ...fresh, holderData }, scoreResult);
        }

        await saveToken({ ...token, ...fresh, holderData }, scoreResult);
      }, i * 500); // 500ms stagger between each
    }
  } catch (err) {
    log('error', `pollActiveTokens error: ${err.message}`);
  }
}

function gradeValue(grade) {
  return { S: 4, A: 3, B: 2, C: 1 }[grade] || 0;
}

module.exports = { startDexScreenerPolling };
