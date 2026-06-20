import { NextRequest, NextResponse } from "next/server";
import { executeQuery, executeDML } from "@/lib/db";
import { toFriendlyMessage } from "@/lib/errors";
import { getLibrarianSession, isManagementPosition } from "@/lib/permissions";
import type { ApiResponse, Author } from "@/types";

// GET /api/authors/:id
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/api/authors/[id]">
) {
  const { id } = await params;
  try {
    const rows = await executeQuery<Author>(
      `SELECT AUTHOR_ID, AUTHOR_NAME, NATIONALITY FROM AUTHOR WHERE AUTHOR_ID = :1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Author not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Author>>({ success: true, data: rows[0] });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}

// PUT /api/authors/:id
export async function PUT(
  request: NextRequest,
  { params }: RouteContext<"/api/authors/[id]">
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { author_name, nationality } = body;

    const result = await executeDML(
      `UPDATE AUTHOR SET AUTHOR_NAME = :1, NATIONALITY = :2 WHERE AUTHOR_ID = :3`,
      [author_name, nationality ?? null, id]
    );

    if (result.rowsAffected === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Author not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<never>>({ success: true, message: "Author updated" });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}

// DELETE /api/authors/:id
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext<"/api/authors/[id]">
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
    const result = await executeDML(`DELETE FROM AUTHOR WHERE AUTHOR_ID = :1`, [id]);

    if (result.rowsAffected === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Author not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<never>>({ success: true, message: "Author deleted" });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}
