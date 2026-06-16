export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export function parsePagination(page = 1, limit = 20): PaginationParams {
  return {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)),
  };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: totalPages > 0 && page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
}

export async function paginateQuery<T>(
  count: () => Promise<number>,
  findMany: (skip: number, take: number) => Promise<T[]>,
  pagination: PaginationParams
): Promise<PaginatedResult<T>> {
  const skip = (pagination.page - 1) * pagination.limit;

  const [total, items] = await Promise.all([
    count(),
    findMany(skip, pagination.limit),
  ]);

  return {
    items,
    meta: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
}
