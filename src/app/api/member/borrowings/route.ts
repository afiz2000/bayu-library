import { NextRequest, NextResponse } from "next/server";
import { executeQuery, sweepOverdueBorrowings } from "@/lib/db";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { toFriendlyMessage } from "@/lib/errors";
import type { ApiResponse, BorrowingDetail } from "@/types";

// GET /api/member/borrowings — the logged-in member's own borrowing history
export async function GET(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!session || session.role !== "MEMBER") {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

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
       WHERE br.MEMBER_ID = :1
       ORDER BY br.BORROW_DATE DESC`,
      [session.memberId]
    );

    return NextResponse.json<ApiResponse<BorrowingDetail[]>>({ success: true, data: rows });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}
