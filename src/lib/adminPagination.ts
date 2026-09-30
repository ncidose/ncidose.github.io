export const ADMIN_USER_PAGE_SIZE = 50;

export const paginateAdminUsers = <T>(items: T[], requestedPage: number) => {
  const pageCount = Math.max(1, Math.ceil(items.length / ADMIN_USER_PAGE_SIZE));
  const page = Math.min(Math.max(Math.trunc(requestedPage) || 1, 1), pageCount);
  const start = (page - 1) * ADMIN_USER_PAGE_SIZE;
  const end = Math.min(start + ADMIN_USER_PAGE_SIZE, items.length);

  return { page, pageCount, start, end, items: items.slice(start, end) };
};
