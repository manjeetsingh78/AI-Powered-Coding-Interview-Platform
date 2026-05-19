import { useMemo, useState } from "react";

export default function usePagination({ initialPage = 1, pageSize = 10, total = 0 } = {}) {
  const [page, setPage] = useState(initialPage);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const next = () => setPage((previous) => Math.min(totalPages, previous + 1));
  const prev = () => setPage((previous) => Math.max(1, previous - 1));

  return {
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    next,
    prev,
  };
}
