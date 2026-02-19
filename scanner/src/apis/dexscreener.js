const axios = require('axios');
const { log } = require('./utils/logger');

const DEXSCREENER_BASE = 'https://api.dexscreener.com/latest/dex';
const RATE_LIMIT_MS = 300; // ~3 req/sec to stay polite

let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await sleep(RATE_LIMIT_MS - elapsed);
  }
  lastRequestTime = Date.now();
}

async function getTokenData(tokenAddress) {
  await rateLimit();
  try {
    const res = await axios.get(`${DEXSCREENER_BASE}/tokens/${tokenAddress}`, {
      timeout: 8000
    });

    const pairs = res.data?.pairs;
    if (!pairs || pairs.length === 0) return null;

    // Prefer pump.fun pair, fallback to most liquid
    const pair = pairs.find(p => p.dexId === 'pumpfun') ||
                 pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];

    return {
      address: tokenAddress,
      name: pair.baseToken?.name || 'Unknown',
      symbol: pair.baseToken?.symbol || '???',
      priceUsd: parseFloat(pair.priceUsd || 0),
      priceChange5m: pair.priceChange?.m5 || 0,
      priceChange1h: pair.priceChange?.h1 || 0,
      priceChange6h: pair.priceChange?.h6 || 0,
      volume5m: pair.volume?.m5 || 0,
      volume1h: pair.volume?.h1 || 0,
      volume24h: pair.volume?.h24 || 0,
      liquidityUsd: pair.liquidity?.usd || 0,
      fdv: pair.fdv || 0,
      marketCap: pair.marketCap || 0,
      buys5m: pair.txns?.m5?.buys || 0,
      sells5m: pair.txns?.m5?.sells || 0,
      buys1h: pair.txns?.h1?.buys || 0,
      sells1h: pair.txns?.h1?.sells || 0,
      buyRatio5m: calcBuyRatio(pair.txns?.m5),
      buyRatio1h: calcBuyRatio(pair.txns?.h1),
      pairAddress: pair.pairAddress,
      pairCreatedAt: pair.pairCreatedAt,
      url: pair.url,
      imageUrl: pair.info?.imageUrl,
      websites: pair.info?.websites || [],
      socials: pair.info?.socials || [],
      dexId: pair.dexId,
    };
  } catch (err) {
    log('warn', `DexScreener fetch failed for ${tokenAddress}: ${err.message}`);
    return null;
  }
}

async function getMultipleTokens(addresses) {
  // DexScreener supports comma-separated addresses (up to 30)
  const chunks = chunkArray(addresses, 30);
  const results = [];

  for (const chunk of chunks) {
    await rateLimit();
    try {
      const res = await axios.get(`${DEXSCREENER_BASE}/tokens/${chunk.join(',')}`, {
        timeout: 10000
      });
      if (res.data?.pairs) {
        results.push(...res.data.pairs);
      }
    } catch (err) {
      log('warn', `Bulk DexScreener fetch error: ${err.message}`);
    }
  }

  return results;
}

function calcBuyRatio(txns) {
  if (!txns) return 0.5;
  const total = (txns.buys || 0) + (txns.sells || 0);
  if (total === 0) return 0.5;
  return txns.buys / total;
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { getTokenData, getMultipleTokens };
