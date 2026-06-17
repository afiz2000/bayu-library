import { describe, it, expect } from "vitest";
import { POST as createAuthor } from "@/app/api/authors/route";
import { GET as getAuthor, PUT as updateAuthor, DELETE as deleteAuthor } from "@/app/api/authors/[id]/route";
import { makeRequest, ctx } from "../tests/helpers";

const TEST_ID = "TST_A01";

describe("authors API", () => {
  it("creates, reads, updates, and deletes an author", async () => {
    const createRes = await createAuthor(
      makeRequest("POST", "/api/authors", { author_id: TEST_ID, author_name: "Test Author", nationality: "Malaysian" })
    );
    expect(createRes.status).toBe(201);

    const getRes = await getAuthor(makeRequest("GET", `/api/authors/${TEST_ID}`), ctx(TEST_ID));
    const getBody = await getRes.json();
    expect(getBody.data.AUTHOR_NAME).toBe("Test Author");

    await updateAuthor(
      makeRequest("PUT", `/api/authors/${TEST_ID}`, { author_name: "Updated Author", nationality: "Malaysian" }),
      ctx(TEST_ID)
    );
    const afterUpdate = await getAuthor(makeRequest("GET", `/api/authors/${TEST_ID}`), ctx(TEST_ID));
    const afterUpdateBody = await afterUpdate.json();
    expect(afterUpdateBody.data.AUTHOR_NAME).toBe("Updated Author");

    const deleteRes = await deleteAuthor(makeRequest("DELETE", `/api/authors/${TEST_ID}`), ctx(TEST_ID));
    expect((await deleteRes.json()).success).toBe(true);

    const afterDelete = await getAuthor(makeRequest("GET", `/api/authors/${TEST_ID}`), ctx(TEST_ID));
    expect(afterDelete.status).toBe(404);
  });
});
