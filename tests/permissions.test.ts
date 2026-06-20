import { describe, it, expect } from "vitest";
import { isManagementPosition } from "@/lib/isManagementPosition";

describe("isManagementPosition", () => {
  it("treats Head and Senior librarians as management, case-insensitively", () => {
    expect(isManagementPosition("Head Librarian")).toBe(true);
    expect(isManagementPosition("senior librarian")).toBe(true);
    expect(isManagementPosition("SENIOR LIBRARIAN")).toBe(true);
  });

  it("treats other titles, including unrecognized free text, as staff (fail safe)", () => {
    expect(isManagementPosition("Librarian")).toBe(false);
    expect(isManagementPosition("Assistant Librarian")).toBe(false);
    expect(isManagementPosition("Intern")).toBe(false);
    expect(isManagementPosition("")).toBe(false);
  });
});
