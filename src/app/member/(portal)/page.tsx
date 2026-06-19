"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/apiClient";
import PageShell from "@/components/PageShell";
import DataTable, { Column } from "@/components/DataTable";
import type { BorrowingDetail } from "@/types";

const columns: Column<BorrowingDetail>[] = [
  { header: "Book", accessor: (r) => r.BOOK_TITLE },
  { header: "Borrowed", accessor: (r) => new Date(r.BORROW_DATE).toLocaleDateString() },
  { header: "Due", accessor: (r) => new Date(r.DUE_DATE).toLocaleDateString() },
  {
    header: "Status",
    accessor: (r) => (
      <span
        className={
          r.STATUS === "RETURNED"
            ? "rounded-full bg-navy/10 px-2 py-0.5 text-xs font-medium text-navy/70"
            : r.STATUS === "OVERDUE"
              ? "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
              : "rounded-full bg-gold-light px-2 py-0.5 text-xs font-medium text-gold-dark"
        }
      >
        {r.STATUS}
      </span>
    ),
  },
  { header: "Fine (RM)", accessor: (r) => r.FINE_AMOUNT.toFixed(2) },
];

export default function MemberDashboard() {
  const [rows, setRows] = useState<BorrowingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiGet<BorrowingDetail[]>("/api/member/borrowings")
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((err) => {
        if (active) setError((err as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageShell title="My Borrowings" description="Your borrowing history and any outstanding fines" loading={loading} error={error}>
      <DataTable columns={columns} rows={rows} getKey={(r) => r.BORROW_ID} emptyMessage="You have no borrowing history yet." />
    </PageShell>
  );
}
