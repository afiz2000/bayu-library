import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { toFriendlyMessage } from "@/lib/errors";
import type { ApiResponse } from "@/types";

interface LibrarianAuthRow {
  LIBRARIAN_ID: string;
  STAFF_ID: string;
  POSITION: string;
  PASSWORD_HASH: string | null;
  FULL_NAME: string;
}

export async function POST(request: NextRequest) {
  try {
    const { staff_id, password } = await request.json();

    if (!staff_id || !password) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Staff ID and password are required" },
        { status: 400 }
      );
    }

    const rows = await executeQuery<LibrarianAuthRow>(
      `SELECT l.LIBRARIAN_ID, l.STAFF_ID, l.POSITION, l.PASSWORD_HASH, p.FULL_NAME
       FROM LIBRARIAN l
       JOIN PERSON p ON l.PERSON_ID = p.PERSON_ID
       WHERE l.STAFF_ID = :1`,
      [staff_id]
    );

    const librarian = rows[0];
    const validPassword =
      librarian?.PASSWORD_HASH && (await bcrypt.compare(password, librarian.PASSWORD_HASH));

    if (!librarian || !validPassword) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Invalid staff ID or password" },
        { status: 401 }
      );
    }

    const token = createSessionToken({
      librarianId: librarian.LIBRARIAN_ID,
      staffId: librarian.STAFF_ID,
      fullName: librarian.FULL_NAME,
      position: librarian.POSITION,
    });

    const response = NextResponse.json<ApiResponse<never>>({ success: true, message: "Logged in" });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return response;
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}
