import { describe, it, expect } from "vitest";
import { POST as createLibrarian } from "@/app/api/librarians/route";
import { GET as getLibrarian, PUT as updateLibrarian, DELETE as deleteLibrarian } from "@/app/api/librarians/[id]/route";
import { makeRequest, ctx } from "../tests/helpers";

describe("librarians API", () => {
  it("creates PERSON+LIBRARIAN atomically (server-assigned IDs), updates, and deletes both", async () => {
    const createRes = await createLibrarian(
      makeRequest("POST", "/api/librarians", {
        full_name: "Test Librarian",
        email: "test.librarian@example.com",
        gender: "F",
        staff_id: "STF-TEST-99",
        position: "Librarian",
      })
    );
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    const librarianId = createBody.data.librarian_id;
    expect(librarianId).toMatch(/^L\d+$/);
    expect(createBody.data.person_id).toMatch(/^P\d+$/);

    const getRes = await getLibrarian(makeRequest("GET", `/api/librarians/${librarianId}`), ctx(librarianId));
    const getBody = await getRes.json();
    expect(getBody.data.STAFF_ID).toBe("STF-TEST-99");

    await updateLibrarian(
      makeRequest("PUT", `/api/librarians/${librarianId}`, { position: "Senior Librarian" }),
      ctx(librarianId)
    );
    const afterUpdate = await getLibrarian(makeRequest("GET", `/api/librarians/${librarianId}`), ctx(librarianId));
    expect((await afterUpdate.json()).data.POSITION).toBe("Senior Librarian");

    const deleteRes = await deleteLibrarian(makeRequest("DELETE", `/api/librarians/${librarianId}`), ctx(librarianId));
    expect((await deleteRes.json()).success).toBe(true);

    const afterDelete = await getLibrarian(makeRequest("GET", `/api/librarians/${librarianId}`), ctx(librarianId));
    expect(afterDelete.status).toBe(404);
  });
});
