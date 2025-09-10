async function Datatable(queryOrModel, req, searchableFields = []) {
  let { page, limit, search, sortField, sortOrder } = req.query;

  page = parseInt(page) > 0 ? parseInt(page) : 1;
  limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
  sortField = sortField || "createdAt"; // default sorting field
  sortOrder = sortOrder === "asc" ? 1 : -1;

  const skip = (page - 1) * limit;

  let query;

  // If passed a Mongoose model, convert to a query
  if (queryOrModel.find) {
    query = queryOrModel.find();
  } else {
    query = queryOrModel; // already a query
  }

  // 🔍 Search across multiple fields
  if (search && searchableFields.length) {
    query = query.find({
      $or: searchableFields.map((field) => ({ [field]: { $regex: search, $options: "i" } })),
    });
  }

  // Count total documents for pagination
  const total = await query.model.countDocuments(query.getQuery());

  // Apply sorting, skip, limit
  const results = await query
    .sort({ [sortField]: sortOrder })
    .skip(skip)
    .limit(limit);

  return {
    data: results,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export default Datatable;
