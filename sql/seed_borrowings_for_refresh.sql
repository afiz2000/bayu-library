SET DEFINE OFF
-- ============================================================
-- BAYU LIBRARY — SAMPLE BORROWINGS FOR THE REFRESHED CATALOGUE
-- Run AFTER refresh_books_from_jpm_library.sql.
-- Uses the real triggers (trg_borrowing_after_insert /
-- trg_borrowing_after_return) to keep AVAILABLE_COPIES correct —
-- inserts as BORROWED first, then UPDATEs RETURN_DATE for
-- historical returns, exactly like the real app does.
-- ============================================================

-- Reset stock: the book refresh script set some ad-hoc availability
-- numbers with no real borrowings behind them. Start every title at
-- full stock so the inserts below are the only source of truth.
UPDATE BOOK SET available_copies = total_copies;
COMMIT;

INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR001', 'M001', 'B005', 'L001', DATE '2025-01-05', DATE '2025-02-04', 'BORROWED');
UPDATE BORROWING SET return_date = DATE '2025-02-02', status = 'RETURNED', fine_amount = fn_calculate_fine(due_date, DATE '2025-02-02') WHERE borrow_id = 'BR001';
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR002', 'M002', 'B012', 'L002', DATE '2025-01-20', DATE '2025-02-03', 'BORROWED');
UPDATE BORROWING SET return_date = DATE '2025-02-09', status = 'RETURNED', fine_amount = fn_calculate_fine(due_date, DATE '2025-02-09') WHERE borrow_id = 'BR002';
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR003', 'M003', 'B023', 'L003', DATE '2025-02-03', DATE '2025-03-05', 'BORROWED');
UPDATE BORROWING SET return_date = DATE '2025-03-03', status = 'RETURNED', fine_amount = fn_calculate_fine(due_date, DATE '2025-03-03') WHERE borrow_id = 'BR003';
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR004', 'M004', 'B034', 'L004', DATE '2025-02-18', DATE '2025-03-04', 'BORROWED');
UPDATE BORROWING SET return_date = DATE '2025-03-12', status = 'RETURNED', fine_amount = fn_calculate_fine(due_date, DATE '2025-03-12') WHERE borrow_id = 'BR004';
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR005', 'M005', 'B041', 'L005', DATE '2025-03-02', DATE '2025-03-16', 'BORROWED');
UPDATE BORROWING SET return_date = DATE '2025-03-14', status = 'RETURNED', fine_amount = fn_calculate_fine(due_date, DATE '2025-03-14') WHERE borrow_id = 'BR005';
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR006', 'M006', 'B052', 'L006', DATE '2025-03-15', DATE '2025-04-14', 'BORROWED');
UPDATE BORROWING SET return_date = DATE '2025-04-24', status = 'RETURNED', fine_amount = fn_calculate_fine(due_date, DATE '2025-04-24') WHERE borrow_id = 'BR006';
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR007', 'M008', 'B063', 'L007', DATE '2025-04-01', DATE '2025-04-15', 'BORROWED');
UPDATE BORROWING SET return_date = DATE '2025-04-13', status = 'RETURNED', fine_amount = fn_calculate_fine(due_date, DATE '2025-04-13') WHERE borrow_id = 'BR007';
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR008', 'M009', 'B071', 'L001', DATE '2025-04-20', DATE '2025-05-20', 'BORROWED');
UPDATE BORROWING SET return_date = DATE '2025-05-26', status = 'RETURNED', fine_amount = fn_calculate_fine(due_date, DATE '2025-05-26') WHERE borrow_id = 'BR008';
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR009', 'M010', 'B082', 'L002', DATE '2025-05-05', DATE '2025-05-19', 'BORROWED');
UPDATE BORROWING SET return_date = DATE '2025-05-17', status = 'RETURNED', fine_amount = fn_calculate_fine(due_date, DATE '2025-05-17') WHERE borrow_id = 'BR009';
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR010', 'M012', 'B090', 'L003', DATE '2025-05-25', DATE '2025-06-24', 'BORROWED');
UPDATE BORROWING SET return_date = DATE '2025-07-02', status = 'RETURNED', fine_amount = fn_calculate_fine(due_date, DATE '2025-07-02') WHERE borrow_id = 'BR010';
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR011', 'M013', 'B098', 'L004', DATE '2025-06-10', DATE '2025-06-24', 'BORROWED');
UPDATE BORROWING SET return_date = DATE '2025-06-22', status = 'RETURNED', fine_amount = fn_calculate_fine(due_date, DATE '2025-06-22') WHERE borrow_id = 'BR011';
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR012', 'M014', 'B103', 'L005', DATE '2025-07-01', DATE '2025-07-15', 'BORROWED');
UPDATE BORROWING SET return_date = DATE '2025-07-25', status = 'RETURNED', fine_amount = fn_calculate_fine(due_date, DATE '2025-07-25') WHERE borrow_id = 'BR012';
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR013', 'M015', 'B108', 'L006', DATE '2025-08-15', DATE '2025-09-14', 'BORROWED');
UPDATE BORROWING SET return_date = DATE '2025-09-12', status = 'RETURNED', fine_amount = fn_calculate_fine(due_date, DATE '2025-09-12') WHERE borrow_id = 'BR013';
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR014', 'M016', 'B112', 'L007', DATE '2025-09-10', DATE '2025-09-24', 'BORROWED');
UPDATE BORROWING SET return_date = DATE '2025-09-30', status = 'RETURNED', fine_amount = fn_calculate_fine(due_date, DATE '2025-09-30') WHERE borrow_id = 'BR014';
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR015', 'M017', 'B120', 'L001', DATE '2026-06-20', DATE '2026-07-20', 'BORROWED');
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR016', 'M018', 'B128', 'L002', DATE '2026-06-25', DATE '2026-07-09', 'BORROWED');
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR017', 'M019', 'B133', 'L003', DATE '2026-07-01', DATE '2026-07-31', 'BORROWED');
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR018', 'M021', 'B136', 'L004', DATE '2026-07-05', DATE '2026-07-19', 'BORROWED');
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR019', 'M001', 'B140', 'L005', DATE '2026-07-10', DATE '2026-08-09', 'BORROWED');
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR020', 'M002', 'B145', 'L006', DATE '2026-07-15', DATE '2026-07-29', 'BORROWED');
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR021', 'M003', 'B150', 'L007', DATE '2026-07-18', DATE '2026-08-17', 'BORROWED');
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR022', 'M004', 'B154', 'L001', DATE '2026-07-20', DATE '2026-08-03', 'BORROWED');
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR023', 'M005', 'B160', 'L002', DATE '2026-04-01', DATE '2026-04-15', 'BORROWED');
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR024', 'M006', 'B165', 'L003', DATE '2026-04-15', DATE '2026-05-15', 'BORROWED');
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR025', 'M008', 'B170', 'L004', DATE '2026-05-01', DATE '2026-05-15', 'BORROWED');
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR026', 'M009', 'B003', 'L005', DATE '2026-05-10', DATE '2026-06-09', 'BORROWED');
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR027', 'M010', 'B017', 'L006', DATE '2026-05-20', DATE '2026-06-03', 'BORROWED');
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR028', 'M012', 'B029', 'L007', DATE '2026-06-01', DATE '2026-07-01', 'BORROWED');
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR029', 'M013', 'B045', 'L001', DATE '2026-06-05', DATE '2026-06-19', 'BORROWED');
INSERT INTO BORROWING (borrow_id, member_id, book_id, librarian_id, borrow_date, due_date, status) VALUES ('BR030', 'M014', 'B060', 'L002', DATE '2026-06-10', DATE '2026-06-24', 'BORROWED');

COMMIT;

-- ---- Verify ----
SELECT status, COUNT(*) FROM BORROWING GROUP BY status;
SELECT 'BORROWING' tbl, COUNT(*) rows_ FROM BORROWING;