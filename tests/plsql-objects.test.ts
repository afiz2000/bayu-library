import { describe, it, expect } from "vitest";
import { executeQuery } from "@/lib/db";

describe("fn_calculate_fine", () => {
  it("returns 0 when returned on or before the due date", async () => {
    const rows = await executeQuery<{ FINE: number }>(
      `SELECT fn_calculate_fine(DATE '2026-01-15', DATE '2026-01-15') AS FINE FROM DUAL`
    );
    expect(rows[0].FINE).toBe(0);

    const early = await executeQuery<{ FINE: number }>(
      `SELECT fn_calculate_fine(DATE '2026-01-15', DATE '2026-01-10') AS FINE FROM DUAL`
    );
    expect(early[0].FINE).toBe(0);
  });

  it("returns the number of days late at RM1/day", async () => {
    const rows = await executeQuery<{ FINE: number }>(
      `SELECT fn_calculate_fine(DATE '2026-01-15', DATE '2026-01-20') AS FINE FROM DUAL`
    );
    expect(rows[0].FINE).toBe(5);
  });
});

describe("vw_overdue_report", () => {
  it("has the expected report columns and only OVERDUE rows", async () => {
    const rows = await executeQuery<{
      BORROW_ID: string;
      MEMBER_NAME: string;
      BOOK_TITLE: string;
      DAYS_OVERDUE: number;
    }>(`SELECT * FROM vw_overdue_report`);

    for (const row of rows) {
      expect(row.BORROW_ID).toBeTruthy();
      expect(row.MEMBER_NAME).toBeTruthy();
      expect(row.BOOK_TITLE).toBeTruthy();
      expect(row.DAYS_OVERDUE).toBeGreaterThan(0);
    }
  });
});

describe("vw_book_popularity", () => {
  it("ranks books by how often they've been borrowed", async () => {
    const rows = await executeQuery<{ BOOK_ID: string; TITLE: string; TIMES_BORROWED: number }>(
      `SELECT * FROM vw_book_popularity`
    );
    expect(rows.length).toBeGreaterThan(0);

    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].TIMES_BORROWED).toBeGreaterThanOrEqual(rows[i].TIMES_BORROWED);
    }
  });
});
