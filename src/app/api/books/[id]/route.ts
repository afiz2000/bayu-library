import { NextRequest, NextResponse } from "next/server";
import { executeQuery, executeTransaction } from "@/lib/db";
import { toFriendlyMessage } from "@/lib/errors";
import { getLibrarianSession, isManagementPosition } from "@/lib/permissions";
import type { ApiResponse, BookDetail, UpdateBookPayload } from "@/types";

const BOOK_COLUMNS: Record<string, string> = {
  category_id: "CATEGORY_ID",
  title: "TITLE",
  isbn: "ISBN",
  publish_year: "PUBLISH_YEAR",
  publisher: "PUBLISHER",
  total_copies: "TOTAL_COPIES",
  available_copies: "AVAILABLE_COPIES",
};

// GET /api/books/:id
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/api/books/[id]">
) {
  const { id } = await params;
  try {
    const rows = await executeQuery<BookDetail>(
      `SELECT b.BOOK_ID, b.CATEGORY_ID, b.TITLE, b.ISBN, b.PUBLISH_YEAR, b.PUBLISHER,
              b.TOTAL_COPIES, b.AVAILABLE_COPIES,
              c.CATEGORY_NAME,
              (
                SELECT LISTAGG(a.AUTHOR_NAME, ', ') WITHIN GROUP (ORDER BY a.AUTHOR_NAME)
                FROM BOOK_AUTHOR ba
                JOIN AUTHOR a ON ba.AUTHOR_ID = a.AUTHOR_ID
                WHERE ba.BOOK_ID = b.BOOK_ID
              ) AS AUTHORS
       FROM BOOK b
       JOIN CATEGORY c ON b.CATEGORY_ID = c.CATEGORY_ID
       WHERE b.BOOK_ID = :1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Book not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<BookDetail>>({ success: true, data: rows[0] });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}

// PUT /api/books/:id — update BOOK fields; optionally replace author list
export async function PUT(
  request: NextRequest,
  { params }: RouteContext<"/api/books/[id]">
) {
  const { id } = await params;
  try {
    const body: UpdateBookPayload & { author_ids?: string[] } = await request.json();
    const { author_ids, ...fields } = body;

    const entries = Object.entries(fields).filter(([, value]) => value !== undefined);

    await executeTransaction(async (conn) => {
      if (entries.length > 0) {
        const setClause = entries.map(([key], i) => `${BOOK_COLUMNS[key]} = :${i + 1}`).join(", ");
        const binds = [...entries.map(([, value]) => value), id];
        const result = await conn.execute(
          `UPDATE BOOK SET ${setClause} WHERE BOOK_ID = :${entries.length + 1}`,
          binds
        );

        if (result.rowsAffected === 0) {
          throw new Error("Book not found");
        }
      } else {
        const existing = await conn.execute(`SELECT 1 FROM BOOK WHERE BOOK_ID = :1`, [id]);
        if (!existing.rows || existing.rows.length === 0) {
          throw new Error("Book not found");
        }
      }

      if (author_ids) {
        await conn.execute(`DELETE FROM BOOK_AUTHOR WHERE BOOK_ID = :1`, [id]);
        for (const authorId of author_ids) {
          await conn.execute(
            `INSERT INTO BOOK_AUTHOR (BOOK_ID, AUTHOR_ID) VALUES (:1, :2)`,
            [id, authorId]
          );
        }
      }
    });

    return NextResponse.json<ApiResponse<never>>({ success: true, message: "Book updated" });
  } catch (err) {
    const notFound = err instanceof Error && err.message === "Book not found";
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: notFound ? "Book not found" : toFriendlyMessage(err) },
      { status: notFound ? 404 : 500 }
    );
  }
}

// DELETE /api/books/:id — remove BOOK_AUTHOR rows then BOOK
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext<"/api/books/[id]">
) {
  const session = getLibrarianSession(request);
  if (!session || !isManagementPosition(session.position)) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Only a Head or Senior Librarian can delete records." },
      { status: 403 }
    );
  }

  const { id } = await params;
  try {
    await executeTransaction(async (conn) => {
      await conn.execute(`DELETE FROM BOOK_AUTHOR WHERE BOOK_ID = :1`, [id]);
      const result = await conn.execute(`DELETE FROM BOOK WHERE BOOK_ID = :1`, [id]);
      if (result.rowsAffected === 0) {
        throw new Error("Book not found");
      }
    });

    return NextResponse.json<ApiResponse<never>>({ success: true, message: "Book deleted" });
  } catch (err) {
    const notFound = err instanceof Error && err.message === "Book not found";
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: notFound ? "Book not found" : toFriendlyMessage(err) },
      { status: notFound ? 404 : 500 }
    );
  }
}
