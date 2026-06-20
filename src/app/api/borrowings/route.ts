import { NextRequest, NextResponse } from "next/server";
import { executeQuery, executeTransaction, sweepOverdueBorrowings } from "@/lib/db";
import { toFriendlyMessage } from "@/lib/errors";
import { createWithIdRetry } from "@/lib/retryCreate";
import type { ApiResponse, BorrowingDetail, CreateBorrowingPayload } from "@/types";

// GET /api/borrowings — list all borrowings with member/book/librarian names
export async function GET() {
  try {
    await sweepOverdueBorrowings();
    const rows = await executeQuery<BorrowingDetail>(`
      SELECT br.BORROW_ID, br.MEMBER_ID, br.BOOK_ID, br.LIBRARIAN_ID,
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
      ORDER BY br.BORROW_DATE DESC
    `);
    return NextResponse.json<ApiResponse<BorrowingDetail[]>>({ success: true, data: rows });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}

// POST /api/borrowings — create a borrowing. AVAILABLE_COPIES is decremented
// (and the "no copies left" rule enforced) by trg_borrowing_after_insert
// in the database — see sql/bayu_library_FULL.sql.
export async function POST(request: NextRequest) {
  try {
    const body: CreateBorrowingPayload = await request.json();
    const { member_id, book_id, librarian_id, borrow_date, due_date } = body;

    if (!member_id || !book_id || !librarian_id || !borrow_date || !due_date) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { ids, reassigned } = await createWithIdRetry({ borrow_id: "borrowing" }, async (ids) => {
      await executeTransaction(async (conn) => {
        await conn.execute(
          `INSERT INTO BORROWING (BORROW_ID, MEMBER_ID, BOOK_ID, LIBRARIAN_ID, BORROW_DATE, DUE_DATE, FINE_AMOUNT, STATUS)
           VALUES (:1, :2, :3, :4, TO_DATE(:5, 'YYYY-MM-DD'), TO_DATE(:6, 'YYYY-MM-DD'), 0, 'BORROWED')`,
          [ids.borrow_id, member_id, book_id, librarian_id, borrow_date, due_date]
        );
      });
    });

    return NextResponse.json<ApiResponse<{ borrow_id: string; reassigned: boolean }>>(
      { success: true, message: "Borrowing created", data: { borrow_id: ids.borrow_id, reassigned } },
      { status: 201 }
    );
  } catch (err) {
    const notAvailable = err instanceof Error && /ORA-20001/.test(err.message);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: notAvailable ? 409 : 500 }
    );
  }
}
