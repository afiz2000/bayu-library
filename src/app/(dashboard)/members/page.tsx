"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/apiClient";
import PageShell from "@/components/PageShell";
import DataTable, { Column } from "@/components/DataTable";
import Modal from "@/components/Modal";
import { Field, inputClass, primaryButtonClass, secondaryButtonClass, dangerLinkClass, editLinkClass } from "@/components/FormField";
import type { MemberDetail } from "@/types";

interface FormState {
  person_id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  gender: "M" | "F";
  member_id: string;
  membership_date: string;
  membership_type: "STANDARD" | "PREMIUM";
  status: "ACTIVE" | "INACTIVE";
}

const emptyForm: FormState = {
  person_id: "",
  full_name: "",
  email: "",
  phone: "",
  address: "",
  gender: "M",
  member_id: "",
  membership_date: new Date().toISOString().slice(0, 10),
  membership_type: "STANDARD",
  status: "ACTIVE",
};

const columns: Column<MemberDetail>[] = [
  { header: "Member ID", accessor: (r) => r.MEMBER_ID },
  { header: "Name", accessor: (r) => r.FULL_NAME },
  { header: "Email", accessor: (r) => r.EMAIL },
  { header: "Phone", accessor: (r) => r.PHONE ?? "—" },
  { header: "Type", accessor: (r) => r.MEMBERSHIP_TYPE },
  {
    header: "Status",
    accessor: (r) => (
      <span
        className={
          r.STATUS === "ACTIVE"
            ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300"
            : "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        }
      >
        {r.STATUS}
      </span>
    ),
  },
  { header: "Joined", accessor: (r) => new Date(r.MEMBERSHIP_DATE).toLocaleDateString() },
];

export default function MembersPage() {
  const [rows, setRows] = useState<MemberDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    apiGet<MemberDetail[]>("/api/members")
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
    const data = await apiGet<MemberDetail[]>("/api/members");
    setRows(data);
  }

  function openCreate() {
    setForm(emptyForm);
    setFormError(null);
    setModalMode("create");
  }

  function openEdit(row: MemberDetail) {
    setForm({
      person_id: row.PERSON_ID,
      full_name: row.FULL_NAME,
      email: row.EMAIL,
      phone: row.PHONE ?? "",
      address: row.ADDRESS ?? "",
      gender: row.GENDER,
      member_id: row.MEMBER_ID,
      membership_date: new Date(row.MEMBERSHIP_DATE).toISOString().slice(0, 10),
      membership_type: row.MEMBERSHIP_TYPE,
      status: row.STATUS,
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
        result = await apiSend("/api/members", "POST", {
          person_id: form.person_id,
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || undefined,
          address: form.address || undefined,
          gender: form.gender,
          member_id: form.member_id,
          membership_date: form.membership_date,
          membership_type: form.membership_type,
          status: form.status,
        });
      } else {
        result = await apiSend(`/api/members/${form.member_id}`, "PUT", {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || undefined,
          address: form.address || undefined,
          membership_type: form.membership_type,
          status: form.status,
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

  async function handleDelete(row: MemberDetail) {
    if (!confirm(`Delete member "${row.FULL_NAME}"?`)) return;
    try {
      const result = await apiSend(`/api/members/${row.MEMBER_ID}`, "DELETE");
      if (!result.success) {
        throw new Error(result.error ?? "Delete failed");
      }
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const tableColumns: Column<MemberDetail>[] = [
    ...columns,
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
    <PageShell title="Members" description="Registered library members" loading={loading} error={error}>
      <div className="mb-4">
        <button className={primaryButtonClass} onClick={openCreate}>
          + Add Member
        </button>
      </div>
      <DataTable columns={tableColumns} rows={rows} getKey={(r) => r.MEMBER_ID} />

      {modalMode && (
        <Modal title={modalMode === "create" ? "Add Member" : "Edit Member"} onClose={() => setModalMode(null)}>
          <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
            {modalMode === "create" && (
              <>
                <Field label="Person ID">
                  <input
                    className={inputClass}
                    value={form.person_id}
                    onChange={(e) => setForm({ ...form, person_id: e.target.value })}
                    required
                  />
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
                <Field label="Member ID">
                  <input
                    className={inputClass}
                    value={form.member_id}
                    onChange={(e) => setForm({ ...form, member_id: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Membership Date">
                  <input
                    type="date"
                    className={inputClass}
                    value={form.membership_date}
                    onChange={(e) => setForm({ ...form, membership_date: e.target.value })}
                    required
                  />
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
            <Field label="Membership Type">
              <select
                className={inputClass}
                value={form.membership_type}
                onChange={(e) => setForm({ ...form, membership_type: e.target.value as "STANDARD" | "PREMIUM" })}
              >
                <option value="STANDARD">Standard</option>
                <option value="PREMIUM">Premium</option>
              </select>
            </Field>
            <Field label="Status">
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as "ACTIVE" | "INACTIVE" })}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
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
