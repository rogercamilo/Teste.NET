export interface PageParams {
  page: number;     // 1-based
  pageSize: number;
  skip: number;
  take: number;
}

const MAX_PAGE_SIZE = 200;
const MAX_PAGE = 10_000;

/**
 * Returns null when neither `page` nor `pageSize` appear in the query string,
 * preserving the current "return all records" behavior for existing callers.
 */
export function parsePagination(searchParams: URLSearchParams): PageParams | null {
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");
  if (!pageParam && !pageSizeParam) return null;

  const pageSize = Math.min(Math.max(1, Number(pageSizeParam ?? 50)), MAX_PAGE_SIZE);
  const page = Math.min(Math.max(1, Number(pageParam ?? 1)), MAX_PAGE);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function paginationHeaders(total: number, params: PageParams): Record<string, string> {
  return {
    "X-Total-Count": String(total),
    "X-Page": String(params.page),
    "X-Page-Size": String(params.pageSize),
    "X-Page-Count": String(Math.ceil(total / params.pageSize)),
  };
}
