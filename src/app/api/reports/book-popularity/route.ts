import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { toFriendlyMessage } from "@/lib/errors";
import type { ApiResponse, BookPopularity } from "@/types";

// GET /api/reports/book-popularity — top 5 most-borrowed books, backed by
// vw_book_popularity (see sql/bayu_library_FULL.sql).
export async function GET() {
  try {
    const rows = await executeQuery<BookPopularity>(
      `SELECT BOOK_ID, TITLE, TIMES_BORROWED FROM vw_book_popularity FETCH FIRST 5 ROWS ONLY`
    );
    return NextResponse.json<ApiResponse<BookPopularity[]>>({ success: true, data: rows });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}
