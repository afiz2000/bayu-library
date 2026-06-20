import { NextRequest, NextResponse } from "next/server";
import { executeQuery, executeDML } from "@/lib/db";
import { toFriendlyMessage } from "@/lib/errors";
import { createWithIdRetry } from "@/lib/retryCreate";
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
    const { author_name, nationality } = body;

    if (!author_name) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "author_name is required" },
        { status: 400 }
      );
    }

    const { ids, reassigned } = await createWithIdRetry({ author_id: "author" }, async (ids) => {
      await executeDML(
        `INSERT INTO AUTHOR (AUTHOR_ID, AUTHOR_NAME, NATIONALITY) VALUES (:1, :2, :3)`,
        [ids.author_id, author_name, nationality ?? null]
      );
    });

    return NextResponse.json<ApiResponse<{ author_id: string; reassigned: boolean }>>(
      { success: true, message: "Author created", data: { author_id: ids.author_id, reassigned } },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}
