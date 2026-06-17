"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MemberSession } from "@/lib/session";

export default function MemberPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [member, setMember] = useState<MemberSession | null>(null);

  useEffect(() => {
    fetch("/api/member-auth/me")
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data.role === "MEMBER") setMember(result.data);
      });
  }, []);

  async function handleLogout() {
    await fetch("/api/member-auth/logout", { method: "POST" });
    router.push("/member/login");
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-black/[.08] px-10 py-4 dark:border-white/[.145]">
        <div>
          <p className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Bayu Library</p>
          {member && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Welcome, {member.fullName}</p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md border border-black/[.08] px-4 py-2 text-sm font-medium text-zinc-700 dark:border-white/[.145] dark:text-zinc-300"
        >
          Logout
        </button>
      </header>
      {children}
    </div>
  );
}
