const axios = require('axios');

const DEXSCREENER_BASE = 'https://api.dexscreener.com/latest/dex';
const RATE_LIMIT_MS = 300;
let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) await sleep(RATE_LIMIT_MS - elapsed);
  lastRequestTime = Date.now();
}

async function getTokenData(tokenAddress) {
  await rateLimit();
  try {
    const res = await axios.get(`${DEXSCREENER_BASE}/tokens/${tokenAddress}`, { timeout: 8000 });
    const pairs = res.data?.pairs;
    if (!pairs || pairs.length === 0) return null;
    const pair = pairs.find(p => p.dexId === 'pumpfun') ||
                 pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
    return {
      address: tokenAddress,
      name: pair.baseToken?.name || 'Unknown',
      symbol: pair.baseToken?.symbol || '???',
      priceUsd: parseFloat(pair.priceUsd || 0),
      priceChange5m: pair.priceChange?.m5 || 0,
      priceChange1h: pair.priceChange?.h1 || 0,
      volume5m: pair.volume?.m5 || 0,
      volume1h: pair.volume?.h1 || 0,
      liquidityUsd: pair.liquidity?.usd || 0,
      fdv: pair.fdv || 0,
      marketCap: pair.marketCap || 0,
      buys5m: pair.txns?.m5?.buys || 0,
      sells5m: pair.txns?.m5?.sells || 0,
      buys1h: pair.txns?.h1?.buys || 0,
      sells1h: pair.txns?.h1?.sells || 0,
      buyRatio5m: calcBuyRatio(pair.txns?.m5),
      pairAddress: pair.pairAddress,
      pairCreatedAt: pair.pairCreatedAt,
      url: pair.url,
      imageUrl: pair.info?.imageUrl,
      websites: pair.info?.websites || [],
      socials: pair.info?.socials || [],
      dexId: pair.dexId,
    };
  } catch (err) {
    console.log('DexScreener fetch failed for ' + tokenAddress + ': ' + err.message);
    return null;
  }
}

function calcBuyRatio(txns) {
  if (!txns) return 0.5;
  const total = (txns.buys || 0) + (txns.sells || 0);
  return total === 0 ? 0.5 : txns.buys / total;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { getTokenData };