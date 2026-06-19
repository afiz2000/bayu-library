"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { inputClass, primaryButtonClass } from "@/components/FormField";
import LogoBadge from "@/components/LogoBadge";

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
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#fffefb] px-4">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full border-[10px] border-navy/[.06]" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full border-[10px] border-gold/15" />

      <div className="relative w-full max-w-sm rounded-lg border-t-4 border-gold bg-white px-8 pt-2 pb-8 shadow-sm">
        <div className="flex flex-col items-center gap-2 pt-6 pb-4 text-center">
          <LogoBadge size={84} />
          <div>
            <p className="text-lg font-bold tracking-wide text-navy">BAYU LIBRARY</p>
            <p className="text-[10px] font-semibold tracking-[0.25em] text-gold-dark">READ &middot; LEARN &middot; GROW</p>
          </div>
        </div>

        <div>
          <p className="text-center text-sm text-navy/60">Member sign in</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-navy">Email</span>
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

export default function MemberLoginPage() {
  return (
    <Suspense>
      <MemberLoginForm />
    </Suspense>
  );
}
