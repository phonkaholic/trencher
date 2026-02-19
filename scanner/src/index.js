require('dotenv').config();
const { listenForNewTokens } = require('./helius');
const { startDexScreenerPolling } = require('./poller');
const { log } = require('./utils/logger');

async function main() {
  log('info', '🔍 trencher scanner starting...');
  log('info', `Helius RPC: ${process.env.HELIUS_RPC_URL?.slice(0, 40)}...`);
  log('info', `Supabase: ${process.env.SUPABASE_URL}`);

  // Start WebSocket listener for new pump.fun token mints
  listenForNewTokens();

  // Start DexScreener poller for scoring active tokens
  startDexScreenerPolling();

  log('info', '✅ trencher is live — watching the trenches...');
}

main().catch(err => {
  log('error', `Fatal error: ${err.message}`);
  process.exit(1);
});
