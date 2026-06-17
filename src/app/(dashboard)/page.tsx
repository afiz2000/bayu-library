"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/apiClient";
import type {
  Author,
  BookDetail,
  BorrowingDetail,
  CategoryDetail,
  LibrarianDetail,
  MemberDetail,
} from "@/types";

interface Stats {
  categories: number;
  authors: number;
  members: number;
  librarians: number;
  books: number;
  borrowings: number;
  activeBorrowings: number;
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<CategoryDetail[]>("/api/categories"),
      apiGet<Author[]>("/api/authors"),
      apiGet<MemberDetail[]>("/api/members"),
      apiGet<LibrarianDetail[]>("/api/librarians"),
      apiGet<BookDetail[]>("/api/books"),
      apiGet<BorrowingDetail[]>("/api/borrowings"),
    ])
      .then(([categories, authors, members, librarians, books, borrowings]) => {
        setStats({
          categories: categories.length,
          authors: authors.length,
          members: members.length,
          librarians: librarians.length,
          books: books.length,
          borrowings: borrowings.length,
          activeBorrowings: borrowings.filter((b) => b.STATUS !== "RETURNED").length,
        });
      })
      .catch((err) => setError((err as Error).message));
  }, []);

  return (
    <main className="flex-1 px-10 py-10">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Bayu Library Management System — overview
      </p>

      {error && (
        <p className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Failed to load stats: {error}
        </p>
      )}

      {!stats && !error && (
        <p className="mt-6 text-sm text-zinc-500">Loading...</p>
      )}

      {stats && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard href="/categories" label="Categories" value={stats.categories} />
          <StatCard href="/authors" label="Authors" value={stats.authors} />
          <StatCard href="/members" label="Members" value={stats.members} />
          <StatCard href="/librarians" label="Librarians" value={stats.librarians} />
          <StatCard href="/books" label="Books" value={stats.books} />
          <StatCard href="/borrowings" label="Total Borrowings" value={stats.borrowings} />
          <StatCard href="/borrowings" label="Active Borrowings" value={stats.activeBorrowings} />
        </div>
      )}
    </main>
  );
}

function StatCard({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-black/[.08] bg-white p-5 transition-colors hover:border-black/[.2] dark:border-white/[.145] dark:bg-zinc-900 dark:hover:border-white/[.3]"
    >
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">{value}</p>
    </Link>
  );
}
