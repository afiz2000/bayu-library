"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderTree,
  PenLine,
  Users,
  UserCog,
  BookOpen,
  ArrowLeftRight,
  Clock,
  type LucideIcon,
} from "lucide-react";
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
      <h1 className="text-2xl font-semibold text-navy">Dashboard</h1>
      <p className="mt-1 text-sm text-navy/60">
        Bayu Library Management System — overview
      </p>

      {error && (
        <p className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load stats: {error}
        </p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {!stats && !error && Array.from({ length: 7 }).map((_, i) => <StatCardSkeleton key={i} />)}

        {stats && (
          <>
            <StatCard href="/categories" label="Categories" value={stats.categories} icon={FolderTree} />
            <StatCard href="/authors" label="Authors" value={stats.authors} icon={PenLine} />
            <StatCard href="/members" label="Members" value={stats.members} icon={Users} />
            <StatCard href="/librarians" label="Librarians" value={stats.librarians} icon={UserCog} />
            <StatCard href="/books" label="Books" value={stats.books} icon={BookOpen} />
            <StatCard href="/borrowings" label="Total Borrowings" value={stats.borrowings} icon={ArrowLeftRight} />
            <StatCard href="/borrowings" label="Active Borrowings" value={stats.activeBorrowings} icon={Clock} />
          </>
        )}
      </div>
    </main>
  );
}

function StatCard({
  href,
  label,
  value,
  icon: Icon,
}: {
  href: string;
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group animate-scale-in rounded-lg border border-t-4 border-navy/10 border-t-gold bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-navy/25 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-navy/60">{label}</p>
        <Icon className="h-4 w-4 text-gold-dark transition-transform duration-200 group-hover:scale-110" strokeWidth={2} />
      </div>
      <p className="mt-2 text-3xl font-semibold text-navy">{value}</p>
    </Link>
  );
}

function StatCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-t-4 border-navy/10 border-t-gold/40 bg-white p-5 shadow-sm">
      <div className="h-4 w-20 rounded bg-navy/10" />
      <div className="mt-3 h-8 w-12 rounded bg-navy/10" />
    </div>
  );
}
