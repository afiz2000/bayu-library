"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LibrarianSession } from "@/lib/session";
import Modal from "@/components/Modal";
import { Field, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/FormField";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/categories", label: "Categories" },
  { href: "/authors", label: "Authors" },
  { href: "/members", label: "Members" },
  { href: "/librarians", label: "Librarians" },
  { href: "/books", label: "Books" },
  { href: "/borrowings", label: "Borrowings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<LibrarianSession | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data.role === "LIBRARIAN") setUser(result.data);
      });
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-black/[.08] bg-zinc-50 px-4 py-6 dark:border-white/[.145] dark:bg-zinc-950">
      <h1 className="mb-6 px-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Bayu Library
      </h1>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-zinc-700 hover:bg-black/[.05] dark:text-zinc-300 dark:hover:bg-white/[.08]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-black/[.08] pt-4 dark:border-white/[.145]">
        {user && (
          <div className="mb-2 px-2">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{user.fullName}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.position}</p>
          </div>
        )}
        <button
          onClick={() => setShowPasswordModal(true)}
          className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-black/[.05] dark:text-zinc-300 dark:hover:bg-white/[.08]"
        >
          Change Password
        </button>
        <button
          onClick={handleLogout}
          className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-black/[.05] dark:text-zinc-300 dark:hover:bg-white/[.08]"
        >
          Logout
        </button>
      </div>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </aside>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error ?? "Failed to change password");
      }
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Change Password" onClose={onClose}>
      {success ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-green-700 dark:text-green-400">
            Password updated. Use your new password next time you sign in.
          </p>
          <div className="flex justify-end">
            <button className={primaryButtonClass} onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Current Password">
            <input
              type="password"
              className={inputClass}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </Field>
          <Field label="New Password">
            <input
              type="password"
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </Field>
          <Field label="Confirm New Password">
            <input
              type="password"
              className={inputClass}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </Field>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" className={secondaryButtonClass} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={primaryButtonClass} disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
