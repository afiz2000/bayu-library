import { describe, it, expect } from "vitest";
import { proxy } from "@/proxy";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { makeRequest } from "../tests/helpers";

describe("proxy path classification", () => {
  it("does not treat /members (librarian page) as the member area", async () => {
    const res = proxy(makeRequest("GET", "/members"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(new URL(location).pathname).toBe("/login");
  });

  it("treats /member (no trailing segment) as the member area", async () => {
    const res = proxy(makeRequest("GET", "/member"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(new URL(location).pathname).toBe("/member/login");
  });

  it("allows a librarian session onto /members", async () => {
    const token = createSessionToken({
      role: "LIBRARIAN",
      librarianId: "L001",
      staffId: "STF-2020-001",
      fullName: "Test",
      position: "Head Librarian",
    });
    const res = proxy(makeRequest("GET", "/members", undefined, { [SESSION_COOKIE_NAME]: token }));
    expect(res.status).toBe(200);
  });

  it("does not allow a member session onto /members", async () => {
    const token = createSessionToken({
      role: "MEMBER",
      memberId: "M001",
      personId: "P001",
      fullName: "Test",
      email: "test@example.com",
    });
    const res = proxy(makeRequest("GET", "/members", undefined, { [SESSION_COOKIE_NAME]: token }));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });
});
