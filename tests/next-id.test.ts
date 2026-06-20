import { describe, it, expect } from "vitest";
import { GET as nextId } from "@/app/api/next-id/[entity]/route";
import { makeRequest, ctxWith } from "../tests/helpers";

describe("next-id API", () => {
  it("suggests the next ID for each known entity, matching its prefix/width convention", async () => {
    const cases: [string, RegExp][] = [
      ["category", /^CAT\d{2,}$/],
      ["author", /^A\d{3,}$/],
      ["member", /^M\d{3,}$/],
      ["librarian", /^L\d{3,}$/],
      ["book", /^B\d{3,}$/],
      ["borrowing", /^BR\d{3,}$/],
      ["person", /^P\d{3,}$/],
    ];

    for (const [entity, pattern] of cases) {
      const res = await nextId(makeRequest("GET", `/api/next-id/${entity}`), ctxWith({ entity }));
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toMatch(pattern);
    }
  });

  it("rejects an unknown entity", async () => {
    const res = await nextId(makeRequest("GET", "/api/next-id/nonsense"), ctxWith({ entity: "nonsense" }));
    expect(res.status).toBe(400);
  });
});
