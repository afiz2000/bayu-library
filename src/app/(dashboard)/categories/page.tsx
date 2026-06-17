"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/apiClient";
import PageShell from "@/components/PageShell";
import DataTable, { Column } from "@/components/DataTable";
import TableControls from "@/components/TableControls";
import Modal from "@/components/Modal";
import { Field, inputClass, primaryButtonClass, secondaryButtonClass, dangerLinkClass, editLinkClass } from "@/components/FormField";
import { useTableControls } from "@/lib/useTableControls";
import type { CategoryDetail } from "@/types";

interface FormState {
  category_id: string;
  category_name: string;
  parent_id: string;
}

const emptyForm: FormState = { category_id: "", category_name: "", parent_id: "" };

function matchesCategory(row: CategoryDetail, query: string): boolean {
  return (
    row.CATEGORY_ID.toLowerCase().includes(query) ||
    row.CATEGORY_NAME.toLowerCase().includes(query) ||
    (row.PARENT_NAME ?? "").toLowerCase().includes(query)
  );
}

export default function CategoriesPage() {
  const [rows, setRows] = useState<CategoryDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { query, setQuery, page, setPage, totalPages, pageRows, totalCount } = useTableControls(
    rows,
    matchesCategory
  );

  useEffect(() => {
    let active = true;
    apiGet<CategoryDetail[]>("/api/categories")
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
    const data = await apiGet<CategoryDetail[]>("/api/categories");
    setRows(data);
  }

  function openCreate() {
    setForm(emptyForm);
    setFormError(null);
    setModalMode("create");
  }

  function openEdit(row: CategoryDetail) {
    setForm({
      category_id: row.CATEGORY_ID,
      category_name: row.CATEGORY_NAME,
      parent_id: row.PARENT_ID ?? "",
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
        category_id: form.category_id,
        category_name: form.category_name,
        parent_id: form.parent_id || null,
      };
      const result =
        modalMode === "create"
          ? await apiSend("/api/categories", "POST", payload)
          : await apiSend(`/api/categories/${form.category_id}`, "PUT", payload);

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

  async function handleDelete(row: CategoryDetail) {
    if (!confirm(`Delete category "${row.CATEGORY_NAME}"?`)) return;
    try {
      const result = await apiSend(`/api/categories/${row.CATEGORY_ID}`, "DELETE");
      if (!result.success) {
        throw new Error(result.error ?? "Delete failed");
      }
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const columns: Column<CategoryDetail>[] = [
    { header: "ID", accessor: (r) => r.CATEGORY_ID },
    { header: "Name", accessor: (r) => r.CATEGORY_NAME },
    { header: "Parent Category", accessor: (r) => r.PARENT_NAME ?? "—" },
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
    <PageShell title="Categories" description="Book categories and their parent/child relationships" loading={loading} error={error}>
      <div className="mb-4">
        <button className={primaryButtonClass} onClick={openCreate}>
          + Add Category
        </button>
      </div>
      <TableControls
        query={query}
        onQueryChange={setQuery}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={totalCount}
        placeholder="Search categories..."
      />
      <DataTable columns={columns} rows={pageRows} getKey={(r) => r.CATEGORY_ID} />

      {modalMode && (
        <Modal title={modalMode === "create" ? "Add Category" : "Edit Category"} onClose={() => setModalMode(null)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Category ID">
              <input
                className={inputClass}
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                disabled={modalMode === "edit"}
                required
              />
            </Field>
            <Field label="Category Name">
              <input
                className={inputClass}
                value={form.category_name}
                onChange={(e) => setForm({ ...form, category_name: e.target.value })}
                required
              />
            </Field>
            <Field label="Parent Category">
              <select
                className={inputClass}
                value={form.parent_id}
                onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
              >
                <option value="">— None —</option>
                {rows
                  .filter((r) => r.CATEGORY_ID !== form.category_id)
                  .map((r) => (
                    <option key={r.CATEGORY_ID} value={r.CATEGORY_ID}>
                      {r.CATEGORY_NAME}
                    </option>
                  ))}
              </select>
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
