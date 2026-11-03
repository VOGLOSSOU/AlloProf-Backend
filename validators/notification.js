const { z } = require('zod');
const { pagination } = require('./common');

const list = z.object({
  nonLues: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  ...pagination,
});

module.exports = { list };
