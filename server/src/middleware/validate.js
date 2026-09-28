const { ApiError } = require('./errorHandler');

// Simple field-presence / type validator. rules: { field: { required, type, min, max } }
function validate(rules) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field];
      const present = value !== undefined && value !== null && value !== '';

      if (rule.required && !present) {
        errors.push(`${field} is required`);
        continue;
      }
      if (!present) continue;

      if (rule.type === 'number' && isNaN(Number(value))) {
        errors.push(`${field} must be a number`);
      }
      if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push(`${field} must be a valid email`);
      }
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
      }
      if (rule.minLength && String(value).length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters`);
      }
    }

    if (errors.length) {
      return next(new ApiError(400, errors.join('; ')));
    }
    next();
  };
}

module.exports = { validate };
