import { describe, it, expect, afterAll } from "vitest";
import { GET as listBorrowings, POST as createBorrowing } from "@/app/api/borrowings/route";
import { POST as returnBook } from "@/app/api/borrowings/[id]/return/route";
import { GET as getBook } from "@/app/api/books/[id]/route";
import { executeDML } from "@/lib/db";
import { makeRequest, ctx } from "../tests/helpers";

// BORROWING has no DELETE endpoint by design (audit trail), so tests
// must purge their own rows directly to avoid polluting real data.
afterAll(async () => {
  await executeDML(`DELETE FROM BORROWING WHERE BORROW_ID LIKE 'TST_%'`);
});

const MEMBER_ID = "M001";
const LIBRARIAN_ID = "L001";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function availableCopies(bookId: string): Promise<number> {
  const res = await getBook(makeRequest("GET", `/api/books/${bookId}`), ctx(bookId));
  return (await res.json()).data.AVAILABLE_COPIES;
}

describe("borrowings API", () => {
  it("decrements available copies on borrow and restores them on return with zero fine", async () => {
    const bookId = "B002";
    const before = await availableCopies(bookId);

    const borrowId = "TST_BR01";
    const createRes = await createBorrowing(
      makeRequest("POST", "/api/borrowings", {
        borrow_id: borrowId,
        member_id: MEMBER_ID,
        book_id: bookId,
        librarian_id: LIBRARIAN_ID,
        borrow_date: todayIso(),
        due_date: todayIso(),
      })
    );
    expect(createRes.status).toBe(201);
    expect(await availableCopies(bookId)).toBe(before - 1);

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
    const borrowId = "TST_BR02";

    await createBorrowing(
      makeRequest("POST", "/api/borrowings", {
        borrow_id: borrowId,
        member_id: MEMBER_ID,
        book_id: bookId,
        librarian_id: LIBRARIAN_ID,
        borrow_date: "2020-01-01",
        due_date: "2020-01-15",
      })
    );

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
    const ids = Array.from({ length: stock }, (_, i) => `TST_BR_STOCK${i}`);

    for (const id of ids) {
      const res = await createBorrowing(
        makeRequest("POST", "/api/borrowings", {
          borrow_id: id,
          member_id: MEMBER_ID,
          book_id: bookId,
          librarian_id: LIBRARIAN_ID,
          borrow_date: todayIso(),
          due_date: todayIso(),
        })
      );
      expect(res.status).toBe(201);
    }

    expect(await availableCopies(bookId)).toBe(0);

    const overflowRes = await createBorrowing(
      makeRequest("POST", "/api/borrowings", {
        borrow_id: "TST_BR_OVERFLOW",
        member_id: MEMBER_ID,
        book_id: bookId,
        librarian_id: LIBRARIAN_ID,
        borrow_date: todayIso(),
        due_date: todayIso(),
      })
    );
    expect(overflowRes.status).toBe(409);
    const overflowBody = await overflowRes.json();
    expect(overflowBody.error).not.toMatch(/ORA-/);

    for (const id of ids) {
      await returnBook(makeRequest("POST", `/api/borrowings/${id}/return`, { return_date: todayIso() }), ctx(id));
    }
    expect(await availableCopies(bookId)).toBe(stock);
  });
});
