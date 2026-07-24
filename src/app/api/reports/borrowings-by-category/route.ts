import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { toFriendlyMessage } from "@/lib/errors";
import type { ApiResponse, CategoryBorrowingCount } from "@/types";

// GET /api/reports/borrowings-by-category — number of borrowings per book
// category, joining BORROWING -> BOOK -> CATEGORY. Powers the Dashboard's
// "Borrowings by Category" chart.
export async function GET() {
  try {
    const rows = await executeQuery<CategoryBorrowingCount>(`
      SELECT ca.CATEGORY_NAME, COUNT(br.BORROW_ID) AS BORROW_COUNT
      FROM BORROWING br
      JOIN BOOK bk ON br.BOOK_ID = bk.BOOK_ID
      JOIN CATEGORY ca ON bk.CATEGORY_ID = ca.CATEGORY_ID
      GROUP BY ca.CATEGORY_NAME
      ORDER BY BORROW_COUNT DESC
    `);
    return NextResponse.json<ApiResponse<CategoryBorrowingCount[]>>({ success: true, data: rows });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}
