"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { inputClass, primaryButtonClass } from "@/components/FormField";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: staffId, password }),
      });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error ?? "Login failed");
      }
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-gold-light/20 px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-lg border-t-4 border-gold bg-white shadow-sm">
        <div className="bg-navy px-8 py-6">
          <p className="text-xl font-bold tracking-wide text-white">BAYU</p>
          <p className="-mt-1 text-sm font-medium tracking-[0.2em] text-gold">LIBRARY</p>
        </div>
        <div className="px-8 py-6">
          <p className="text-sm text-navy/60">Staff sign in</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-navy">Staff ID</span>
              <input
                className={inputClass}
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="STF-2020-001"
                required
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-navy">Password</span>
              <input
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" className={primaryButtonClass} disabled={submitting}>
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
