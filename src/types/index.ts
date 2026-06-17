// src/types/index.ts
// ============================================================
// TypeScript Interfaces — Bayu Library Management System
// Setiap interface match dengan table dalam Oracle
// ============================================================

// ============================================================
// PERSON (Supertype)
// ============================================================
export interface Person {
  PERSON_ID: string;
  FULL_NAME: string;
  EMAIL: string;
  PHONE: string | null;
  ADDRESS: string | null;
  GENDER: "M" | "F";
  PERSON_TYPE: "MEMBER" | "LIBRARIAN";
}

// ============================================================
// MEMBER (Subtype)
// ============================================================
export interface Member {
  MEMBER_ID: string;
  PERSON_ID: string;
  MEMBERSHIP_DATE: Date;
  MEMBERSHIP_TYPE: "STANDARD" | "PREMIUM";
  STATUS: "ACTIVE" | "INACTIVE";
}

// Member + PERSON data (JOIN result)
export interface MemberDetail extends Member {
  FULL_NAME: string;
  EMAIL: string;
  PHONE: string | null;
  ADDRESS: string | null;
  GENDER: "M" | "F";
}

// ============================================================
// LIBRARIAN (Subtype)
// ============================================================
export interface Librarian {
  LIBRARIAN_ID: string;
  PERSON_ID: string;
  STAFF_ID: string;
  POSITION: string;
}

// Librarian + PERSON data (JOIN result)
export interface LibrarianDetail extends Librarian {
  FULL_NAME: string;
  EMAIL: string;
  PHONE: string | null;
  ADDRESS: string | null;
  GENDER: "M" | "F";
}

// ============================================================
// CATEGORY
// ============================================================
export interface Category {
  CATEGORY_ID: string;
  CATEGORY_NAME: string;
  PARENT_ID: string | null;
}

// Category dengan parent name (JOIN result)
export interface CategoryDetail extends Category {
  PARENT_NAME: string | null;
}

// ============================================================
// AUTHOR
// ============================================================
export interface Author {
  AUTHOR_ID: string;
  AUTHOR_NAME: string;
  NATIONALITY: string | null;
}

// ============================================================
// BOOK
// ============================================================
export interface Book {
  BOOK_ID: string;
  CATEGORY_ID: string;
  TITLE: string;
  ISBN: string;
  PUBLISH_YEAR: number;
  PUBLISHER: string | null;
  TOTAL_COPIES: number;
  AVAILABLE_COPIES: number;
}

// Book dengan category name dan authors (JOIN result)
export interface BookDetail extends Book {
  CATEGORY_NAME: string;
  AUTHORS: string; // comma-separated author names
}

// ============================================================
// BOOK_AUTHOR (Bridge)
// ============================================================
export interface BookAuthor {
  BOOK_ID: string;
  AUTHOR_ID: string;
}

// ============================================================
// BORROWING
// ============================================================
export interface Borrowing {
  BORROW_ID: string;
  MEMBER_ID: string;
  BOOK_ID: string;
  LIBRARIAN_ID: string;
  BORROW_DATE: Date;
  DUE_DATE: Date;
  RETURN_DATE: Date | null;
  FINE_AMOUNT: number;
  STATUS: "BORROWED" | "RETURNED" | "OVERDUE";
}

// Borrowing dengan semua detail (JOIN result)
export interface BorrowingDetail extends Borrowing {
  MEMBER_NAME: string;
  BOOK_TITLE: string;
  LIBRARIAN_NAME: string;
}

// ============================================================
// API Response Wrapper
// ============================================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ============================================================
// Form Payloads (untuk POST/PUT request body)
// ============================================================
export interface CreateMemberPayload {
  // PERSON fields
  person_id: string;
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  gender: "M" | "F";
  // MEMBER fields
  member_id: string;
  membership_date: string; // ISO date string
  membership_type: "STANDARD" | "PREMIUM";
  status: "ACTIVE" | "INACTIVE";
}

export interface UpdateMemberPayload {
  full_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  membership_type?: "STANDARD" | "PREMIUM";
  status?: "ACTIVE" | "INACTIVE";
}

export interface CreateLibrarianPayload {
  // PERSON fields
  person_id: string;
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  gender: "M" | "F";
  // LIBRARIAN fields
  librarian_id: string;
  staff_id: string;
  position: string;
}

export interface UpdateLibrarianPayload {
  full_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  staff_id?: string;
  position?: string;
}

export interface CreateBookPayload {
  book_id: string;
  category_id: string;
  title: string;
  isbn: string;
  publish_year: number;
  publisher?: string;
  total_copies: number;
  available_copies: number;
  author_ids: string[]; // untuk BOOK_AUTHOR
}

export interface UpdateBookPayload {
  category_id?: string;
  title?: string;
  isbn?: string;
  publish_year?: number;
  publisher?: string;
  total_copies?: number;
  available_copies?: number;
}

export interface CreateBorrowingPayload {
  borrow_id: string;
  member_id: string;
  book_id: string;
  librarian_id: string;
  borrow_date: string;
  due_date: string;
}

export interface ReturnBookPayload {
  return_date: string;
}
