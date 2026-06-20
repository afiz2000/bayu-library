import { NextRequest, NextResponse } from "next/server";
import { executeQuery, executeTransaction } from "@/lib/db";
import { toFriendlyMessage } from "@/lib/errors";
import { getLibrarianSession, isManagementPosition } from "@/lib/permissions";
import type { ApiResponse, MemberDetail, UpdateMemberPayload } from "@/types";

// GET /api/members/:id
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/api/members/[id]">
) {
  const { id } = await params;
  try {
    const rows = await executeQuery<MemberDetail>(
      `SELECT m.MEMBER_ID, m.PERSON_ID, m.MEMBERSHIP_DATE, m.MEMBERSHIP_TYPE, m.STATUS,
              p.FULL_NAME, p.EMAIL, p.PHONE, p.ADDRESS, p.GENDER
       FROM MEMBER m
       JOIN PERSON p ON m.PERSON_ID = p.PERSON_ID
       WHERE m.MEMBER_ID = :1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<MemberDetail>>({ success: true, data: rows[0] });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}

// PUT /api/members/:id — update PERSON + MEMBER fields atomically
export async function PUT(
  request: NextRequest,
  { params }: RouteContext<"/api/members/[id]">
) {
  const { id } = await params;
  try {
    const body: UpdateMemberPayload = await request.json();
    const { full_name, email, phone, address, membership_type, status } = body;

    const existing = await executeQuery<{ PERSON_ID: string }>(
      `SELECT PERSON_ID FROM MEMBER WHERE MEMBER_ID = :1`,
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Member not found" },
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
        `UPDATE MEMBER SET
           MEMBERSHIP_TYPE = COALESCE(:1, MEMBERSHIP_TYPE),
           STATUS = COALESCE(:2, STATUS)
         WHERE MEMBER_ID = :3`,
        [membership_type ?? null, status ?? null, id]
      );
    });

    return NextResponse.json<ApiResponse<never>>({ success: true, message: "Member updated" });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}

// DELETE /api/members/:id — remove MEMBER + PERSON atomically
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext<"/api/members/[id]">
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
    const existing = await executeQuery<{ PERSON_ID: string }>(
      `SELECT PERSON_ID FROM MEMBER WHERE MEMBER_ID = :1`,
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }

    const personId = existing[0].PERSON_ID;

    await executeTransaction(async (conn) => {
      await conn.execute(`DELETE FROM MEMBER WHERE MEMBER_ID = :1`, [id]);
      await conn.execute(`DELETE FROM PERSON WHERE PERSON_ID = :1`, [personId]);
    });

    return NextResponse.json<ApiResponse<never>>({ success: true, message: "Member deleted" });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}
