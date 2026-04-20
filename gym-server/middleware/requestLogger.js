// Minimal request logger. Tags each request with a short ID, logs one line
// per request on response finish. No external deps — enough structure to
// grep by id across a crash without pulling in winston/pino yet.

const { randomUUID } = require('crypto');

const shortId = () => {
  try {
    return randomUUID().split('-')[0];
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
};

const requestLogger = (req, res, next) => {
  req.id = req.headers['x-request-id'] || shortId();
  res.setHeader('X-Request-Id', req.id);

  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const line = `[${req.id}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`;
    if (res.statusCode >= 500) {
      console.error(line);
    } else if (res.statusCode >= 400) {
      console.warn(line);
    } else {
      console.log(line);
    }
  });
  next();
};

module.exports = requestLogger;
