"use client";

import { useMemo, useState } from "react";

export function useTableControls<T>(
  rows: T[],
  filterFn: (row: T, query: string) => boolean,
  pageSize = 10
) {
  const [query, setQueryState] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return rows;
    return rows.filter((row) => filterFn(row, trimmed));
  }, [rows, query, filterFn]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function setQuery(value: string) {
    setQueryState(value);
    setPage(1);
  }

  return {
    query,
    setQuery,
    page: currentPage,
    setPage,
    totalPages,
    pageRows,
    totalCount: filtered.length,
  };
}
