// Zod validator middleware. Pass a schema, get Express middleware back.
// Replaces req.body / req.query / req.params with the parsed, coerced values
// so downstream code can trust the shape. Errors become 400 with a flat list.

const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const errors = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return res.status(400).json({
      success: false,
      message: errors.map((e) => `${e.path}: ${e.message}`).join('; ') || 'Invalid request',
      errors,
    });
  }
  req[source] = result.data;
  next();
};

module.exports = validate;
