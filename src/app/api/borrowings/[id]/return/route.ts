import oracledb from "oracledb";
import { NextRequest, NextResponse } from "next/server";
import { executeTransaction } from "@/lib/db";
import { toFriendlyMessage } from "@/lib/errors";
import type { ApiResponse, ReturnBookPayload } from "@/types";

// POST /api/borrowings/:id/return — mark a borrowing as returned and
// auto-calculate the fine via fn_calculate_fine (RM1/day late). Restocking
// AVAILABLE_COPIES is handled by trg_borrowing_after_return in the database
// — see sql/bayu_library_FULL.sql.
export async function POST(
  request: NextRequest,
  { params }: RouteContext<"/api/borrowings/[id]/return">
) {
  const { id } = await params;
  try {
    const body: ReturnBookPayload = await request.json();
    const { return_date } = body;

    if (!return_date) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "return_date is required" },
        { status: 400 }
      );
    }

    let fineAmount = 0;

    await executeTransaction(async (conn) => {
      const updateResult = await conn.execute(
        `UPDATE BORROWING SET
           RETURN_DATE = TO_DATE(:1, 'YYYY-MM-DD'),
           FINE_AMOUNT = fn_calculate_fine(DUE_DATE, TO_DATE(:2, 'YYYY-MM-DD')),
           STATUS = 'RETURNED'
         WHERE BORROW_ID = :3 AND STATUS != 'RETURNED'`,
        [return_date, return_date, id]
      );

      if (updateResult.rowsAffected === 0) {
        throw new Error("Borrowing not found or already returned");
      }

      const fineResult = await conn.execute<{ FINE_AMOUNT: number }>(
        `SELECT FINE_AMOUNT FROM BORROWING WHERE BORROW_ID = :1`,
        [id],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      fineAmount = fineResult.rows?.[0]?.FINE_AMOUNT ?? 0;
    });

    return NextResponse.json<ApiResponse<{ fine_amount: number }>>({
      success: true,
      message: "Book returned",
      data: { fine_amount: fineAmount },
    });
  } catch (err) {
    const conflict = err instanceof Error && err.message === "Borrowing not found or already returned";
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: conflict ? "This borrowing was not found or is already returned." : toFriendlyMessage(err) },
      { status: conflict ? 409 : 500 }
    );
  }
}
