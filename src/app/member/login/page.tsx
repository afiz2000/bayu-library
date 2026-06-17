"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { inputClass, primaryButtonClass } from "@/components/FormField";

function MemberLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/member-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error ?? "Login failed");
      }
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/member") ? next : "/member");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-lg border border-black/[.08] bg-white p-8 shadow-sm dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">Bayu Library</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Member sign in</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Email</span>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Password</span>
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button type="submit" className={primaryButtonClass} disabled={submitting}>
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function MemberLoginPage() {
  return (
    <Suspense>
      <MemberLoginForm />
    </Suspense>
  );
}
