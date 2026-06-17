import { NextRequest, NextResponse } from "next/server";
import { executeQuery, executeTransaction } from "@/lib/db";
import { toFriendlyMessage } from "@/lib/errors";
import type { ApiResponse, CreateMemberPayload, MemberDetail } from "@/types";

// GET /api/members — list all members with PERSON details
export async function GET() {
  try {
    const rows = await executeQuery<MemberDetail>(`
      SELECT m.MEMBER_ID, m.PERSON_ID, m.MEMBERSHIP_DATE, m.MEMBERSHIP_TYPE, m.STATUS,
             p.FULL_NAME, p.EMAIL, p.PHONE, p.ADDRESS, p.GENDER
      FROM MEMBER m
      JOIN PERSON p ON m.PERSON_ID = p.PERSON_ID
      ORDER BY m.MEMBER_ID
    `);
    return NextResponse.json<ApiResponse<MemberDetail[]>>({ success: true, data: rows });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}

// POST /api/members — create PERSON + MEMBER atomically
export async function POST(request: NextRequest) {
  try {
    const body: CreateMemberPayload = await request.json();
    const {
      person_id,
      full_name,
      email,
      phone,
      address,
      gender,
      member_id,
      membership_date,
      membership_type,
      status,
    } = body;

    if (!person_id || !full_name || !email || !gender || !member_id || !membership_date || !membership_type || !status) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    await executeTransaction(async (conn) => {
      await conn.execute(
        `INSERT INTO PERSON (PERSON_ID, FULL_NAME, EMAIL, PHONE, ADDRESS, GENDER, PERSON_TYPE)
         VALUES (:1, :2, :3, :4, :5, :6, 'MEMBER')`,
        [person_id, full_name, email, phone ?? null, address ?? null, gender]
      );
      await conn.execute(
        `INSERT INTO MEMBER (MEMBER_ID, PERSON_ID, MEMBERSHIP_DATE, MEMBERSHIP_TYPE, STATUS)
         VALUES (:1, :2, TO_DATE(:3, 'YYYY-MM-DD'), :4, :5)`,
        [member_id, person_id, membership_date, membership_type, status]
      );
    });

    return NextResponse.json<ApiResponse<never>>(
      { success: true, message: "Member created" },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}
