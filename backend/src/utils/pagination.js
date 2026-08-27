export function normalizePaging({ page = 1, limit = 25 } = {}) {
  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safeLimit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 25)));

  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit
  };
}
