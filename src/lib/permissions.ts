import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken, type LibrarianSession } from "@/lib/session";

export { isManagementPosition } from "@/lib/isManagementPosition";

export function getLibrarianSession(request: NextRequest): LibrarianSession | null {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  return session?.role === "LIBRARIAN" ? session : null;
}
