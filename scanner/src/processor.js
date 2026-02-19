const { getTokenData } = require('./apis/dexscreener');
const { analyzeHolders } = require('./apis/helius');
const { scoreToken } = require('./scorer');
const { saveToken } = require('./database');
const { sendAlert } = require('./alerts');
const { log } = require('./utils/logger');

// Deduplicate tokens we've already processed this session
const processedTokens = new Map(); // address -> timestamp

// How long to wait after detection before scoring (let data populate)
const INITIAL_DELAY_MS = 30000; // 30 seconds

// How often to re-score active tokens
const RESCORE_INTERVAL_MS = 60000; // 1 minute

// Max time to track a token
const MAX_TRACK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

async function processNewToken(rawToken) {
  const { address } = rawToken;

  // Skip if already being tracked
  if (processedTokens.has(address)) return;

  // Mark as seen immediately
  processedTokens.set(address, Date.now());

  log('info', `⏳ Queuing ${address} for scoring in ${INITIAL_DELAY_MS / 1000}s`);

  // Wait for initial data to populate on DexScreener
  setTimeout(async () => {
    await scoreAndProcess(address, rawToken);
  }, INITIAL_DELAY_MS);
}

async function scoreAndProcess(address, rawToken) {
  try {
    log('info', `📊 Scoring token: ${address}`);

    // Fetch market data from DexScreener
    const tokenData = await getTokenData(address);

    if (!tokenData) {
      log('warn', `No DexScreener data for ${address} — skipping`);
      return;
    }

    // Fetch holder data from Helius
    const holderData = await analyzeHolders(address);

    // Merge with raw token info
    const fullToken = {
      ...rawToken,
      ...tokenData,
      holderData,
      scoredAt: new Date().toISOString()
    };

    // Run scoring engine
    const scoreResult = scoreToken(tokenData, holderData);

    log('info', `📈 ${tokenData.symbol} (${address.slice(0, 8)}...) → ${scoreResult.summary}`);

    // Save to Supabase
    await saveToken(fullToken, scoreResult);

    // Send Telegram alert if worthy
    if (scoreResult.shouldAlert) {
      await sendAlert(fullToken, scoreResult);
    }

    // Schedule re-scoring if grade B+ to catch late movers
    if (scoreResult.grade !== 'C') {
      scheduleRescore(address, rawToken);
    }

  } catch (err) {
    log('error', `scoreAndProcess error for ${address}: ${err.message}`);
  }
}

function scheduleRescore(address, rawToken) {
  const startTime = processedTokens.get(address) || Date.now();
  const elapsed = Date.now() - startTime;

  if (elapsed > MAX_TRACK_DURATION_MS) {
    log('info', `⏰ Stopping tracking for ${address} (30min elapsed)`);
    return;
  }

  setTimeout(async () => {
    await scoreAndProcess(address, rawToken);
    scheduleRescore(address, rawToken);
  }, RESCORE_INTERVAL_MS);
}

// Cleanup old entries to prevent memory leak
setInterval(() => {
  const cutoff = Date.now() - MAX_TRACK_DURATION_MS;
  for (const [address, timestamp] of processedTokens.entries()) {
    if (timestamp < cutoff) {
      processedTokens.delete(address);
    }
  }
  log('info', `🧹 Cache cleanup done — tracking ${processedTokens.size} tokens`);
}, 60 * 60 * 1000); // every hour

module.exports = { processNewToken };
