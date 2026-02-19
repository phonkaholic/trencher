require('dotenv').config();
const WebSocket = require('ws');
const { processNewToken } = require('./processor');
const { log } = require('./utils/logger');

// pump.fun program address on Solana mainnet
const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBymtcin';

let ws = null;
let reconnectTimer = null;
let pingInterval = null;

function connect() {
  const wsUrl = process.env.HELIUS_WS_URL;
  log('info', `Connecting to Helius WebSocket...`);

  ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    log('info', '✅ Helius WebSocket connected');

    // Subscribe to all transactions involving pump.fun program
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'transactionSubscribe',
      params: [
        {
          accountInclude: [PUMP_FUN_PROGRAM]
        },
        {
          commitment: 'confirmed',
          encoding: 'jsonParsed',
          transactionDetails: 'full',
          maxSupportedTransactionVersion: 0
        }
      ]
    }));

    // Keep-alive ping every 30s
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);
  });

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      // Subscription confirmation
      if (msg.result && typeof msg.result === 'number') {
        log('info', `Subscribed to pump.fun transactions (sub #${msg.result})`);
        return;
      }

      // Incoming transaction
      if (msg.params?.result?.transaction) {
        const tx = msg.params.result.transaction;
        await handleTransaction(tx);
      }
    } catch (err) {
      log('error', `WS message parse error: ${err.message}`);
    }
  });

  ws.on('error', (err) => {
    log('error', `WebSocket error: ${err.message}`);
  });

  ws.on('close', () => {
    log('warn', 'WebSocket disconnected — reconnecting in 5s...');
    clearInterval(pingInterval);
    reconnectTimer = setTimeout(connect, 5000);
  });
}

async function handleTransaction(tx) {
  try {
    const instructions = tx.transaction?.message?.instructions || [];
    const accountKeys = tx.transaction?.message?.accountKeys || [];

    // Look for "create" instruction on pump.fun — this is a new token mint
    for (const ix of instructions) {
      if (
        ix.programId === PUMP_FUN_PROGRAM &&
        ix.parsed?.type === 'create'
      ) {
        const tokenMint = ix.parsed?.info?.mint || accountKeys[1]?.pubkey;
        if (tokenMint) {
          log('info', `🆕 New token detected: ${tokenMint}`);
          await processNewToken({
            address: tokenMint,
            signature: tx.transaction?.signatures?.[0],
            timestamp: Date.now(),
            source: 'pump.fun'
          });
        }
        break;
      }
    }

    // Also catch via log messages (pump.fun emits structured logs)
    const logs = tx.meta?.logMessages || [];
    for (const logLine of logs) {
      if (logLine.includes('MintTo') || logLine.includes('InitializeMint')) {
        // Extract mint from logs if instruction parsing missed it
        const mintMatch = logLine.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
        if (mintMatch) {
          const potentialMint = mintMatch[0];
          if (!seenThisSession.has(potentialMint)) {
            seenThisSession.add(potentialMint);
          }
        }
      }
    }
  } catch (err) {
    log('error', `handleTransaction error: ${err.message}`);
  }
}

const seenThisSession = new Set();

function listenForNewTokens() {
  connect();
}

function disconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (pingInterval) clearInterval(pingInterval);
  if (ws) ws.close();
}

module.exports = { listenForNewTokens, disconnect };
