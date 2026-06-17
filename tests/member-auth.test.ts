import { describe, it, expect } from "vitest";
import { POST as login } from "@/app/api/member-auth/login/route";
import { GET as getMyBorrowings } from "@/app/api/member/borrowings/route";
import { SESSION_COOKIE_NAME, createSessionToken } from "@/lib/session";
import { makeRequest } from "../tests/helpers";

const MEMBER_EMAIL = "faris.zulkifli@gmail.com";
const MEMBER_ID = "M001";

describe("member login API", () => {
  it("logs in with correct email and password, setting a session cookie", async () => {
    const res = await login(
      makeRequest("POST", "/api/member-auth/login", {
        email: MEMBER_EMAIL,
        password: process.env.DEMO_MEMBER_PASSWORD,
      })
    );
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(res.cookies.get(SESSION_COOKIE_NAME)).toBeTruthy();
  });

  it("rejects an incorrect password", async () => {
    const res = await login(
      makeRequest("POST", "/api/member-auth/login", { email: MEMBER_EMAIL, password: "wrong" })
    );
    expect(res.status).toBe(401);
  });

  it("rejects an unknown email", async () => {
    const res = await login(
      makeRequest("POST", "/api/member-auth/login", { email: "nobody@example.com", password: "x" })
    );
    expect(res.status).toBe(401);
  });
});

describe("member borrowings API", () => {
  it("requires authentication", async () => {
    const res = await getMyBorrowings(makeRequest("GET", "/api/member/borrowings"));
    expect(res.status).toBe(401);
  });

  it("returns only the logged-in member's own borrowings", async () => {
    const token = createSessionToken({
      role: "MEMBER",
      memberId: MEMBER_ID,
      personId: "P001",
      fullName: "Test Member",
      email: MEMBER_EMAIL,
    });

    const res = await getMyBorrowings(
      makeRequest("GET", "/api/member/borrowings", undefined, { [SESSION_COOKIE_NAME]: token })
    );
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((b: { MEMBER_ID: string }) => b.MEMBER_ID === MEMBER_ID)).toBe(true);
  });
});
