import { describe, it, expect } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/session";
import { POST as login } from "@/app/api/auth/login/route";
import { makeRequest } from "../tests/helpers";

describe("session token", () => {
  it("signs and verifies a valid token", () => {
    const token = createSessionToken({
      role: "LIBRARIAN",
      librarianId: "L001",
      staffId: "STF-2020-001",
      fullName: "Test User",
      position: "Head Librarian",
    });
    const payload = verifySessionToken(token);
    expect(payload?.role).toBe("LIBRARIAN");
    expect(payload && "staffId" in payload && payload.staffId).toBe("STF-2020-001");
  });

  it("rejects a tampered token", () => {
    const token = createSessionToken({
      role: "LIBRARIAN",
      librarianId: "L001",
      staffId: "STF-2020-001",
      fullName: "Test User",
      position: "Head Librarian",
    });
    const tampered = token.slice(0, -2) + "xx";
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(verifySessionToken("not-a-token")).toBeNull();
    expect(verifySessionToken(undefined)).toBeNull();
  });
});

describe("login API", () => {
  it("logs in with correct staff_id and password, setting a session cookie", async () => {
    const res = await login(
      makeRequest("POST", "/api/auth/login", {
        staff_id: "STF-2020-001",
        password: process.env.DEMO_LIBRARIAN_PASSWORD,
      })
    );
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(res.cookies.get("bayu_session")).toBeTruthy();
  });

  it("rejects an incorrect password", async () => {
    const res = await login(makeRequest("POST", "/api/auth/login", { staff_id: "STF-2020-001", password: "wrong" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("rejects an unknown staff_id", async () => {
    const res = await login(makeRequest("POST", "/api/auth/login", { staff_id: "NOPE", password: "x" }));
    expect(res.status).toBe(401);
  });
});
