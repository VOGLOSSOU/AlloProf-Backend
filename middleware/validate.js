// Valide (et normalise) req.body avec un schema Zod ; une ZodError part dans errorHandler
function validate(schema) {
  return (req, res, next) => {
    req.body = schema.parse(req.body ?? {});
    next();
  };
}

module.exports = validate;
