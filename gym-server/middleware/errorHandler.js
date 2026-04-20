// Central error handler + 404. Controllers can either pass an error to next()
// or throw inside an async handler (paired with asyncHandler below). Response
// shape matches the rest of the API: { success: false, message }.

class AppError extends Error {
  constructor(message, status = 500, extra = {}) {
    super(message);
    this.status = status;
    Object.assign(this, extra);
  }
}

// Wrap async route handlers so rejected promises hit the error middleware
// instead of crashing the process.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const notFound = (req, res, next) => {
  next(new AppError(`Not found: ${req.method} ${req.originalUrl}`, 404));
};

// Translates common error shapes into HTTP responses.
// Must be declared with 4 args so Express recognises it as error middleware.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Server error';

  if (err.name === 'ValidationError') {
    status = 400;
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for ${field}`;
  }

  if (status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }

  res.status(status).json({ success: false, message });
};

module.exports = { AppError, asyncHandler, notFound, errorHandler };
