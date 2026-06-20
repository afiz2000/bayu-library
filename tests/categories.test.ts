import { describe, it, expect } from "vitest";
import { GET as listCategories, POST as createCategory } from "@/app/api/categories/route";
import { GET as getCategory, PUT as updateCategory, DELETE as deleteCategory } from "@/app/api/categories/[id]/route";
import { makeRequest, ctx, managementCookie, staffCookie } from "../tests/helpers";

describe("categories API", () => {
  it("creates, reads, updates, and deletes a category (server-assigned ID)", async () => {
    const createRes = await createCategory(
      makeRequest("POST", "/api/categories", { category_name: "Test Category" })
    );
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    expect(createBody.success).toBe(true);
    const id = createBody.data.category_id;
    expect(id).toMatch(/^CAT\d+$/);

    const getRes = await getCategory(makeRequest("GET", `/api/categories/${id}`), ctx(id));
    const getBody = await getRes.json();
    expect(getBody.success).toBe(true);
    expect(getBody.data.CATEGORY_NAME).toBe("Test Category");

    const updateRes = await updateCategory(
      makeRequest("PUT", `/api/categories/${id}`, { category_name: "Updated Name", parent_id: null }),
      ctx(id)
    );
    const updateBody = await updateRes.json();
    expect(updateBody.success).toBe(true);

    const afterUpdate = await getCategory(makeRequest("GET", `/api/categories/${id}`), ctx(id));
    const afterUpdateBody = await afterUpdate.json();
    expect(afterUpdateBody.data.CATEGORY_NAME).toBe("Updated Name");

    const deleteRes = await deleteCategory(
      makeRequest("DELETE", `/api/categories/${id}`, undefined, managementCookie()),
      ctx(id)
    );
    const deleteBody = await deleteRes.json();
    expect(deleteBody.success).toBe(true);

    const afterDelete = await getCategory(makeRequest("GET", `/api/categories/${id}`), ctx(id));
    expect(afterDelete.status).toBe(404);
  });

  it("assigns a different ID to each newly created category", async () => {
    const res1 = await createCategory(makeRequest("POST", "/api/categories", { category_name: "A" }));
    const body1 = await res1.json();
    const res2 = await createCategory(makeRequest("POST", "/api/categories", { category_name: "B" }));
    const body2 = await res2.json();

    expect(body1.data.category_id).not.toBe(body2.data.category_id);

    await deleteCategory(
      makeRequest("DELETE", `/api/categories/${body1.data.category_id}`, undefined, managementCookie()),
      ctx(body1.data.category_id)
    );
    await deleteCategory(
      makeRequest("DELETE", `/api/categories/${body2.data.category_id}`, undefined, managementCookie()),
      ctx(body2.data.category_id)
    );
  });

  it("rejects delete from a non-management (staff) librarian, and from no session at all", async () => {
    const createRes = await createCategory(makeRequest("POST", "/api/categories", { category_name: "Protected" }));
    const id = (await createRes.json()).data.category_id;

    const staffAttempt = await deleteCategory(
      makeRequest("DELETE", `/api/categories/${id}`, undefined, staffCookie()),
      ctx(id)
    );
    expect(staffAttempt.status).toBe(403);

    const noSessionAttempt = await deleteCategory(makeRequest("DELETE", `/api/categories/${id}`), ctx(id));
    expect(noSessionAttempt.status).toBe(403);

    // confirm it's still there, then clean up properly
    const stillThere = await getCategory(makeRequest("GET", `/api/categories/${id}`), ctx(id));
    expect(stillThere.status).toBe(200);
    await deleteCategory(makeRequest("DELETE", `/api/categories/${id}`, undefined, managementCookie()), ctx(id));
  });

  it("lists categories including seeded data", async () => {
    const res = await listCategories();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });
});
