"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/apiClient";
import PageShell from "@/components/PageShell";
import DataTable, { Column } from "@/components/DataTable";
import TableControls from "@/components/TableControls";
import Modal from "@/components/Modal";
import Notice from "@/components/Notice";
import { Field, inputClass, primaryButtonClass, secondaryButtonClass, dangerLinkClass, editLinkClass } from "@/components/FormField";
import { useTableControls } from "@/lib/useTableControls";
import type { Author, BookDetail, CategoryDetail } from "@/types";

function matchesBook(row: BookDetail, query: string): boolean {
  return (
    row.BOOK_ID.toLowerCase().includes(query) ||
    row.TITLE.toLowerCase().includes(query) ||
    row.ISBN.toLowerCase().includes(query) ||
    row.CATEGORY_NAME.toLowerCase().includes(query) ||
    row.AUTHORS.toLowerCase().includes(query)
  );
}

interface FormState {
  book_id: string;
  category_id: string;
  title: string;
  isbn: string;
  publish_year: string;
  publisher: string;
  total_copies: string;
  available_copies: string;
  author_ids: string[];
}

const emptyForm: FormState = {
  book_id: "",
  category_id: "",
  title: "",
  isbn: "",
  publish_year: "",
  publisher: "",
  total_copies: "",
  available_copies: "",
  author_ids: [],
};

export default function BooksPage() {
  const [rows, setRows] = useState<BookDetail[]>([]);
  const [categories, setCategories] = useState<CategoryDetail[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const { query, setQuery, page, setPage, totalPages, pageRows, totalCount } = useTableControls(
    rows,
    matchesBook
  );

  useEffect(() => {
    let active = true;
    Promise.all([
      apiGet<BookDetail[]>("/api/books"),
      apiGet<CategoryDetail[]>("/api/categories"),
      apiGet<Author[]>("/api/authors"),
    ])
      .then(([books, cats, auths]) => {
        if (active) {
          setRows(books);
          setCategories(cats);
          setAuthors(auths);
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
    const data = await apiGet<BookDetail[]>("/api/books");
    setRows(data);
  }

  async function openCreate() {
    setFormError(null);
    try {
      const { id } = await apiGet<{ id: string }>("/api/next-id/book");
      setForm({ ...emptyForm, book_id: id });
      setModalMode("create");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function openEdit(row: BookDetail) {
    setForm({
      book_id: row.BOOK_ID,
      category_id: row.CATEGORY_ID,
      title: row.TITLE,
      isbn: row.ISBN,
      publish_year: String(row.PUBLISH_YEAR),
      publisher: row.PUBLISHER ?? "",
      total_copies: String(row.TOTAL_COPIES),
      available_copies: String(row.AVAILABLE_COPIES),
      author_ids: [],
    });
    setFormError(null);
    setModalMode("edit");
  }

  function toggleAuthor(authorId: string) {
    setForm((prev) => ({
      ...prev,
      author_ids: prev.author_ids.includes(authorId)
        ? prev.author_ids.filter((id) => id !== authorId)
        : [...prev.author_ids, authorId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (modalMode === "create") {
        const result = await apiSend<{ book_id: string; reassigned: boolean }>("/api/books", "POST", {
          book_id: form.book_id,
          category_id: form.category_id,
          title: form.title,
          isbn: form.isbn,
          publish_year: Number(form.publish_year),
          publisher: form.publisher || undefined,
          total_copies: Number(form.total_copies),
          available_copies: Number(form.available_copies),
          author_ids: form.author_ids,
        });
        if (!result.success) {
          throw new Error(result.error ?? "Request failed");
        }
        if (result.data?.reassigned) {
          setNotice(`Book ID was reassigned to ${result.data.book_id} (the suggested ID was taken in the meantime).`);
        }
      } else {
        const result = await apiSend(`/api/books/${form.book_id}`, "PUT", {
          category_id: form.category_id,
          title: form.title,
          isbn: form.isbn,
          publish_year: Number(form.publish_year),
          publisher: form.publisher || undefined,
          total_copies: Number(form.total_copies),
          available_copies: Number(form.available_copies),
        });
        if (!result.success) {
          throw new Error(result.error ?? "Request failed");
        }
      }

      setModalMode(null);
      await refresh();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(row: BookDetail) {
    if (!confirm(`Delete book "${row.TITLE}"?`)) return;
    try {
      const result = await apiSend(`/api/books/${row.BOOK_ID}`, "DELETE");
      if (!result.success) {
        throw new Error(result.error ?? "Delete failed");
      }
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const columns: Column<BookDetail>[] = [
    { header: "ID", accessor: (r) => r.BOOK_ID },
    { header: "Title", accessor: (r) => r.TITLE },
    { header: "Category", accessor: (r) => r.CATEGORY_NAME },
    { header: "Authors", accessor: (r) => r.AUTHORS || "—" },
    { header: "ISBN", accessor: (r) => r.ISBN },
    { header: "Year", accessor: (r) => r.PUBLISH_YEAR },
    { header: "Copies", accessor: (r) => `${r.AVAILABLE_COPIES} / ${r.TOTAL_COPIES}` },
    {
      header: "Actions",
      accessor: (r) => (
        <div className="flex gap-3">
          <button className={editLinkClass} onClick={() => openEdit(r)}>
            Edit
          </button>
          <button className={dangerLinkClass} onClick={() => handleDelete(r)}>
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageShell title="Books" description="Book catalogue with availability" loading={loading} error={error}>
      {notice && <Notice message={notice} onDismiss={() => setNotice(null)} />}
      <div className="mb-4">
        <button className={primaryButtonClass} onClick={openCreate}>
          + Add Book
        </button>
      </div>
      <TableControls
        query={query}
        onQueryChange={setQuery}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={totalCount}
        placeholder="Search books..."
      />
      <DataTable columns={columns} rows={pageRows} getKey={(r) => r.BOOK_ID} />

      {modalMode && (
        <Modal title={modalMode === "create" ? "Add Book" : "Edit Book"} onClose={() => setModalMode(null)}>
          <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
            {modalMode === "create" && (
              <Field label="Book ID">
                <input className={inputClass} value={form.book_id} disabled required />
              </Field>
            )}

            <Field label="Title">
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </Field>
            <Field label="Category">
              <select
                className={inputClass}
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                required
              >
                <option value="">— Select —</option>
                {categories.map((c) => (
                  <option key={c.CATEGORY_ID} value={c.CATEGORY_ID}>
                    {c.CATEGORY_NAME}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="ISBN">
              <input
                className={inputClass}
                value={form.isbn}
                onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                required
              />
            </Field>
            <Field label="Publish Year">
              <input
                type="number"
                className={inputClass}
                value={form.publish_year}
                onChange={(e) => setForm({ ...form, publish_year: e.target.value })}
                required
              />
            </Field>
            <Field label="Publisher">
              <input
                className={inputClass}
                value={form.publisher}
                onChange={(e) => setForm({ ...form, publisher: e.target.value })}
              />
            </Field>
            <Field label="Total Copies">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.total_copies}
                onChange={(e) => setForm({ ...form, total_copies: e.target.value })}
                required
              />
            </Field>
            <Field label="Available Copies">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.available_copies}
                onChange={(e) => setForm({ ...form, available_copies: e.target.value })}
                required
              />
            </Field>

            {modalMode === "create" && (
              <Field label="Authors">
                <div className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-md border border-navy/15 p-2">
                  {authors.map((a) => (
                    <label key={a.AUTHOR_ID} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.author_ids.includes(a.AUTHOR_ID)}
                        onChange={() => toggleAuthor(a.AUTHOR_ID)}
                      />
                      {a.AUTHOR_NAME}
                    </label>
                  ))}
                </div>
              </Field>
            )}
            {modalMode === "edit" && (
              <p className="text-xs text-navy/50">
                Author list can only be set when creating a book.
              </p>
            )}

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" className={secondaryButtonClass} onClick={() => setModalMode(null)}>
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
