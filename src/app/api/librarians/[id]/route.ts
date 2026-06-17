import { NextRequest, NextResponse } from "next/server";
import { executeQuery, executeTransaction } from "@/lib/db";
import { toFriendlyMessage } from "@/lib/errors";
import type { ApiResponse, LibrarianDetail, UpdateLibrarianPayload } from "@/types";

// GET /api/librarians/:id
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/api/librarians/[id]">
) {
  const { id } = await params;
  try {
    const rows = await executeQuery<LibrarianDetail>(
      `SELECT l.LIBRARIAN_ID, l.PERSON_ID, l.STAFF_ID, l.POSITION,
              p.FULL_NAME, p.EMAIL, p.PHONE, p.ADDRESS, p.GENDER
       FROM LIBRARIAN l
       JOIN PERSON p ON l.PERSON_ID = p.PERSON_ID
       WHERE l.LIBRARIAN_ID = :1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Librarian not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<LibrarianDetail>>({ success: true, data: rows[0] });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}

// PUT /api/librarians/:id — update PERSON + LIBRARIAN fields atomically
export async function PUT(
  request: NextRequest,
  { params }: RouteContext<"/api/librarians/[id]">
) {
  const { id } = await params;
  try {
    const body: UpdateLibrarianPayload = await request.json();
    const { full_name, email, phone, address, staff_id, position } = body;

    const existing = await executeQuery<{ PERSON_ID: string }>(
      `SELECT PERSON_ID FROM LIBRARIAN WHERE LIBRARIAN_ID = :1`,
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Librarian not found" },
        { status: 404 }
      );
    }

    const personId = existing[0].PERSON_ID;

    await executeTransaction(async (conn) => {
      await conn.execute(
        `UPDATE PERSON SET
           FULL_NAME = COALESCE(:1, FULL_NAME),
           EMAIL = COALESCE(:2, EMAIL),
           PHONE = COALESCE(:3, PHONE),
           ADDRESS = COALESCE(:4, ADDRESS)
         WHERE PERSON_ID = :5`,
        [full_name ?? null, email ?? null, phone ?? null, address ?? null, personId]
      );
      await conn.execute(
        `UPDATE LIBRARIAN SET
           STAFF_ID = COALESCE(:1, STAFF_ID),
           POSITION = COALESCE(:2, POSITION)
         WHERE LIBRARIAN_ID = :3`,
        [staff_id ?? null, position ?? null, id]
      );
    });

    return NextResponse.json<ApiResponse<never>>({ success: true, message: "Librarian updated" });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}

// DELETE /api/librarians/:id — remove LIBRARIAN + PERSON atomically
export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext<"/api/librarians/[id]">
) {
  const { id } = await params;
  try {
    const existing = await executeQuery<{ PERSON_ID: string }>(
      `SELECT PERSON_ID FROM LIBRARIAN WHERE LIBRARIAN_ID = :1`,
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Librarian not found" },
        { status: 404 }
      );
    }

    const personId = existing[0].PERSON_ID;

    await executeTransaction(async (conn) => {
      await conn.execute(`DELETE FROM LIBRARIAN WHERE LIBRARIAN_ID = :1`, [id]);
      await conn.execute(`DELETE FROM PERSON WHERE PERSON_ID = :1`, [personId]);
    });

    return NextResponse.json<ApiResponse<never>>({ success: true, message: "Librarian deleted" });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}
