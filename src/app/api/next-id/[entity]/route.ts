import { NextRequest, NextResponse } from "next/server";
import { getNextId, ID_ENTITIES, type IdEntity } from "@/lib/nextId";
import { toFriendlyMessage } from "@/lib/errors";
import type { ApiResponse } from "@/types";

// GET /api/next-id/:entity — suggest the next ID for a given entity type
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/api/next-id/[entity]">
) {
  const { entity } = await params;

  if (!ID_ENTITIES.includes(entity as IdEntity)) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Unknown entity" },
      { status: 400 }
    );
  }

  try {
    const id = await getNextId(entity as IdEntity);
    return NextResponse.json<ApiResponse<{ id: string }>>({ success: true, data: { id } });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: toFriendlyMessage(err) },
      { status: 500 }
    );
  }
}
