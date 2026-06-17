import { describe, it, expect } from "vitest";
import { POST as createLibrarian } from "@/app/api/librarians/route";
import { GET as getLibrarian, PUT as updateLibrarian, DELETE as deleteLibrarian } from "@/app/api/librarians/[id]/route";
import { makeRequest, ctx } from "../tests/helpers";

const PERSON_ID = "TST_P02";
const LIBRARIAN_ID = "TST_L01";

describe("librarians API", () => {
  it("creates PERSON+LIBRARIAN atomically, updates, and deletes both", async () => {
    const createRes = await createLibrarian(
      makeRequest("POST", "/api/librarians", {
        person_id: PERSON_ID,
        full_name: "Test Librarian",
        email: "test.librarian@example.com",
        gender: "F",
        librarian_id: LIBRARIAN_ID,
        staff_id: "STF-TEST-99",
        position: "Librarian",
      })
    );
    expect(createRes.status).toBe(201);

    const getRes = await getLibrarian(makeRequest("GET", `/api/librarians/${LIBRARIAN_ID}`), ctx(LIBRARIAN_ID));
    const getBody = await getRes.json();
    expect(getBody.data.STAFF_ID).toBe("STF-TEST-99");

    await updateLibrarian(
      makeRequest("PUT", `/api/librarians/${LIBRARIAN_ID}`, { position: "Senior Librarian" }),
      ctx(LIBRARIAN_ID)
    );
    const afterUpdate = await getLibrarian(makeRequest("GET", `/api/librarians/${LIBRARIAN_ID}`), ctx(LIBRARIAN_ID));
    expect((await afterUpdate.json()).data.POSITION).toBe("Senior Librarian");

    const deleteRes = await deleteLibrarian(makeRequest("DELETE", `/api/librarians/${LIBRARIAN_ID}`), ctx(LIBRARIAN_ID));
    expect((await deleteRes.json()).success).toBe(true);

    const afterDelete = await getLibrarian(makeRequest("GET", `/api/librarians/${LIBRARIAN_ID}`), ctx(LIBRARIAN_ID));
    expect(afterDelete.status).toBe(404);
  });
});
