import { describe, it, expect, afterAll } from "vitest";
import { GET as listBorrowings, POST as createBorrowing } from "@/app/api/borrowings/route";
import { POST as returnBook } from "@/app/api/borrowings/[id]/return/route";
import { GET as getBook } from "@/app/api/books/[id]/route";
import { executeDML } from "@/lib/db";
import { makeRequest, ctx } from "../tests/helpers";

const MEMBER_ID = "M001";
const LIBRARIAN_ID = "L001";

// BORROWING has no DELETE endpoint by design (audit trail), so tests must
// purge their own server-assigned rows directly to avoid polluting real data.
const createdIds: string[] = [];

afterAll(async () => {
  if (createdIds.length === 0) return;
  const placeholders = createdIds.map((_, i) => `:${i + 1}`).join(", ");
  await executeDML(`DELETE FROM BORROWING WHERE BORROW_ID IN (${placeholders})`, createdIds);
});

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function availableCopies(bookId: string): Promise<number> {
  const res = await getBook(makeRequest("GET", `/api/books/${bookId}`), ctx(bookId));
  return (await res.json()).data.AVAILABLE_COPIES;
}

async function createTestBorrowing(overrides: Record<string, unknown>) {
  const res = await createBorrowing(
    makeRequest("POST", "/api/borrowings", {
      member_id: MEMBER_ID,
      librarian_id: LIBRARIAN_ID,
      ...overrides,
    })
  );
  const body = await res.json();
  if (body.success) createdIds.push(body.data.borrow_id);
  return { res, body };
}

describe("borrowings API", () => {
  it("decrements available copies on borrow and restores them on return with zero fine", async () => {
    const bookId = "B002";
    const before = await availableCopies(bookId);

    const { res: createRes, body: createBody } = await createTestBorrowing({
      book_id: bookId,
      borrow_date: todayIso(),
      due_date: todayIso(),
    });
    expect(createRes.status).toBe(201);
    expect(createBody.data.borrow_id).toMatch(/^BR\d+$/);
    expect(await availableCopies(bookId)).toBe(before - 1);

    const borrowId = createBody.data.borrow_id;
    const returnRes = await returnBook(
      makeRequest("POST", `/api/borrowings/${borrowId}/return`, { return_date: todayIso() }),
      ctx(borrowId)
    );
    const returnBody = await returnRes.json();
    expect(returnBody.success).toBe(true);
    expect(returnBody.data.fine_amount).toBe(0);
    expect(await availableCopies(bookId)).toBe(before);
  });

  it("auto-flips overdue borrowings to OVERDUE and computes a fine on return", async () => {
    const bookId = "B003";

    const { body: createBody } = await createTestBorrowing({
      book_id: bookId,
      borrow_date: "2020-01-01",
      due_date: "2020-01-15",
    });
    const borrowId = createBody.data.borrow_id;

    const listRes = await listBorrowings();
    const listBody = await listRes.json();
    const row = listBody.data.find((b: { BORROW_ID: string }) => b.BORROW_ID === borrowId);
    expect(row.STATUS).toBe("OVERDUE");
    expect(row.FINE_AMOUNT).toBeGreaterThan(0);

    const returnRes = await returnBook(
      makeRequest("POST", `/api/borrowings/${borrowId}/return`, { return_date: "2020-01-20" }),
      ctx(borrowId)
    );
    const returnBody = await returnRes.json();
    expect(returnBody.data.fine_amount).toBe(5);
  });

  it("rejects borrowing a book with no available copies", async () => {
    const bookId = "B012";
    const stock = await availableCopies(bookId);
    const borrowIds: string[] = [];

    for (let i = 0; i < stock; i++) {
      const { res, body } = await createTestBorrowing({
        book_id: bookId,
        borrow_date: todayIso(),
        due_date: todayIso(),
      });
      expect(res.status).toBe(201);
      borrowIds.push(body.data.borrow_id);
    }

    expect(await availableCopies(bookId)).toBe(0);

    const { res: overflowRes, body: overflowBody } = await createTestBorrowing({
      book_id: bookId,
      borrow_date: todayIso(),
      due_date: todayIso(),
    });
    expect(overflowRes.status).toBe(409);
    expect(overflowBody.error).not.toMatch(/ORA-/);

    for (const id of borrowIds) {
      await returnBook(makeRequest("POST", `/api/borrowings/${id}/return`, { return_date: todayIso() }), ctx(id));
    }
    expect(await availableCopies(bookId)).toBe(stock);
  });
});
