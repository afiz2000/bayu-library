import { getNextId, type IdEntity } from "@/lib/nextId";

// Only treat it as a retryable ID collision when the violated constraint is a
// primary key (the master schema names every PK "pk_..."). A duplicate ISBN,
// email, or staff_id also raises ORA-00001 but retrying with a new generated
// ID would never fix that — it would just loop until max attempts and hide
// the real, user-actionable error.
export function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Error && /ORA-00001/.test(err.message) && /\bPK_/i.test(err.message);
}

// Generates one or more IDs (e.g. { person_id: "person", member_id: "member" }),
// runs `attempt` with them, and if it fails on a PK/unique collision (another
// request won the race between "next ID" and the actual INSERT), regenerates
// fresh IDs and retries. The caller's `attempt` must be safe to re-run from
// scratch (executeTransaction already rolls back partial work on error).
export async function createWithIdRetry<T>(
  idEntities: Record<string, IdEntity>,
  attempt: (ids: Record<string, string>) => Promise<T>,
  maxAttempts = 3
): Promise<{ result: T; ids: Record<string, string>; reassigned: boolean }> {
  async function generateIds(): Promise<Record<string, string>> {
    const entries = await Promise.all(
      Object.entries(idEntities).map(async ([key, entity]) => [key, await getNextId(entity)] as const)
    );
    return Object.fromEntries(entries);
  }

  let ids = await generateIds();
  let reassigned = false;

  for (let attemptNum = 1; attemptNum <= maxAttempts; attemptNum++) {
    try {
      const result = await attempt(ids);
      return { result, ids, reassigned };
    } catch (err) {
      if (isUniqueConstraintError(err) && attemptNum < maxAttempts) {
        ids = await generateIds();
        reassigned = true;
        continue;
      }
      throw err;
    }
  }

  throw new Error("Failed to create record after maximum retry attempts");
}
