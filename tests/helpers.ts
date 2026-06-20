import { NextRequest } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export function managementCookie(): Record<string, string> {
  const token = createSessionToken({
    role: "LIBRARIAN",
    librarianId: "L001",
    staffId: "STF-2020-001",
    fullName: "Test Head Librarian",
    position: "Head Librarian",
  });
  return { [SESSION_COOKIE_NAME]: token };
}

export function staffCookie(): Record<string, string> {
  const token = createSessionToken({
    role: "LIBRARIAN",
    librarianId: "L003",
    staffId: "STF-2022-003",
    fullName: "Test Staff Librarian",
    position: "Librarian",
  });
  return { [SESSION_COOKIE_NAME]: token };
}

export function makeRequest(
  method: string,
  url: string,
  body?: unknown,
  cookies?: Record<string, string>
): NextRequest {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookies) {
    headers["Cookie"] = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

export function ctxWith<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}
