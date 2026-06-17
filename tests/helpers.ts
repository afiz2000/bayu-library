import { NextRequest } from "next/server";

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
