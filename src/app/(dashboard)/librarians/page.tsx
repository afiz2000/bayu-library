"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/apiClient";
import PageShell from "@/components/PageShell";
import DataTable, { Column } from "@/components/DataTable";
import TableControls from "@/components/TableControls";
import Modal from "@/components/Modal";
import { Field, inputClass, primaryButtonClass, secondaryButtonClass, dangerLinkClass, editLinkClass } from "@/components/FormField";
import { useTableControls } from "@/lib/useTableControls";
import type { LibrarianDetail } from "@/types";

function matchesLibrarian(row: LibrarianDetail, query: string): boolean {
  return (
    row.LIBRARIAN_ID.toLowerCase().includes(query) ||
    row.FULL_NAME.toLowerCase().includes(query) ||
    row.EMAIL.toLowerCase().includes(query) ||
    row.STAFF_ID.toLowerCase().includes(query) ||
    row.POSITION.toLowerCase().includes(query)
  );
}

interface FormState {
  person_id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  gender: "M" | "F";
  librarian_id: string;
  staff_id: string;
  position: string;
}

const emptyForm: FormState = {
  person_id: "",
  full_name: "",
  email: "",
  phone: "",
  address: "",
  gender: "M",
  librarian_id: "",
  staff_id: "",
  position: "",
};

export default function LibrariansPage() {
  const [rows, setRows] = useState<LibrarianDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { query, setQuery, page, setPage, totalPages, pageRows, totalCount } = useTableControls(
    rows,
    matchesLibrarian
  );

  useEffect(() => {
    let active = true;
    apiGet<LibrarianDetail[]>("/api/librarians")
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
    const data = await apiGet<LibrarianDetail[]>("/api/librarians");
    setRows(data);
  }

  async function openCreate() {
    setFormError(null);
    try {
      const [{ id: personId }, { id: librarianId }] = await Promise.all([
        apiGet<{ id: string }>("/api/next-id/person"),
        apiGet<{ id: string }>("/api/next-id/librarian"),
      ]);
      setForm({ ...emptyForm, person_id: personId, librarian_id: librarianId });
      setModalMode("create");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function openEdit(row: LibrarianDetail) {
    setForm({
      person_id: row.PERSON_ID,
      full_name: row.FULL_NAME,
      email: row.EMAIL,
      phone: row.PHONE ?? "",
      address: row.ADDRESS ?? "",
      gender: row.GENDER,
      librarian_id: row.LIBRARIAN_ID,
      staff_id: row.STAFF_ID,
      position: row.POSITION,
    });
    setFormError(null);
    setModalMode("edit");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      let result;
      if (modalMode === "create") {
        result = await apiSend("/api/librarians", "POST", {
          person_id: form.person_id,
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || undefined,
          address: form.address || undefined,
          gender: form.gender,
          librarian_id: form.librarian_id,
          staff_id: form.staff_id,
          position: form.position,
        });
      } else {
        result = await apiSend(`/api/librarians/${form.librarian_id}`, "PUT", {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || undefined,
          address: form.address || undefined,
          staff_id: form.staff_id,
          position: form.position,
        });
      }

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

  async function handleDelete(row: LibrarianDetail) {
    if (!confirm(`Delete librarian "${row.FULL_NAME}"?`)) return;
    try {
      const result = await apiSend(`/api/librarians/${row.LIBRARIAN_ID}`, "DELETE");
      if (!result.success) {
        throw new Error(result.error ?? "Delete failed");
      }
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const columns: Column<LibrarianDetail>[] = [
    { header: "Librarian ID", accessor: (r) => r.LIBRARIAN_ID },
    { header: "Name", accessor: (r) => r.FULL_NAME },
    { header: "Email", accessor: (r) => r.EMAIL },
    { header: "Staff ID", accessor: (r) => r.STAFF_ID },
    { header: "Position", accessor: (r) => r.POSITION },
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
    <PageShell title="Librarians" description="Library staff accounts" loading={loading} error={error}>
      <div className="mb-4">
        <button className={primaryButtonClass} onClick={openCreate}>
          + Add Librarian
        </button>
      </div>
      <TableControls
        query={query}
        onQueryChange={setQuery}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={totalCount}
        placeholder="Search librarians..."
      />
      <DataTable columns={columns} rows={pageRows} getKey={(r) => r.LIBRARIAN_ID} />

      {modalMode && (
        <Modal title={modalMode === "create" ? "Add Librarian" : "Edit Librarian"} onClose={() => setModalMode(null)}>
          <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
            {modalMode === "create" && (
              <>
                <Field label="Person ID">
                  <input className={inputClass} value={form.person_id} disabled required />
                </Field>
                <Field label="Gender">
                  <select
                    className={inputClass}
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as "M" | "F" })}
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </Field>
                <Field label="Librarian ID">
                  <input className={inputClass} value={form.librarian_id} disabled required />
                </Field>
              </>
            )}

            <Field label="Full Name">
              <input
                className={inputClass}
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </Field>
            <Field label="Phone">
              <input
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Address">
              <input
                className={inputClass}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
            <Field label="Staff ID">
              <input
                className={inputClass}
                value={form.staff_id}
                onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
                required
              />
            </Field>
            <Field label="Position">
              <input
                className={inputClass}
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                required
              />
            </Field>

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
