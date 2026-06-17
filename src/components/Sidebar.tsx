"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionPayload } from "@/lib/session";

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
  const [user, setUser] = useState<SessionPayload | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setUser(result.data);
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
          onClick={handleLogout}
          className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-black/[.05] dark:text-zinc-300 dark:hover:bg-white/[.08]"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
