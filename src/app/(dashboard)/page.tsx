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
  TrendingUp,
  PieChart,
  type LucideIcon,
} from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import type {
  Author,
  BookDetail,
  BookPopularity,
  BorrowingDetail,
  CategoryBorrowingCount,
  CategoryDetail,
  LibrarianDetail,
  MemberDetail,
} from "@/types";

const CHART_COLORS = [
  "#c9a468", // gold
  "#14213d", // navy
  "#97783f", // gold-dark
  "#25395f", // navy-light
  "#6b8f8a", // teal
  "#8a4a4a", // maroon
  "#7a6b5b", // taupe
  "#4a6b8a", // slate blue
  "#9a8a4a", // olive
  "#5b4a6b", // plum
];

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
  const [popularity, setPopularity] = useState<BookPopularity[] | null>(null);
  const [byCategory, setByCategory] = useState<CategoryBorrowingCount[] | null>(null);
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

    apiGet<BookPopularity[]>("/api/reports/book-popularity")
      .then(setPopularity)
      .catch(() => setPopularity([]));

    apiGet<CategoryBorrowingCount[]>("/api/reports/borrowings-by-category")
      .then(setByCategory)
      .catch(() => setByCategory([]));
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

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="animate-scale-in rounded-lg border border-t-4 border-navy/10 border-t-gold bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gold-dark" strokeWidth={2} />
            <p className="text-sm font-semibold text-navy">Top 5 Most Borrowed Books</p>
          </div>
          <p className="mt-0.5 text-xs text-navy/50">Powered by the vw_book_popularity database view</p>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-2 text-xs text-navy/60">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gradient-to-r from-gold to-gold-dark" />
            <span>Times borrowed (bar length is proportional to count)</span>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {popularity === null &&
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-6 animate-pulse rounded bg-navy/10" />
              ))}

            {popularity?.length === 0 && (
              <p className="text-sm text-navy/50">No borrowing activity yet.</p>
            )}

            {popularity && popularity.length > 0 && (() => {
              const max = Math.max(...popularity.map((p) => p.TIMES_BORROWED), 1);
              return popularity.map((book) => (
                <div key={book.BOOK_ID} className="flex items-center gap-3 text-sm">
                  <p className="w-40 shrink-0 truncate text-navy/80" title={book.TITLE}>
                    {book.TITLE}
                  </p>
                  <div className="flex-1 rounded-full bg-navy/5">
                    <div
                      className="h-4 rounded-full bg-gradient-to-r from-gold to-gold-dark transition-all duration-500"
                      style={{ width: `${(book.TIMES_BORROWED / max) * 100}%` }}
                    />
                  </div>
                  <p className="w-6 shrink-0 text-right font-semibold text-navy">{book.TIMES_BORROWED}</p>
                </div>
              ));
            })()}
          </div>

          {/* X-axis scale */}
          {popularity && popularity.length > 0 && (() => {
            const max = Math.max(...popularity.map((p) => p.TIMES_BORROWED), 1);
            return (
              <div className="mt-2 flex items-center gap-3 border-t border-navy/10 pt-1.5 text-[10px] text-navy/40">
                <span className="w-40 shrink-0" />
                <div className="relative flex-1">
                  <span className="absolute left-0">0</span>
                  <span className="absolute left-1/2 -translate-x-1/2">{Math.round(max / 2)}</span>
                  <span className="absolute right-0">{max}</span>
                </div>
                <span className="w-6 shrink-0" />
              </div>
            );
          })()}
        </div>

        <BorrowingsByCategoryChart data={byCategory} />
      </div>
    </main>
  );
}

function BorrowingsByCategoryChart({ data }: { data: CategoryBorrowingCount[] | null }) {
  const size = 180;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data?.reduce((sum, c) => sum + c.BORROW_COUNT, 0) ?? 0;

  const slices = data?.reduce<{ offset: number; length: number }[]>((acc, c) => {
    const prevEnd = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].length : 0;
    const length = (c.BORROW_COUNT / total) * circumference;
    acc.push({ offset: prevEnd, length });
    return acc;
  }, []);

  return (
    <div className="animate-scale-in rounded-lg border border-t-4 border-navy/10 border-t-gold bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <PieChart className="h-4 w-4 text-gold-dark" strokeWidth={2} />
        <p className="text-sm font-semibold text-navy">Borrowings by Category</p>
      </div>
      <p className="mt-0.5 text-xs text-navy/50">
        BORROWING &rarr; BOOK &rarr; CATEGORY, grouped and counted live
      </p>

      {data === null && (
        <div className="mt-6 flex justify-center">
          <div className="h-[180px] w-[180px] animate-pulse rounded-full bg-navy/10" />
        </div>
      )}

      {data?.length === 0 && <p className="mt-6 text-sm text-navy/50">No borrowing activity yet.</p>}

      {data && data.length > 0 && (
        <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#14213d0d" strokeWidth={strokeWidth} />
              {data.map((c, i) => {
                const { offset, length } = slices![i];
                return (
                  <circle
                    key={c.CATEGORY_NAME}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-offset}
                    className="transition-all duration-500"
                  />
                );
              })}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold text-navy">{total}</span>
              <span className="text-[10px] text-navy/50">borrowings</span>
            </div>
          </div>

          {/* Legend */}
          <ul className="flex w-full flex-col gap-1.5 text-xs">
            {data.map((c, i) => (
              <li key={c.CATEGORY_NAME} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="flex-1 truncate text-navy/80">{c.CATEGORY_NAME}</span>
                <span className="font-semibold text-navy">{c.BORROW_COUNT}</span>
                <span className="w-10 shrink-0 text-right text-navy/40">
                  {Math.round((c.BORROW_COUNT / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
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
