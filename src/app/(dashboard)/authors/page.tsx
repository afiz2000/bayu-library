"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/apiClient";
import PageShell from "@/components/PageShell";
import DataTable, { Column } from "@/components/DataTable";
import TableControls from "@/components/TableControls";
import Modal from "@/components/Modal";
import { Field, inputClass, primaryButtonClass, secondaryButtonClass, dangerLinkClass, editLinkClass } from "@/components/FormField";
import { useTableControls } from "@/lib/useTableControls";
import type { Author } from "@/types";

interface FormState {
  author_id: string;
  author_name: string;
  nationality: string;
}

const emptyForm: FormState = { author_id: "", author_name: "", nationality: "" };

function matchesAuthor(row: Author, query: string): boolean {
  return (
    row.AUTHOR_ID.toLowerCase().includes(query) ||
    row.AUTHOR_NAME.toLowerCase().includes(query) ||
    (row.NATIONALITY ?? "").toLowerCase().includes(query)
  );
}

export default function AuthorsPage() {
  const [rows, setRows] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { query, setQuery, page, setPage, totalPages, pageRows, totalCount } = useTableControls(
    rows,
    matchesAuthor
  );

  useEffect(() => {
    let active = true;
    apiGet<Author[]>("/api/authors")
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

  async function refresh() {
    const data = await apiGet<Author[]>("/api/authors");
    setRows(data);
  }

  function openCreate() {
    setForm(emptyForm);
    setFormError(null);
    setModalMode("create");
  }

  function openEdit(row: Author) {
    setForm({
      author_id: row.AUTHOR_ID,
      author_name: row.AUTHOR_NAME,
      nationality: row.NATIONALITY ?? "",
    });
    setFormError(null);
    setModalMode("edit");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        author_id: form.author_id,
        author_name: form.author_name,
        nationality: form.nationality || null,
      };
      const result =
        modalMode === "create"
          ? await apiSend("/api/authors", "POST", payload)
          : await apiSend(`/api/authors/${form.author_id}`, "PUT", payload);

      if (!result.success) {
        throw new Error(result.error ?? "Request failed");
      }

      setModalMode(null);
      await refresh();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(row: Author) {
    if (!confirm(`Delete author "${row.AUTHOR_NAME}"?`)) return;
    try {
      const result = await apiSend(`/api/authors/${row.AUTHOR_ID}`, "DELETE");
      if (!result.success) {
        throw new Error(result.error ?? "Delete failed");
      }
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const columns: Column<Author>[] = [
    { header: "ID", accessor: (r) => r.AUTHOR_ID },
    { header: "Name", accessor: (r) => r.AUTHOR_NAME },
    { header: "Nationality", accessor: (r) => r.NATIONALITY ?? "—" },
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
    <PageShell title="Authors" description="All authors in the catalogue" loading={loading} error={error}>
      <div className="mb-4">
        <button className={primaryButtonClass} onClick={openCreate}>
          + Add Author
        </button>
      </div>
      <TableControls
        query={query}
        onQueryChange={setQuery}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={totalCount}
        placeholder="Search authors..."
      />
      <DataTable columns={columns} rows={pageRows} getKey={(r) => r.AUTHOR_ID} />

      {modalMode && (
        <Modal title={modalMode === "create" ? "Add Author" : "Edit Author"} onClose={() => setModalMode(null)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Author ID">
              <input
                className={inputClass}
                value={form.author_id}
                onChange={(e) => setForm({ ...form, author_id: e.target.value })}
                disabled={modalMode === "edit"}
                required
              />
            </Field>
            <Field label="Author Name">
              <input
                className={inputClass}
                value={form.author_name}
                onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                required
              />
            </Field>
            <Field label="Nationality">
              <input
                className={inputClass}
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
              />
            </Field>

            {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

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
