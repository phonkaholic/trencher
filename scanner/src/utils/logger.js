const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
function log(level, message) {
  if (LEVELS[level] <= LEVELS[process.env.LOG_LEVEL || 'info']) {
    console.log('[' + new Date().toISOString().slice(11,23) + '] ' + message);
  }
}
module.exports = { log };