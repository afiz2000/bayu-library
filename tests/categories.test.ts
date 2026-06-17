import { describe, it, expect } from "vitest";
import { GET as listCategories, POST as createCategory } from "@/app/api/categories/route";
import { GET as getCategory, PUT as updateCategory, DELETE as deleteCategory } from "@/app/api/categories/[id]/route";
import { makeRequest, ctx } from "../tests/helpers";

const TEST_ID = "TST_CAT01";

describe("categories API", () => {
  it("creates, reads, updates, and deletes a category", async () => {
    const createRes = await createCategory(
      makeRequest("POST", "/api/categories", { category_id: TEST_ID, category_name: "Test Category" })
    );
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    expect(createBody.success).toBe(true);

    const getRes = await getCategory(makeRequest("GET", `/api/categories/${TEST_ID}`), ctx(TEST_ID));
    const getBody = await getRes.json();
    expect(getBody.success).toBe(true);
    expect(getBody.data.CATEGORY_NAME).toBe("Test Category");

    const updateRes = await updateCategory(
      makeRequest("PUT", `/api/categories/${TEST_ID}`, { category_name: "Updated Name", parent_id: null }),
      ctx(TEST_ID)
    );
    const updateBody = await updateRes.json();
    expect(updateBody.success).toBe(true);

    const afterUpdate = await getCategory(makeRequest("GET", `/api/categories/${TEST_ID}`), ctx(TEST_ID));
    const afterUpdateBody = await afterUpdate.json();
    expect(afterUpdateBody.data.CATEGORY_NAME).toBe("Updated Name");

    const deleteRes = await deleteCategory(makeRequest("DELETE", `/api/categories/${TEST_ID}`), ctx(TEST_ID));
    const deleteBody = await deleteRes.json();
    expect(deleteBody.success).toBe(true);

    const afterDelete = await getCategory(makeRequest("GET", `/api/categories/${TEST_ID}`), ctx(TEST_ID));
    expect(afterDelete.status).toBe(404);
  });

  it("returns a friendly error for duplicate IDs", async () => {
    await createCategory(makeRequest("POST", "/api/categories", { category_id: TEST_ID, category_name: "A" }));
    const dupRes = await createCategory(makeRequest("POST", "/api/categories", { category_id: TEST_ID, category_name: "B" }));
    const dupBody = await dupRes.json();
    expect(dupBody.success).toBe(false);
    expect(dupBody.error).not.toMatch(/ORA-/);

    await deleteCategory(makeRequest("DELETE", `/api/categories/${TEST_ID}`), ctx(TEST_ID));
  });

  it("lists categories including seeded data", async () => {
    const res = await listCategories();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });
});
