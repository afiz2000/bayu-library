import { NextRequest, NextResponse } from "next/server";
import { executeQuery, executeDML } from "@/lib/db";
import { toFriendlyMessage } from "@/lib/errors";
import { getLibrarianSession, isManagementPosition } from "@/lib/permissions";
import type { ApiResponse, CategoryDetail } from "@/types";

// GET /api/categories/:id
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/api/categories/[id]">
) {
  const { id } = await params;
  try {
    const rows = await executeQuery<CategoryDetail>(
      `SELECT c.CATEGORY_ID, c.CATEGORY_NAME, c.PARENT_ID, p.CATEGORY_NAME AS PARENT_NAME
       FROM CATEGORY c
       LEFT JOIN CATEGORY p ON c.PARENT_ID = p.CATEGORY_ID
       WHERE c.CATEGORY_ID = :1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<CategoryDetail>>({ success: true, data: rows[0] });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}

// PUT /api/categories/:id
export async function PUT(
  request: NextRequest,
  { params }: RouteContext<"/api/categories/[id]">
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { category_name, parent_id } = body;

    const result = await executeDML(
      `UPDATE CATEGORY SET CATEGORY_NAME = :1, PARENT_ID = :2 WHERE CATEGORY_ID = :3`,
      [category_name, parent_id ?? null, id]
    );

    if (result.rowsAffected === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<never>>({ success: true, message: "Category updated" });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/:id
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext<"/api/categories/[id]">
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
    const result = await executeDML(`DELETE FROM CATEGORY WHERE CATEGORY_ID = :1`, [id]);

    if (result.rowsAffected === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<never>>({ success: true, message: "Category deleted" });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}
