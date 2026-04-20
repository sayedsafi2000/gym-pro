// Shared paginator for list endpoints.
// Usage:
//   const { data, pagination } = await paginate(Member, {
//     filter: { status: 'active' },
//     page: req.query.page,
//     limit: req.query.limit,
//     sort: { createdAt: -1 },
//     populate: 'packageId',
//   });
//   res.json({ success: true, data, pagination });

module.exports = async function paginate(model, opts = {}) {
  const { filter = {}, sort = { createdAt: -1 }, populate } = opts;

  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(opts.limit, 10) || 20));

  const total = await model.countDocuments(filter);

  let query = model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit);
  if (populate) {
    if (Array.isArray(populate)) {
      populate.forEach((p) => { query = query.populate(p); });
    } else {
      query = query.populate(populate);
    }
  }

  const data = await query;
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};
