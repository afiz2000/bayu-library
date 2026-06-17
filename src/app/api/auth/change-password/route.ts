import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { executeDML, executeQuery } from "@/lib/db";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { toFriendlyMessage } from "@/lib/errors";
import type { ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!session || session.role !== "LIBRARIAN") {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const { current_password, new_password } = await request.json();

    if (!current_password || !new_password) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Current and new password are required" },
        { status: 400 }
      );
    }

    if (new_password.length < 8) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const rows = await executeQuery<{ PASSWORD_HASH: string | null }>(
      `SELECT PASSWORD_HASH FROM LIBRARIAN WHERE LIBRARIAN_ID = :1`,
      [session.librarianId]
    );
    const currentHash = rows[0]?.PASSWORD_HASH;
    const valid = currentHash && (await bcrypt.compare(current_password, currentHash));

    if (!valid) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await executeDML(`UPDATE LIBRARIAN SET PASSWORD_HASH = :1 WHERE LIBRARIAN_ID = :2`, [
      newHash,
      session.librarianId,
    ]);

    return NextResponse.json<ApiResponse<never>>({ success: true, message: "Password updated" });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}
