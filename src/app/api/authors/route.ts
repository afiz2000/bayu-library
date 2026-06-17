import { NextRequest, NextResponse } from "next/server";
import { executeQuery, executeDML } from "@/lib/db";
import { toFriendlyMessage } from "@/lib/errors";
import type { ApiResponse, Author } from "@/types";

// GET /api/authors — list all authors
export async function GET() {
  try {
    const rows = await executeQuery<Author>(
      `SELECT AUTHOR_ID, AUTHOR_NAME, NATIONALITY FROM AUTHOR ORDER BY AUTHOR_ID`
    );
    return NextResponse.json<ApiResponse<Author[]>>({ success: true, data: rows });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}

// POST /api/authors — create an author
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { author_id, author_name, nationality } = body;

    if (!author_id || !author_name) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "author_id and author_name are required" },
        { status: 400 }
      );
    }

    await executeDML(
      `INSERT INTO AUTHOR (AUTHOR_ID, AUTHOR_NAME, NATIONALITY) VALUES (:1, :2, :3)`,
      [author_id, author_name, nationality ?? null]
    );

    return NextResponse.json<ApiResponse<never>>(
      { success: true, message: "Author created" },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}
