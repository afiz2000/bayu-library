import { describe, it, expect } from "vitest";
import { POST as createAuthor } from "@/app/api/authors/route";
import { GET as getAuthor, PUT as updateAuthor, DELETE as deleteAuthor } from "@/app/api/authors/[id]/route";
import { makeRequest, ctx, managementCookie } from "../tests/helpers";

describe("authors API", () => {
  it("creates, reads, updates, and deletes an author (server-assigned ID)", async () => {
    const createRes = await createAuthor(
      makeRequest("POST", "/api/authors", { author_name: "Test Author", nationality: "Malaysian" })
    );
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    const id = createBody.data.author_id;
    expect(id).toMatch(/^A\d+$/);

    const getRes = await getAuthor(makeRequest("GET", `/api/authors/${id}`), ctx(id));
    const getBody = await getRes.json();
    expect(getBody.data.AUTHOR_NAME).toBe("Test Author");

    await updateAuthor(
      makeRequest("PUT", `/api/authors/${id}`, { author_name: "Updated Author", nationality: "Malaysian" }),
      ctx(id)
    );
    const afterUpdate = await getAuthor(makeRequest("GET", `/api/authors/${id}`), ctx(id));
    const afterUpdateBody = await afterUpdate.json();
    expect(afterUpdateBody.data.AUTHOR_NAME).toBe("Updated Author");

    const deleteRes = await deleteAuthor(
      makeRequest("DELETE", `/api/authors/${id}`, undefined, managementCookie()),
      ctx(id)
    );
    expect((await deleteRes.json()).success).toBe(true);

    const afterDelete = await getAuthor(makeRequest("GET", `/api/authors/${id}`), ctx(id));
    expect(afterDelete.status).toBe(404);
  });
});
