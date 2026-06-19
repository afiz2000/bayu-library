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
      <header className="flex items-center justify-between bg-navy px-10 py-4">
        <div>
          <p className="text-lg font-bold tracking-wide text-white">
            BAYU <span className="text-gold">LIBRARY</span>
          </p>
          {member && (
            <p className="text-xs text-gold-light">Welcome, {member.fullName}</p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
        >
          Logout
        </button>
      </header>
      {children}
    </div>
  );
}
