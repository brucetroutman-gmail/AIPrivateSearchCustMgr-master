/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable security/detect-unsafe-regex */
// Centralized logging utility with input sanitization
// Prevents log injection attacks by sanitizing all logged content

/**
 * Sanitizes input to prevent log injection attacks
 * @param {any} input - The input to sanitize
 * @returns {string} - Sanitized string safe for logging
 */
function sanitizeLogInput(input) {
  if (input === null || input === undefined) {
    return String(input);
  }
  
  let str = typeof input === 'string' ? input : String(input);
  
  // Remove control characters that could be used for log injection
  // \r\n\t - newlines and tabs that could break log format
  // \x00-\x1f - control characters
  // \x7f-\x9f - additional control characters
  return str.replace(/[\r\n\t]/g, ' ').replace(/[\x00-\x1f\x7f-\x9f]/g, '');
}

/**
 * Safe logging functions that sanitize all inputs
 */
const secureLog = {
  log: (...args) => {
    const sanitizedArgs = args.map(sanitizeLogInput);
    console.log(...sanitizedArgs);
  },
  
  error: (...args) => {
    const sanitizedArgs = args.map(sanitizeLogInput);
    console.error(...sanitizedArgs);
  },
  
  warn: (...args) => {
    const sanitizedArgs = args.map(sanitizeLogInput);
    console.warn(...sanitizedArgs);
  },
  
  info: (...args) => {
    const sanitizedArgs = args.map(sanitizeLogInput);
    console.info(...sanitizedArgs);
  },
  
  debug: (...args) => {
    const sanitizedArgs = args.map(sanitizeLogInput);
    console.debug(...sanitizedArgs);
  }
};

// Keep logger for backward compatibility
const logger = secureLog;

// ES module exports
export { secureLog, logger, sanitizeLogInput };
export default { secureLog, logger, sanitizeLogInput };

// Browser compatibility
if (typeof window !== 'undefined') {
  window.secureLog = secureLog;
  window.logger = logger;
  window.sanitizeLogInput = sanitizeLogInput;
}