import { describe, it, expect } from "vitest";
import { POST as createMember } from "@/app/api/members/route";
import { GET as getMember, PUT as updateMember, DELETE as deleteMember } from "@/app/api/members/[id]/route";
import { makeRequest, ctx } from "../tests/helpers";

const PERSON_ID = "TST_P01";
const MEMBER_ID = "TST_M01";

describe("members API", () => {
  it("creates PERSON+MEMBER atomically, updates, and deletes both", async () => {
    const createRes = await createMember(
      makeRequest("POST", "/api/members", {
        person_id: PERSON_ID,
        full_name: "Test Member",
        email: "test.member@example.com",
        gender: "M",
        member_id: MEMBER_ID,
        membership_date: "2026-01-01",
        membership_type: "STANDARD",
        status: "ACTIVE",
      })
    );
    expect(createRes.status).toBe(201);

    const getRes = await getMember(makeRequest("GET", `/api/members/${MEMBER_ID}`), ctx(MEMBER_ID));
    const getBody = await getRes.json();
    expect(getBody.data.FULL_NAME).toBe("Test Member");
    expect(getBody.data.PERSON_ID).toBe(PERSON_ID);

    await updateMember(
      makeRequest("PUT", `/api/members/${MEMBER_ID}`, { status: "INACTIVE" }),
      ctx(MEMBER_ID)
    );
    const afterUpdate = await getMember(makeRequest("GET", `/api/members/${MEMBER_ID}`), ctx(MEMBER_ID));
    expect((await afterUpdate.json()).data.STATUS).toBe("INACTIVE");

    const deleteRes = await deleteMember(makeRequest("DELETE", `/api/members/${MEMBER_ID}`), ctx(MEMBER_ID));
    expect((await deleteRes.json()).success).toBe(true);

    const afterDelete = await getMember(makeRequest("GET", `/api/members/${MEMBER_ID}`), ctx(MEMBER_ID));
    expect(afterDelete.status).toBe(404);
  });
});
