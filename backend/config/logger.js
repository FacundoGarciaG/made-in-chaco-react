const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const LEVEL = (LOG_LEVELS[process.env.LOG_LEVEL] ?? 1);

function prefix() {
  return new Date().toISOString();
}

export const logger = {
  debug: (...args) => { if (LEVEL <= 0) console.debug(`[${prefix()}] [DEBUG]`, ...args); },
  info: (...args) => { if (LEVEL <= 1) console.log(`[${prefix()}] [INFO]`, ...args); },
  warn: (...args) => { if (LEVEL <= 2) console.warn(`[${prefix()}] [WARN]`, ...args); },
  error: (...args) => { if (LEVEL <= 3) console.error(`[${prefix()}] [ERROR]`, ...args); },
};
