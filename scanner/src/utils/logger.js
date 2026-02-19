const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function log(level, message) {
  if (LEVELS[level] <= LEVELS[LOG_LEVEL]) {
    const timestamp = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
    const prefix = {
      error: '❌',
      warn:  '⚠️ ',
      info:  '  ',
      debug: '🔬',
    }[level] || '  ';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }
}

module.exports = { log };
