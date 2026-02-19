const axios = require('axios');
const { log } = require('../utils/logger');

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_BASE = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Known smart money wallets — populate via backtesting
// These are wallets that consistently buy 10x+ tokens early
const SMART_WALLETS = new Set([
  // Add wallets here as you identify them through backtesting
  // Example: 'wallet_address_here',
]);

async function getTokenHolders(mintAddress) {
  try {
    const res = await axios.post(HELIUS_BASE, {
      jsonrpc: '2.0',
      id: 'trencher-holders',
      method: 'getTokenLargestAccounts',
      params: [mintAddress, { commitment: 'confirmed' }]
    }, { timeout: 8000 });

    return res.data?.result?.value || [];
  } catch (err) {
    log('warn', `getTokenHolders failed: ${err.message}`);
    return [];
  }
}

async function getTokenSupply(mintAddress) {
  try {
    const res = await axios.post(HELIUS_BASE, {
      jsonrpc: '2.0',
      id: 'trencher-supply',
      method: 'getTokenSupply',
      params: [mintAddress]
    }, { timeout: 8000 });

    return res.data?.result?.value;
  } catch (err) {
    log('warn', `getTokenSupply failed: ${err.message}`);
    return null;
  }
}

async function getAssetInfo(mintAddress) {
  try {
    const res = await axios.post(HELIUS_BASE, {
      jsonrpc: '2.0',
      id: 'trencher-asset',
      method: 'getAsset',
      params: { id: mintAddress }
    }, { timeout: 8000 });

    return res.data?.result || null;
  } catch (err) {
    log('warn', `getAssetInfo failed: ${err.message}`);
    return null;
  }
}

async function getRecentTransactions(mintAddress, limit = 50) {
  try {
    const res = await axios.post(HELIUS_BASE, {
      jsonrpc: '2.0',
      id: 'trencher-txns',
      method: 'getSignaturesForAddress',
      params: [mintAddress, { limit }]
    }, { timeout: 10000 });

    return res.data?.result || [];
  } catch (err) {
    log('warn', `getRecentTransactions failed: ${err.message}`);
    return [];
  }
}

async function analyzeHolders(mintAddress) {
  const [holders, supply] = await Promise.all([
    getTokenHolders(mintAddress),
    getTokenSupply(mintAddress)
  ]);

  if (!holders.length || !supply) {
    return {
      holderCount: 0,
      top10Pct: 100,
      top1Pct: 100,
      smartMoneyCount: 0,
      smartMoneyWallets: []
    };
  }

  const totalSupply = parseFloat(supply.amount);
  const top10 = holders.slice(0, 10);
  const top1 = holders.slice(0, 1);

  const top10Pct = top10.reduce((sum, h) => sum + parseFloat(h.amount), 0) / totalSupply * 100;
  const top1Pct = top1.reduce((sum, h) => sum + parseFloat(h.amount), 0) / totalSupply * 100;

  // Check for smart money overlap
  const holderAddresses = holders.map(h => h.address);
  const smartMoneyFound = holderAddresses.filter(addr => SMART_WALLETS.has(addr));

  return {
    holderCount: holders.length,
    top10Pct: Math.round(top10Pct * 10) / 10,
    top1Pct: Math.round(top1Pct * 10) / 10,
    smartMoneyCount: smartMoneyFound.length,
    smartMoneyWallets: smartMoneyFound
  };
}

function isSmartWallet(address) {
  return SMART_WALLETS.has(address);
}

function addSmartWallet(address) {
  SMART_WALLETS.add(address);
  log('info', `Smart wallet added: ${address} (total: ${SMART_WALLETS.size})`);
}

module.exports = {
  getTokenHolders,
  getTokenSupply,
  getAssetInfo,
  getRecentTransactions,
  analyzeHolders,
  isSmartWallet,
  addSmartWallet,
  SMART_WALLETS
};
