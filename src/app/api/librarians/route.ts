import { NextRequest, NextResponse } from "next/server";
import { executeQuery, executeTransaction } from "@/lib/db";
import { toFriendlyMessage } from "@/lib/errors";
import { createWithIdRetry } from "@/lib/retryCreate";
import { getLibrarianSession, isManagementPosition } from "@/lib/permissions";
import type { ApiResponse, CreateLibrarianPayload, LibrarianDetail } from "@/types";

// GET /api/librarians — list all librarians with PERSON details
export async function GET() {
  try {
    const rows = await executeQuery<LibrarianDetail>(`
      SELECT l.LIBRARIAN_ID, l.PERSON_ID, l.STAFF_ID, l.POSITION,
             p.FULL_NAME, p.EMAIL, p.PHONE, p.ADDRESS, p.GENDER
      FROM LIBRARIAN l
      JOIN PERSON p ON l.PERSON_ID = p.PERSON_ID
      ORDER BY l.LIBRARIAN_ID
    `);
    return NextResponse.json<ApiResponse<LibrarianDetail[]>>({ success: true, data: rows });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}

// POST /api/librarians — create PERSON + LIBRARIAN atomically
export async function POST(request: NextRequest) {
  const session = getLibrarianSession(request);
  if (!session || !isManagementPosition(session.position)) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Only a Head or Senior Librarian can manage librarian accounts." },
      { status: 403 }
    );
  }

  try {
    const body: CreateLibrarianPayload = await request.json();
    const { full_name, email, phone, address, gender, staff_id, position } = body;

    if (!full_name || !email || !gender || !staff_id || !position) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { ids, reassigned } = await createWithIdRetry(
      { person_id: "person", librarian_id: "librarian" },
      async (ids) => {
        await executeTransaction(async (conn) => {
          await conn.execute(
            `INSERT INTO PERSON (PERSON_ID, FULL_NAME, EMAIL, PHONE, ADDRESS, GENDER, PERSON_TYPE)
             VALUES (:1, :2, :3, :4, :5, :6, 'LIBRARIAN')`,
            [ids.person_id, full_name, email, phone ?? null, address ?? null, gender]
          );
          await conn.execute(
            `INSERT INTO LIBRARIAN (LIBRARIAN_ID, PERSON_ID, STAFF_ID, POSITION)
             VALUES (:1, :2, :3, :4)`,
            [ids.librarian_id, ids.person_id, staff_id, position]
          );
        });
      }
    );

    return NextResponse.json<ApiResponse<{ person_id: string; librarian_id: string; reassigned: boolean }>>(
      {
        success: true,
        message: "Librarian created",
        data: { person_id: ids.person_id, librarian_id: ids.librarian_id, reassigned },
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}
