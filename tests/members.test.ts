import { describe, it, expect } from "vitest";
import { POST as createMember } from "@/app/api/members/route";
import { GET as getMember, PUT as updateMember, DELETE as deleteMember } from "@/app/api/members/[id]/route";
import { makeRequest, ctx, managementCookie } from "../tests/helpers";

describe("members API", () => {
  it("creates PERSON+MEMBER atomically (server-assigned IDs), updates, and deletes both", async () => {
    const createRes = await createMember(
      makeRequest("POST", "/api/members", {
        full_name: "Test Member",
        email: "test.member@example.com",
        gender: "M",
        membership_date: "2026-01-01",
        membership_type: "STANDARD",
        status: "ACTIVE",
      })
    );
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    const memberId = createBody.data.member_id;
    const personId = createBody.data.person_id;
    expect(memberId).toMatch(/^M\d+$/);
    expect(personId).toMatch(/^P\d+$/);

    const getRes = await getMember(makeRequest("GET", `/api/members/${memberId}`), ctx(memberId));
    const getBody = await getRes.json();
    expect(getBody.data.FULL_NAME).toBe("Test Member");
    expect(getBody.data.PERSON_ID).toBe(personId);

    await updateMember(
      makeRequest("PUT", `/api/members/${memberId}`, { status: "INACTIVE" }),
      ctx(memberId)
    );
    const afterUpdate = await getMember(makeRequest("GET", `/api/members/${memberId}`), ctx(memberId));
    expect((await afterUpdate.json()).data.STATUS).toBe("INACTIVE");

    const deleteRes = await deleteMember(
      makeRequest("DELETE", `/api/members/${memberId}`, undefined, managementCookie()),
      ctx(memberId)
    );
    expect((await deleteRes.json()).success).toBe(true);

    const afterDelete = await getMember(makeRequest("GET", `/api/members/${memberId}`), ctx(memberId));
    expect(afterDelete.status).toBe(404);
  });

  it("returns a friendly error (not raw ORA-) for a duplicate email, without retrying the ID", async () => {
    const payload = {
      full_name: "Dup Email Member",
      email: "dup.email.test@example.com",
      gender: "F",
      membership_date: "2026-01-01",
      membership_type: "STANDARD",
      status: "ACTIVE",
    };

    const first = await createMember(makeRequest("POST", "/api/members", payload));
    const firstBody = await first.json();
    expect(firstBody.success).toBe(true);

    const second = await createMember(makeRequest("POST", "/api/members", payload));
    const secondBody = await second.json();
    expect(secondBody.success).toBe(false);
    expect(secondBody.error).not.toMatch(/ORA-/);

    await deleteMember(
      makeRequest("DELETE", `/api/members/${firstBody.data.member_id}`, undefined, managementCookie()),
      ctx(firstBody.data.member_id)
    );
  });
});
