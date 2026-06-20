import { describe, it, expect } from "vitest";
import { POST as createBook } from "@/app/api/books/route";
import { GET as getBook, PUT as updateBook, DELETE as deleteBook } from "@/app/api/books/[id]/route";
import { makeRequest, ctx } from "../tests/helpers";

describe("books API", () => {
  it("creates a book with authors (server-assigned ID), reads it back with category/author names", async () => {
    const createRes = await createBook(
      makeRequest("POST", "/api/books", {
        category_id: "CAT01",
        title: "Test Book",
        isbn: "978-000-000-000-1",
        publish_year: 2020,
        publisher: "Test Press",
        total_copies: 2,
        available_copies: 2,
        author_ids: ["A001"],
      })
    );
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    const id = createBody.data.book_id;
    expect(id).toMatch(/^B\d+$/);

    const getRes = await getBook(makeRequest("GET", `/api/books/${id}`), ctx(id));
    const getBody = await getRes.json();
    expect(getBody.data.CATEGORY_NAME).toBe("Science");
    expect(getBody.data.AUTHORS).toContain("Hamka");

    await deleteBook(makeRequest("DELETE", `/api/books/${id}`), ctx(id));
  });

  it("partial update (regression: omitting numeric fields must not throw ORA-00932/NJS-012)", async () => {
    const createRes = await createBook(
      makeRequest("POST", "/api/books", {
        category_id: "CAT01",
        title: "Test Book",
        isbn: "978-000-000-000-1",
        publish_year: 2020,
        publisher: "Test Press",
        total_copies: 2,
        available_copies: 2,
        author_ids: [],
      })
    );
    const id = (await createRes.json()).data.book_id;

    const updateRes = await updateBook(
      makeRequest("PUT", `/api/books/${id}`, { title: "Renamed Only" }),
      ctx(id)
    );
    const updateBody = await updateRes.json();
    expect(updateRes.status).toBe(200);
    expect(updateBody.success).toBe(true);

    const afterUpdate = await getBook(makeRequest("GET", `/api/books/${id}`), ctx(id));
    const afterBody = await afterUpdate.json();
    expect(afterBody.data.TITLE).toBe("Renamed Only");
    expect(afterBody.data.PUBLISH_YEAR).toBe(2020);
    expect(afterBody.data.TOTAL_COPIES).toBe(2);

    await deleteBook(makeRequest("DELETE", `/api/books/${id}`), ctx(id));
  });

  it("returns 404 for updating a nonexistent book", async () => {
    const res = await updateBook(makeRequest("PUT", "/api/books/NOPE", { title: "x" }), ctx("NOPE"));
    expect(res.status).toBe(404);
  });

  it("returns a friendly error (not raw ORA-) for a duplicate ISBN, without retrying the ID", async () => {
    const payload = {
      category_id: "CAT01",
      title: "Dup ISBN Book",
      isbn: "978-111-111-111-1",
      publish_year: 2021,
      total_copies: 1,
      available_copies: 1,
      author_ids: [],
    };

    const first = await createBook(makeRequest("POST", "/api/books", payload));
    const firstBody = await first.json();
    expect(firstBody.success).toBe(true);

    const second = await createBook(makeRequest("POST", "/api/books", payload));
    const secondBody = await second.json();
    expect(secondBody.success).toBe(false);
    expect(secondBody.error).not.toMatch(/ORA-/);

    await deleteBook(makeRequest("DELETE", `/api/books/${firstBody.data.book_id}`), ctx(firstBody.data.book_id));
  });
});
