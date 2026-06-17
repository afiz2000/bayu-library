import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import type { ApiResponse } from "@/types";

export async function GET(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  return NextResponse.json<ApiResponse<typeof session>>({ success: true, data: session });
}
