import { describe, it, expect, afterAll } from "vitest";
import { POST as changePassword } from "@/app/api/auth/change-password/route";
import { POST as login } from "@/app/api/auth/login/route";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { executeDML, executeQuery } from "@/lib/db";
import { makeRequest } from "../tests/helpers";

const LIBRARIAN_ID = "L002";
const STAFF_ID = "STF-2021-002";
const NEW_PASSWORD = "TempTest-Pass-987!";

let originalHash: string;

describe("change password API", () => {
  it("changes password and the new password works for login; old password stops working", async () => {
    const before = await executeQuery<{ PASSWORD_HASH: string }>(
      `SELECT PASSWORD_HASH FROM LIBRARIAN WHERE LIBRARIAN_ID = :1`,
      [LIBRARIAN_ID]
    );
    originalHash = before[0].PASSWORD_HASH;

    const token = createSessionToken({
      role: "LIBRARIAN",
      librarianId: LIBRARIAN_ID,
      staffId: STAFF_ID,
      fullName: "Test",
      position: "Senior Librarian",
    });

    const changeRes = await changePassword(
      makeRequest(
        "POST",
        "/api/auth/change-password",
        { current_password: process.env.DEMO_LIBRARIAN_PASSWORD, new_password: NEW_PASSWORD },
        { [SESSION_COOKIE_NAME]: token }
      )
    );
    const changeBody = await changeRes.json();
    expect(changeBody.success).toBe(true);

    const loginWithNew = await login(
      makeRequest("POST", "/api/auth/login", { staff_id: STAFF_ID, password: NEW_PASSWORD })
    );
    expect((await loginWithNew.json()).success).toBe(true);

    const loginWithOld = await login(
      makeRequest("POST", "/api/auth/login", { staff_id: STAFF_ID, password: process.env.DEMO_LIBRARIAN_PASSWORD })
    );
    expect(loginWithOld.status).toBe(401);
  });

  it("rejects an incorrect current password", async () => {
    const token = createSessionToken({
      role: "LIBRARIAN",
      librarianId: LIBRARIAN_ID,
      staffId: STAFF_ID,
      fullName: "Test",
      position: "Senior Librarian",
    });

    const res = await changePassword(
      makeRequest(
        "POST",
        "/api/auth/change-password",
        { current_password: "wrong-password", new_password: "AnotherPass123!" },
        { [SESSION_COOKIE_NAME]: token }
      )
    );
    expect(res.status).toBe(401);
  });

  it("rejects an unauthenticated request", async () => {
    const res = await changePassword(
      makeRequest("POST", "/api/auth/change-password", {
        current_password: "x",
        new_password: "AnotherPass123!",
      })
    );
    expect(res.status).toBe(401);
  });
});

afterAll(async () => {
  await executeDML(`UPDATE LIBRARIAN SET PASSWORD_HASH = :1 WHERE LIBRARIAN_ID = :2`, [
    originalHash,
    LIBRARIAN_ID,
  ]);
});
