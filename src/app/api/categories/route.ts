import { NextRequest, NextResponse } from "next/server";
import { executeQuery, executeDML } from "@/lib/db";
import { toFriendlyMessage } from "@/lib/errors";
import { createWithIdRetry } from "@/lib/retryCreate";
import type { ApiResponse, CategoryDetail } from "@/types";

// GET /api/categories — list all categories with parent name
export async function GET() {
  try {
    const rows = await executeQuery<CategoryDetail>(`
      SELECT c.CATEGORY_ID, c.CATEGORY_NAME, c.PARENT_ID, p.CATEGORY_NAME AS PARENT_NAME
      FROM CATEGORY c
      LEFT JOIN CATEGORY p ON c.PARENT_ID = p.CATEGORY_ID
      ORDER BY c.CATEGORY_ID
    `);
    return NextResponse.json<ApiResponse<CategoryDetail[]>>({ success: true, data: rows });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}

// POST /api/categories — create a category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category_name, parent_id } = body;

    if (!category_name) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "category_name is required" },
        { status: 400 }
      );
    }

    const { ids, reassigned } = await createWithIdRetry({ category_id: "category" }, async (ids) => {
      await executeDML(
        `INSERT INTO CATEGORY (CATEGORY_ID, CATEGORY_NAME, PARENT_ID) VALUES (:1, :2, :3)`,
        [ids.category_id, category_name, parent_id ?? null]
      );
    });

    return NextResponse.json<ApiResponse<{ category_id: string; reassigned: boolean }>>(
      { success: true, message: "Category created", data: { category_id: ids.category_id, reassigned } },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}
