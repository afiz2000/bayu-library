"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/apiClient";
import PageShell from "@/components/PageShell";
import DataTable, { Column } from "@/components/DataTable";
import Modal from "@/components/Modal";
import { Field, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/FormField";
import type { BookDetail, BorrowingDetail, LibrarianDetail, MemberDetail } from "@/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface FormState {
  borrow_id: string;
  member_id: string;
  book_id: string;
  librarian_id: string;
  borrow_date: string;
  due_date: string;
}

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

const emptyForm: FormState = {
  borrow_id: "",
  member_id: "",
  book_id: "",
  librarian_id: "",
  borrow_date: todayIso(),
  due_date: defaultDueDate(),
};

export default function BorrowingsPage() {
  const [rows, setRows] = useState<BorrowingDetail[]>([]);
  const [members, setMembers] = useState<MemberDetail[]>([]);
  const [books, setBooks] = useState<BookDetail[]>([]);
  const [librarians, setLibrarians] = useState<LibrarianDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [returning, setReturning] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiGet<BorrowingDetail[]>("/api/borrowings"),
      apiGet<MemberDetail[]>("/api/members"),
      apiGet<BookDetail[]>("/api/books"),
      apiGet<LibrarianDetail[]>("/api/librarians"),
    ])
      .then(([borrowings, mems, bks, libs]) => {
        if (active) {
          setRows(borrowings);
          setMembers(mems);
          setBooks(bks);
          setLibrarians(libs);
        }
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

  async function refresh() {
    const data = await apiGet<BorrowingDetail[]>("/api/borrowings");
    setRows(data);
  }

  function openCreate() {
    setForm({ ...emptyForm, borrow_date: todayIso(), due_date: defaultDueDate() });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await apiSend("/api/borrowings", "POST", form);
      if (!result.success) {
        throw new Error(result.error ?? "Request failed");
      }
      setModalOpen(false);
      await Promise.all([refresh(), apiGet<BookDetail[]>("/api/books").then(setBooks)]);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReturn(borrowId: string) {
    if (!confirm("Mark this book as returned today? The fine (if any) is calculated automatically.")) return;
    setReturning(borrowId);
    setError(null);
    try {
      const result = await apiSend(`/api/borrowings/${borrowId}/return`, "POST", {
        return_date: todayIso(),
      });
      if (!result.success) {
        throw new Error(result.error ?? "Failed to return book");
      }
      await Promise.all([refresh(), apiGet<BookDetail[]>("/api/books").then(setBooks)]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setReturning(null);
    }
  }

  const columns: Column<BorrowingDetail>[] = [
    { header: "ID", accessor: (r) => r.BORROW_ID },
    { header: "Member", accessor: (r) => r.MEMBER_NAME },
    { header: "Book", accessor: (r) => r.BOOK_TITLE },
    { header: "Librarian", accessor: (r) => r.LIBRARIAN_NAME },
    { header: "Borrowed", accessor: (r) => new Date(r.BORROW_DATE).toLocaleDateString() },
    { header: "Due", accessor: (r) => new Date(r.DUE_DATE).toLocaleDateString() },
    {
      header: "Status",
      accessor: (r) => (
        <span
          className={
            r.STATUS === "RETURNED"
              ? "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              : r.STATUS === "OVERDUE"
                ? "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
                : "rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          }
        >
          {r.STATUS}
        </span>
      ),
    },
    { header: "Fine", accessor: (r) => r.FINE_AMOUNT.toFixed(2) },
    {
      header: "Action",
      accessor: (r) =>
        r.STATUS === "RETURNED" ? (
          <span className="text-xs text-zinc-400">
            Returned {r.RETURN_DATE ? new Date(r.RETURN_DATE).toLocaleDateString() : ""}
          </span>
        ) : (
          <button
            onClick={() => handleReturn(r.BORROW_ID)}
            disabled={returning === r.BORROW_ID}
            className="rounded-md bg-black px-3 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {returning === r.BORROW_ID ? "Returning..." : "Return"}
          </button>
        ),
    },
  ];

  return (
    <PageShell
      title="Borrowings"
      description="Borrow and return history. Overdue status and fines (RM1/day late) are calculated automatically."
      loading={loading}
      error={error}
    >
      <div className="mb-4">
        <button className={primaryButtonClass} onClick={openCreate}>
          + New Borrowing
        </button>
      </div>
      <DataTable columns={columns} rows={rows} getKey={(r) => r.BORROW_ID} />

      {modalOpen && (
        <Modal title="New Borrowing" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Borrow ID">
              <input
                className={inputClass}
                value={form.borrow_id}
                onChange={(e) => setForm({ ...form, borrow_id: e.target.value })}
                required
              />
            </Field>
            <Field label="Member">
              <select
                className={inputClass}
                value={form.member_id}
                onChange={(e) => setForm({ ...form, member_id: e.target.value })}
                required
              >
                <option value="">— Select —</option>
                {members.map((m) => (
                  <option key={m.MEMBER_ID} value={m.MEMBER_ID}>
                    {m.FULL_NAME} ({m.MEMBER_ID})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Book">
              <select
                className={inputClass}
                value={form.book_id}
                onChange={(e) => setForm({ ...form, book_id: e.target.value })}
                required
              >
                <option value="">— Select —</option>
                {books.map((b) => (
                  <option key={b.BOOK_ID} value={b.BOOK_ID} disabled={b.AVAILABLE_COPIES === 0}>
                    {b.TITLE} ({b.AVAILABLE_COPIES} available)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Librarian">
              <select
                className={inputClass}
                value={form.librarian_id}
                onChange={(e) => setForm({ ...form, librarian_id: e.target.value })}
                required
              >
                <option value="">— Select —</option>
                {librarians.map((l) => (
                  <option key={l.LIBRARIAN_ID} value={l.LIBRARIAN_ID}>
                    {l.FULL_NAME} ({l.LIBRARIAN_ID})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Borrow Date">
              <input
                type="date"
                className={inputClass}
                value={form.borrow_date}
                onChange={(e) => setForm({ ...form, borrow_date: e.target.value })}
                required
              />
            </Field>
            <Field label="Due Date">
              <input
                type="date"
                className={inputClass}
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                required
              />
            </Field>

            {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" className={secondaryButtonClass} onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={primaryButtonClass} disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PageShell>
  );
}
