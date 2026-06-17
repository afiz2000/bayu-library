import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/member/login",
  "/api/member-auth/login",
  "/api/member-auth/logout",
  "/api/member-auth/me",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const isMemberArea = pathname.startsWith("/member") || pathname.startsWith("/api/member/");
  const loginPath = isMemberArea ? "/member/login" : "/login";
  const requiredRole = isMemberArea ? "MEMBER" : "LIBRARIAN";

  if (session?.role === requiredRole) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const loginUrl = new URL(loginPath, request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
