import { describe, it, expect } from "vitest";
import { POST as createLibrarian } from "@/app/api/librarians/route";
import { GET as getLibrarian, PUT as updateLibrarian, DELETE as deleteLibrarian } from "@/app/api/librarians/[id]/route";
import { makeRequest, ctx, managementCookie, staffCookie } from "../tests/helpers";

describe("librarians API", () => {
  it("creates PERSON+LIBRARIAN atomically (server-assigned IDs), updates, and deletes both (as management)", async () => {
    const createRes = await createLibrarian(
      makeRequest(
        "POST",
        "/api/librarians",
        {
          full_name: "Test Librarian",
          email: "test.librarian@example.com",
          gender: "F",
          staff_id: "STF-TEST-99",
          position: "Librarian",
        },
        managementCookie()
      )
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
      makeRequest("PUT", `/api/librarians/${librarianId}`, { position: "Senior Librarian" }, managementCookie()),
      ctx(librarianId)
    );
    const afterUpdate = await getLibrarian(makeRequest("GET", `/api/librarians/${librarianId}`), ctx(librarianId));
    expect((await afterUpdate.json()).data.POSITION).toBe("Senior Librarian");

    const deleteRes = await deleteLibrarian(
      makeRequest("DELETE", `/api/librarians/${librarianId}`, undefined, managementCookie()),
      ctx(librarianId)
    );
    expect((await deleteRes.json()).success).toBe(true);

    const afterDelete = await getLibrarian(makeRequest("GET", `/api/librarians/${librarianId}`), ctx(librarianId));
    expect(afterDelete.status).toBe(404);
  });

  it("rejects create/edit/delete of librarian accounts from a non-management (staff) librarian", async () => {
    const createAttempt = await createLibrarian(
      makeRequest(
        "POST",
        "/api/librarians",
        { full_name: "x", email: "blocked@example.com", gender: "M", staff_id: "STF-BLOCK-1", position: "Librarian" },
        staffCookie()
      )
    );
    expect(createAttempt.status).toBe(403);

    // use a management session to set up a real record to attempt editing/deleting as staff
    const setupRes = await createLibrarian(
      makeRequest(
        "POST",
        "/api/librarians",
        { full_name: "Setup", email: "setup.permtest@example.com", gender: "M", staff_id: "STF-SETUP-1", position: "Librarian" },
        managementCookie()
      )
    );
    const librarianId = (await setupRes.json()).data.librarian_id;

    const editAttempt = await updateLibrarian(
      makeRequest("PUT", `/api/librarians/${librarianId}`, { position: "Hacked" }, staffCookie()),
      ctx(librarianId)
    );
    expect(editAttempt.status).toBe(403);

    const deleteAttempt = await deleteLibrarian(
      makeRequest("DELETE", `/api/librarians/${librarianId}`, undefined, staffCookie()),
      ctx(librarianId)
    );
    expect(deleteAttempt.status).toBe(403);

    // clean up with a management session
    await deleteLibrarian(
      makeRequest("DELETE", `/api/librarians/${librarianId}`, undefined, managementCookie()),
      ctx(librarianId)
    );
  });
});
