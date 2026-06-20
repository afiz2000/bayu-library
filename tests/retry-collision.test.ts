import { describe, it, expect } from "vitest";
import { createWithIdRetry, isUniqueConstraintError } from "@/lib/retryCreate";
import { POST as createCategory } from "@/app/api/categories/route";
import { DELETE as deleteCategory } from "@/app/api/categories/[id]/route";
import { makeRequest, ctx, managementCookie } from "../tests/helpers";

const PK_VIOLATION = new Error("ORA-00001: unique constraint (BAYU_LIBRARY.PK_CATEGORY) violated");
const ISBN_VIOLATION = new Error("ORA-00001: unique constraint (BAYU_LIBRARY.UQ_BOOK_ISBN) violated");

describe("isUniqueConstraintError", () => {
  it("matches a primary key violation", () => {
    expect(isUniqueConstraintError(PK_VIOLATION)).toBe(true);
  });

  it("does not match a non-PK unique violation (e.g. duplicate ISBN)", () => {
    expect(isUniqueConstraintError(ISBN_VIOLATION)).toBe(false);
  });

  it("does not match an unrelated business error", () => {
    expect(isUniqueConstraintError(new Error("Book not available for borrowing"))).toBe(false);
  });
});

describe("createWithIdRetry", () => {
  it("retries once with a fresh ID when the attempt throws a PK collision, and reports reassigned", async () => {
    let callCount = 0;

    const { result, ids, reassigned } = await createWithIdRetry({ category_id: "category" }, async (ids) => {
      callCount++;
      if (callCount === 1) {
        throw PK_VIOLATION;
      }
      return ids.category_id;
    });

    expect(callCount).toBe(2);
    expect(reassigned).toBe(true);
    expect(result).toBe(ids.category_id);
  });

  it("does not retry on a non-PK unique violation — it should propagate immediately", async () => {
    let callCount = 0;

    await expect(
      createWithIdRetry({ book_id: "book" }, async () => {
        callCount++;
        throw ISBN_VIOLATION;
      })
    ).rejects.toThrow(/UQ_BOOK_ISBN/);

    expect(callCount).toBe(1);
  });

  it("gives up after maxAttempts consecutive PK collisions, surfacing the real Oracle error", async () => {
    let callCount = 0;

    await expect(
      createWithIdRetry(
        { category_id: "category" },
        async () => {
          callCount++;
          throw PK_VIOLATION;
        },
        3
      )
    ).rejects.toThrow(/PK_CATEGORY/);

    expect(callCount).toBe(3);
  });
});

describe("createWithIdRetry wired into a real route", () => {
  it("the categories route reports reassigned: false on a normal create (no collision)", async () => {
    const res = await createCategory(makeRequest("POST", "/api/categories", { category_name: "No collision" }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.reassigned).toBe(false);
    expect(body.data.category_id).toMatch(/^CAT\d+$/);

    await deleteCategory(
      makeRequest("DELETE", `/api/categories/${body.data.category_id}`, undefined, managementCookie()),
      ctx(body.data.category_id)
    );
  });
});
