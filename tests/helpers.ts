import { NextRequest } from "next/server";

export function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}
