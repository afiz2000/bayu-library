import type { ApiResponse } from "@/types";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  const body: ApiResponse<T> = await res.json();

  if (!body.success) {
    throw new Error(body.error ?? "Request failed");
  }

  return body.data as T;
}

export async function apiSend<T = never>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  payload?: unknown
): Promise<ApiResponse<T>> {
  const res = await fetch(path, {
    method,
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });

  return res.json();
}
