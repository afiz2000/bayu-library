import { describe, it, expect } from "vitest";
import { toFriendlyMessage } from "@/lib/errors";

describe("toFriendlyMessage", () => {
  it("maps unique constraint violations to a friendly message", () => {
    const msg = toFriendlyMessage(new Error('ORA-00001: unique constraint (BAYU_LIBRARY.PK_CATEGORY) violated'));
    expect(msg).not.toMatch(/ORA-/);
    expect(msg.toLowerCase()).toContain("already exists");
  });

  it("maps foreign key violations to a friendly message", () => {
    const msg = toFriendlyMessage(new Error("ORA-02291: integrity constraint violated - parent key not found"));
    expect(msg.toLowerCase()).toContain("does not exist");
  });

  it("maps connection errors to a friendly message", () => {
    const msg = toFriendlyMessage(new Error("NJS-518: cannot connect to Oracle Database"));
    expect(msg).not.toMatch(/NJS-/);
  });

  it("passes through application-level errors unchanged", () => {
    expect(toFriendlyMessage(new Error("Book not found"))).toBe("Book not found");
  });
});
