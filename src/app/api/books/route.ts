import { NextRequest, NextResponse } from "next/server";
import { executeQuery, executeTransaction } from "@/lib/db";
import { toFriendlyMessage } from "@/lib/errors";
import type { ApiResponse, BookDetail, CreateBookPayload } from "@/types";

// GET /api/books — list all books with category name and authors
export async function GET() {
  try {
    const rows = await executeQuery<BookDetail>(`
      SELECT b.BOOK_ID, b.CATEGORY_ID, b.TITLE, b.ISBN, b.PUBLISH_YEAR, b.PUBLISHER,
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
      ORDER BY b.BOOK_ID
    `);
    return NextResponse.json<ApiResponse<BookDetail[]>>({ success: true, data: rows });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}

// POST /api/books — create BOOK + BOOK_AUTHOR rows atomically
export async function POST(request: NextRequest) {
  try {
    const body: CreateBookPayload = await request.json();
    const {
      book_id,
      category_id,
      title,
      isbn,
      publish_year,
      publisher,
      total_copies,
      available_copies,
      author_ids,
    } = body;

    if (!book_id || !category_id || !title || !isbn || !publish_year || total_copies == null || available_copies == null) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    await executeTransaction(async (conn) => {
      await conn.execute(
        `INSERT INTO BOOK (BOOK_ID, CATEGORY_ID, TITLE, ISBN, PUBLISH_YEAR, PUBLISHER, TOTAL_COPIES, AVAILABLE_COPIES)
         VALUES (:1, :2, :3, :4, :5, :6, :7, :8)`,
        [book_id, category_id, title, isbn, publish_year, publisher ?? null, total_copies, available_copies]
      );

      for (const authorId of author_ids ?? []) {
        await conn.execute(
          `INSERT INTO BOOK_AUTHOR (BOOK_ID, AUTHOR_ID) VALUES (:1, :2)`,
          [book_id, authorId]
        );
      }
    });

    return NextResponse.json<ApiResponse<never>>(
      { success: true, message: "Book created" },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}
