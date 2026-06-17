import { describe, it, expect } from "vitest";
import { POST as createBook } from "@/app/api/books/route";
import { GET as getBook, PUT as updateBook, DELETE as deleteBook } from "@/app/api/books/[id]/route";
import { makeRequest, ctx } from "../tests/helpers";

const BOOK_ID = "TST_B01";

describe("books API", () => {
  it("creates a book with authors, reads it back with category/author names", async () => {
    const createRes = await createBook(
      makeRequest("POST", "/api/books", {
        book_id: BOOK_ID,
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

    const getRes = await getBook(makeRequest("GET", `/api/books/${BOOK_ID}`), ctx(BOOK_ID));
    const getBody = await getRes.json();
    expect(getBody.data.CATEGORY_NAME).toBe("Science");
    expect(getBody.data.AUTHORS).toContain("Hamka");

    await deleteBook(makeRequest("DELETE", `/api/books/${BOOK_ID}`), ctx(BOOK_ID));
  });

  it("partial update (regression: omitting numeric fields must not throw ORA-00932/NJS-012)", async () => {
    await createBook(
      makeRequest("POST", "/api/books", {
        book_id: BOOK_ID,
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

    const updateRes = await updateBook(
      makeRequest("PUT", `/api/books/${BOOK_ID}`, { title: "Renamed Only" }),
      ctx(BOOK_ID)
    );
    const updateBody = await updateRes.json();
    expect(updateRes.status).toBe(200);
    expect(updateBody.success).toBe(true);

    const afterUpdate = await getBook(makeRequest("GET", `/api/books/${BOOK_ID}`), ctx(BOOK_ID));
    const afterBody = await afterUpdate.json();
    expect(afterBody.data.TITLE).toBe("Renamed Only");
    expect(afterBody.data.PUBLISH_YEAR).toBe(2020);
    expect(afterBody.data.TOTAL_COPIES).toBe(2);

    await deleteBook(makeRequest("DELETE", `/api/books/${BOOK_ID}`), ctx(BOOK_ID));
  });

  it("returns 404 for updating a nonexistent book", async () => {
    const res = await updateBook(makeRequest("PUT", "/api/books/NOPE", { title: "x" }), ctx("NOPE"));
    expect(res.status).toBe(404);
  });
});
