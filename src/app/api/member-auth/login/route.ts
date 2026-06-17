import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { toFriendlyMessage } from "@/lib/errors";
import type { ApiResponse } from "@/types";

interface MemberAuthRow {
  MEMBER_ID: string;
  PERSON_ID: string;
  FULL_NAME: string;
  EMAIL: string;
  PASSWORD_HASH: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const rows = await executeQuery<MemberAuthRow>(
      `SELECT m.MEMBER_ID, m.PERSON_ID, p.FULL_NAME, p.EMAIL, m.PASSWORD_HASH
       FROM MEMBER m
       JOIN PERSON p ON m.PERSON_ID = p.PERSON_ID
       WHERE p.EMAIL = :1`,
      [email]
    );

    const member = rows[0];
    const validPassword =
      member?.PASSWORD_HASH && (await bcrypt.compare(password, member.PASSWORD_HASH));

    if (!member || !validPassword) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = createSessionToken({
      role: "MEMBER",
      memberId: member.MEMBER_ID,
      personId: member.PERSON_ID,
      fullName: member.FULL_NAME,
      email: member.EMAIL,
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
