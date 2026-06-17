import { NextRequest, NextResponse } from "next/server";
import { executeQuery, sweepOverdueBorrowings } from "@/lib/db";
import { toFriendlyMessage } from "@/lib/errors";
import type { ApiResponse, BorrowingDetail } from "@/types";

// GET /api/borrowings/:id
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/api/borrowings/[id]">
) {
  const { id } = await params;
  try {
    await sweepOverdueBorrowings();
    const rows = await executeQuery<BorrowingDetail>(
      `SELECT br.BORROW_ID, br.MEMBER_ID, br.BOOK_ID, br.LIBRARIAN_ID,
              br.BORROW_DATE, br.DUE_DATE, br.RETURN_DATE, br.FINE_AMOUNT, br.STATUS,
              pm.FULL_NAME AS MEMBER_NAME,
              bk.TITLE AS BOOK_TITLE,
              pl.FULL_NAME AS LIBRARIAN_NAME
       FROM BORROWING br
       JOIN MEMBER m ON br.MEMBER_ID = m.MEMBER_ID
       JOIN PERSON pm ON m.PERSON_ID = pm.PERSON_ID
       JOIN BOOK bk ON br.BOOK_ID = bk.BOOK_ID
       JOIN LIBRARIAN l ON br.LIBRARIAN_ID = l.LIBRARIAN_ID
       JOIN PERSON pl ON l.PERSON_ID = pl.PERSON_ID
       WHERE br.BORROW_ID = :1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Borrowing not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<BorrowingDetail>>({ success: true, data: rows[0] });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}
