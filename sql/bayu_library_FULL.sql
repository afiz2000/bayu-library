-- ============================================================
-- BAYU LIBRARY MANAGEMENT SYSTEM
-- MASTER SCRIPT - Run semua dalam urutan betul
-- ICT502 Database Engineering - Group 2 NBCS2306A
-- ============================================================
-- Cara guna dalam SQL Developer:
--   1. Login sebagai SYS dengan role SYSDBA
--   2. Run script ni (F5)
-- ============================================================

-- ============================================================
-- BAHAGIAN 1: DROP USER (kalau dah ada)
-- ============================================================

-- Ignore error ORA-01918 kalau user tak wujud lagi
BEGIN
    EXECUTE IMMEDIATE 'DROP USER bayu_library CASCADE';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -1918 THEN
            NULL; -- user tak wujud, skip je
        ELSE
            RAISE;
        END IF;
END;
/

-- ============================================================
-- BAHAGIAN 2: CREATE USER
-- Note: Password dalam double quotes sebab ada special char
-- ============================================================

CREATE USER bayu_library
    IDENTIFIED BY "Bayu@2026"
    DEFAULT TABLESPACE USERS
    TEMPORARY TABLESPACE TEMP
    QUOTA UNLIMITED ON USERS;

-- ============================================================
-- BAHAGIAN 3: GRANT PRIVILEGES
-- ============================================================

GRANT CONNECT          TO bayu_library;
GRANT RESOURCE         TO bayu_library;
GRANT CREATE SESSION   TO bayu_library;
GRANT CREATE TABLE     TO bayu_library;
GRANT CREATE VIEW      TO bayu_library;
GRANT CREATE SEQUENCE  TO bayu_library;
GRANT CREATE TRIGGER   TO bayu_library;
GRANT CREATE PROCEDURE TO bayu_library;
GRANT UNLIMITED TABLESPACE TO bayu_library;

-- ============================================================
-- BAHAGIAN 4: SWITCH KE SCHEMA BAYU_LIBRARY
-- ============================================================

ALTER SESSION SET CURRENT_SCHEMA = bayu_library;

-- ============================================================
-- BAHAGIAN 5: CREATE TABLES
-- (Semua table akan masuk dalam schema bayu_library)
-- ============================================================

-- 1. PERSON (Supertype)
CREATE TABLE PERSON (
    person_id       VARCHAR2(10)    NOT NULL,
    full_name       VARCHAR2(100)   NOT NULL,
    email           VARCHAR2(100)   NOT NULL,
    phone           VARCHAR2(20),
    address         VARCHAR2(255),
    gender          CHAR(1)         NOT NULL,
    person_type     VARCHAR2(10)    NOT NULL,
    CONSTRAINT pk_person        PRIMARY KEY (person_id),
    CONSTRAINT uq_person_email  UNIQUE (email),
    CONSTRAINT ck_person_gender CHECK (gender IN ('M', 'F')),
    CONSTRAINT ck_person_type   CHECK (person_type IN ('MEMBER', 'LIBRARIAN'))
);

-- 2. MEMBER (Subtype)
CREATE TABLE MEMBER (
    member_id           VARCHAR2(10)    NOT NULL,
    person_id           VARCHAR2(10)    NOT NULL,
    membership_date     DATE            NOT NULL,
    membership_type     VARCHAR2(20)    NOT NULL,
    status              VARCHAR2(10)    NOT NULL,
    CONSTRAINT pk_member            PRIMARY KEY (member_id),
    CONSTRAINT uq_member_person     UNIQUE (person_id),
    CONSTRAINT fk_member_person     FOREIGN KEY (person_id) REFERENCES PERSON(person_id),
    CONSTRAINT ck_member_type       CHECK (membership_type IN ('STANDARD', 'PREMIUM')),
    CONSTRAINT ck_member_status     CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

-- 3. LIBRARIAN (Subtype)
CREATE TABLE LIBRARIAN (
    librarian_id    VARCHAR2(10)    NOT NULL,
    person_id       VARCHAR2(10)    NOT NULL,
    staff_id        VARCHAR2(20)    NOT NULL,
    position        VARCHAR2(50)    NOT NULL,
    CONSTRAINT pk_librarian         PRIMARY KEY (librarian_id),
    CONSTRAINT uq_librarian_person  UNIQUE (person_id),
    CONSTRAINT uq_librarian_staff   UNIQUE (staff_id),
    CONSTRAINT fk_librarian_person  FOREIGN KEY (person_id) REFERENCES PERSON(person_id)
);

-- 4. CATEGORY (Recursive)
CREATE TABLE CATEGORY (
    category_id     VARCHAR2(10)    NOT NULL,
    category_name   VARCHAR2(100)   NOT NULL,
    parent_id       VARCHAR2(10),
    CONSTRAINT pk_category          PRIMARY KEY (category_id),
    CONSTRAINT fk_category_parent   FOREIGN KEY (parent_id) REFERENCES CATEGORY(category_id)
);

-- 5. AUTHOR
CREATE TABLE AUTHOR (
    author_id       VARCHAR2(10)    NOT NULL,
    author_name     VARCHAR2(100)   NOT NULL,
    nationality     VARCHAR2(50),
    CONSTRAINT pk_author PRIMARY KEY (author_id)
);

-- 6. BOOK
CREATE TABLE BOOK (
    book_id             VARCHAR2(10)    NOT NULL,
    category_id         VARCHAR2(10)    NOT NULL,
    title               VARCHAR2(255)   NOT NULL,
    isbn                VARCHAR2(20)    NOT NULL,
    publish_year        NUMBER(4)       NOT NULL,
    publisher           VARCHAR2(100),
    total_copies        NUMBER(5)       NOT NULL,
    available_copies    NUMBER(5)       NOT NULL,
    CONSTRAINT pk_book              PRIMARY KEY (book_id),
    CONSTRAINT uq_book_isbn         UNIQUE (isbn),
    CONSTRAINT fk_book_category     FOREIGN KEY (category_id) REFERENCES CATEGORY(category_id),
    CONSTRAINT ck_book_copies       CHECK (available_copies >= 0),
    CONSTRAINT ck_book_total        CHECK (total_copies >= 0),
    CONSTRAINT ck_book_avail_total  CHECK (available_copies <= total_copies),
    CONSTRAINT ck_book_year         CHECK (publish_year BETWEEN 1000 AND 9999)
);

-- 7. BOOK_AUTHOR (Bridge M:N)
CREATE TABLE BOOK_AUTHOR (
    book_id     VARCHAR2(10)    NOT NULL,
    author_id   VARCHAR2(10)    NOT NULL,
    CONSTRAINT pk_book_author       PRIMARY KEY (book_id, author_id),
    CONSTRAINT fk_bookauthor_book   FOREIGN KEY (book_id)   REFERENCES BOOK(book_id),
    CONSTRAINT fk_bookauthor_author FOREIGN KEY (author_id) REFERENCES AUTHOR(author_id)
);

-- 8. BORROWING (Transaksi Utama)
CREATE TABLE BORROWING (
    borrow_id       VARCHAR2(10)    NOT NULL,
    member_id       VARCHAR2(10)    NOT NULL,
    book_id         VARCHAR2(10)    NOT NULL,
    librarian_id    VARCHAR2(10)    NOT NULL,
    borrow_date     DATE            NOT NULL,
    due_date        DATE            NOT NULL,
    return_date     DATE,
    fine_amount     NUMBER(10, 2)   DEFAULT 0,
    status          VARCHAR2(10)    NOT NULL,
    CONSTRAINT pk_borrowing             PRIMARY KEY (borrow_id),
    CONSTRAINT fk_borrowing_member      FOREIGN KEY (member_id)    REFERENCES MEMBER(member_id),
    CONSTRAINT fk_borrowing_book        FOREIGN KEY (book_id)      REFERENCES BOOK(book_id),
    CONSTRAINT fk_borrowing_librarian   FOREIGN KEY (librarian_id) REFERENCES LIBRARIAN(librarian_id),
    CONSTRAINT ck_borrowing_due         CHECK (due_date >= borrow_date),
    CONSTRAINT ck_borrowing_return      CHECK (return_date IS NULL OR return_date >= borrow_date),
    CONSTRAINT ck_borrowing_fine        CHECK (fine_amount >= 0),
    CONSTRAINT ck_borrowing_status      CHECK (status IN ('BORROWED', 'RETURNED', 'OVERDUE'))
);

-- ============================================================
-- BAHAGIAN 6: VERIFY - Semak table yang berjaya dicipta
-- ============================================================

SELECT table_name 
FROM all_tables 
WHERE owner = 'BAYU_LIBRARY' 
ORDER BY table_name;

-- ============================================================
-- End of Master Script
-- ============================================================


-- ============================================================
-- BAYU LIBRARY MANAGEMENT SYSTEM
-- Sample Data Insert Script (50+ rows)
-- ICT502 Database Engineering - Group 2 NBCS2306A
-- ============================================================
-- Run sebagai user: bayu_library
-- Pastikan dah connect sebagai bayu_library sebelum run
-- ============================================================

-- ============================================================
-- BAHAGIAN 1: PERSON (20 rows — 15 members, 5 librarians)
-- ============================================================

INSERT INTO PERSON VALUES ('P001', 'Ahmad Faris Bin Zulkifli',   'faris.zulkifli@gmail.com',    '0112345678', 'No 12, Jalan Mawar, Kuala Lumpur',        'M', 'MEMBER');
INSERT INTO PERSON VALUES ('P002', 'Nurul Ain Binti Razali',      'ain.razali@gmail.com',         '0123456789', 'No 5, Lorong Dahlia, Selangor',           'F', 'MEMBER');
INSERT INTO PERSON VALUES ('P003', 'Muhammad Irfan Bin Hashim',   'irfan.hashim@gmail.com',       '0134567890', 'No 88, Taman Sri Muda, Shah Alam',        'M', 'MEMBER');
INSERT INTO PERSON VALUES ('P004', 'Siti Nabilah Binti Osman',    'nabilah.osman@gmail.com',      '0145678901', 'No 3, Jalan Kenanga, Petaling Jaya',      'F', 'MEMBER');
INSERT INTO PERSON VALUES ('P005', 'Haziq Danial Bin Roslan',     'haziq.roslan@gmail.com',       '0156789012', 'No 21, Jalan Cempaka, Rawang',            'M', 'MEMBER');
INSERT INTO PERSON VALUES ('P006', 'Farah Nadia Binti Kamal',     'farah.kamal@gmail.com',        '0167890123', 'No 7, Taman Melati, Gombak',              'F', 'MEMBER');
INSERT INTO PERSON VALUES ('P007', 'Amir Syafiq Bin Ismail',      'syafiq.ismail@gmail.com',      '0178901234', 'No 14, Jalan Teratai, Subang Jaya',       'M', 'MEMBER');
INSERT INTO PERSON VALUES ('P008', 'Hana Sofea Binti Ramli',      'hana.ramli@gmail.com',         '0189012345', 'No 9, Taman Bukit Indah, Ampang',         'F', 'MEMBER');
INSERT INTO PERSON VALUES ('P009', 'Zulhilmi Bin Abd Rahman',     'hilmi.rahman@gmail.com',       '0190123456', 'No 32, Jalan Putra, Kepong',              'M', 'MEMBER');
INSERT INTO PERSON VALUES ('P010', 'Aisyah Nur Binti Suffian',    'aisyah.suffian@gmail.com',     '0111234567', 'No 18, Jalan Anggerik, Klang',            'F', 'MEMBER');
INSERT INTO PERSON VALUES ('P011', 'Ridhwan Bin Mohd Nor',        'ridhwan.mohdnor@gmail.com',    '0122345678', 'No 6, Lorong Pelangi, Kajang',            'M', 'MEMBER');
INSERT INTO PERSON VALUES ('P012', 'Liyana Binti Azhar',          'liyana.azhar@gmail.com',       '0133456789', 'No 25, Taman Putra Perdana, Puchong',     'F', 'MEMBER');
INSERT INTO PERSON VALUES ('P013', 'Hafifi Bin Saad',             'hafifi.saad@gmail.com',        '0144567890', 'No 11, Jalan Wawasan, Cheras',            'M', 'MEMBER');
INSERT INTO PERSON VALUES ('P014', 'Qistina Binti Fadzillah',     'qistina.fadzillah@gmail.com',  '0155678901', 'No 4, Taman Desa Jaya, Kepong',           'F', 'MEMBER');
INSERT INTO PERSON VALUES ('P015', 'Farhan Bin Mustafa',          'farhan.mustafa@gmail.com',     '0166789012', 'No 77, Jalan Raya, Batu Caves',           'M', 'MEMBER');
INSERT INTO PERSON VALUES ('P016', 'Zarina Binti Hamid',          'zarina.hamid@bayulib.gov.my',  '0177890123', 'No 2, Jalan Bayu, Rawang',                'F', 'LIBRARIAN');
INSERT INTO PERSON VALUES ('P017', 'Khairul Anwar Bin Daud',      'khairul.daud@bayulib.gov.my',  '0188901234', 'No 15, Taman Bayu Perdana, Rawang',       'M', 'LIBRARIAN');
INSERT INTO PERSON VALUES ('P018', 'Suraya Binti Jusoh',          'suraya.jusoh@bayulib.gov.my',  '0199012345', 'No 8, Jalan Harmoni, Rawang',             'F', 'LIBRARIAN');
INSERT INTO PERSON VALUES ('P019', 'Azrul Nizam Bin Zahari',      'azrul.zahari@bayulib.gov.my',  '0110123456', 'No 33, Taman Sri Bayu, Rawang',           'M', 'LIBRARIAN');
INSERT INTO PERSON VALUES ('P020', 'Norhayati Binti Alias',       'norhayati.alias@bayulib.gov.my','0121234567', 'No 10, Persiaran Bayu, Rawang',           'F', 'LIBRARIAN');

-- ============================================================
-- BAHAGIAN 2: MEMBER (15 rows)
-- ============================================================

INSERT INTO MEMBER VALUES ('M001', 'P001', DATE '2024-01-10', 'PREMIUM',  'ACTIVE');
INSERT INTO MEMBER VALUES ('M002', 'P002', DATE '2024-02-15', 'STANDARD', 'ACTIVE');
INSERT INTO MEMBER VALUES ('M003', 'P003', DATE '2024-03-20', 'PREMIUM',  'ACTIVE');
INSERT INTO MEMBER VALUES ('M004', 'P004', DATE '2024-04-05', 'STANDARD', 'ACTIVE');
INSERT INTO MEMBER VALUES ('M005', 'P005', DATE '2024-05-11', 'STANDARD', 'ACTIVE');
INSERT INTO MEMBER VALUES ('M006', 'P006', DATE '2024-06-18', 'PREMIUM',  'ACTIVE');
INSERT INTO MEMBER VALUES ('M007', 'P007', DATE '2024-07-22', 'STANDARD', 'INACTIVE');
INSERT INTO MEMBER VALUES ('M008', 'P008', DATE '2024-08-30', 'STANDARD', 'ACTIVE');
INSERT INTO MEMBER VALUES ('M009', 'P009', DATE '2024-09-14', 'PREMIUM',  'ACTIVE');
INSERT INTO MEMBER VALUES ('M010', 'P010', DATE '2024-10-03', 'STANDARD', 'ACTIVE');
INSERT INTO MEMBER VALUES ('M011', 'P011', DATE '2024-11-07', 'STANDARD', 'INACTIVE');
INSERT INTO MEMBER VALUES ('M012', 'P012', DATE '2024-12-01', 'PREMIUM',  'ACTIVE');
INSERT INTO MEMBER VALUES ('M013', 'P013', DATE '2025-01-19', 'STANDARD', 'ACTIVE');
INSERT INTO MEMBER VALUES ('M014', 'P014', DATE '2025-02-28', 'STANDARD', 'ACTIVE');
INSERT INTO MEMBER VALUES ('M015', 'P015', DATE '2025-03-15', 'PREMIUM',  'ACTIVE');

-- ============================================================
-- BAHAGIAN 3: LIBRARIAN (5 rows)
-- ============================================================

INSERT INTO LIBRARIAN VALUES ('L001', 'P016', 'STF-2020-001', 'Head Librarian');
INSERT INTO LIBRARIAN VALUES ('L002', 'P017', 'STF-2021-002', 'Senior Librarian');
INSERT INTO LIBRARIAN VALUES ('L003', 'P018', 'STF-2022-003', 'Librarian');
INSERT INTO LIBRARIAN VALUES ('L004', 'P019', 'STF-2023-004', 'Librarian');
INSERT INTO LIBRARIAN VALUES ('L005', 'P020', 'STF-2024-005', 'Assistant Librarian');

-- ============================================================
-- BAHAGIAN 4: CATEGORY (8 rows — 4 parent, 4 sub)
-- ============================================================

INSERT INTO CATEGORY VALUES ('CAT01', 'Science',     NULL);
INSERT INTO CATEGORY VALUES ('CAT02', 'Literature',  NULL);
INSERT INTO CATEGORY VALUES ('CAT03', 'Religion',    NULL);
INSERT INTO CATEGORY VALUES ('CAT04', 'History',     NULL);
INSERT INTO CATEGORY VALUES ('CAT05', 'Physics',     'CAT01');
INSERT INTO CATEGORY VALUES ('CAT06', 'Biology',     'CAT01');
INSERT INTO CATEGORY VALUES ('CAT07', 'Poetry',      'CAT02');
INSERT INTO CATEGORY VALUES ('CAT08', 'Islamic Studies', 'CAT03');

-- ============================================================
-- BAHAGIAN 5: AUTHOR (10 rows)
-- ============================================================

INSERT INTO AUTHOR VALUES ('A001', 'Hamka',                  'Indonesian');
INSERT INTO AUTHOR VALUES ('A002', 'Pramoedya Ananta Toer',  'Indonesian');
INSERT INTO AUTHOR VALUES ('A003', 'Usman Awang',            'Malaysian');
INSERT INTO AUTHOR VALUES ('A004', 'A. Samad Said',          'Malaysian');
INSERT INTO AUTHOR VALUES ('A005', 'Stephen Hawking',        'British');
INSERT INTO AUTHOR VALUES ('A006', 'Richard Dawkins',        'British');
INSERT INTO AUTHOR VALUES ('A007', 'Tariq Ramadan',          'Swiss');
INSERT INTO AUTHOR VALUES ('A008', 'Ibn Khaldun',            'Tunisian');
INSERT INTO AUTHOR VALUES ('A009', 'Shahnon Ahmad',          'Malaysian');
INSERT INTO AUTHOR VALUES ('A010', 'Syed Naquib Al-Attas',  'Malaysian');

-- ============================================================
-- BAHAGIAN 6: BOOK (15 rows)
-- ============================================================

INSERT INTO BOOK VALUES ('B001', 'CAT08', 'Tafsir Al-Azhar',              '978-983-001-001-1', 1966, 'Pustaka Nasional',     5, 3);
INSERT INTO BOOK VALUES ('B002', 'CAT02', 'Salina',                       '978-983-001-002-2', 1961, 'Dewan Bahasa Pustaka', 4, 4);
INSERT INTO BOOK VALUES ('B003', 'CAT07', 'Dewan Bahasa',                 '978-983-001-003-3', 1960, 'Dewan Bahasa Pustaka', 3, 2);
INSERT INTO BOOK VALUES ('B004', 'CAT02', 'Shit',                         '978-983-001-004-4', 1976, 'Fajar Bakti',          3, 1);
INSERT INTO BOOK VALUES ('B005', 'CAT05', 'A Brief History of Time',      '978-983-001-005-5', 1988, 'Bantam Books',         6, 5);
INSERT INTO BOOK VALUES ('B006', 'CAT06', 'The Selfish Gene',             '978-983-001-006-6', 1976, 'Oxford University',    4, 4);
INSERT INTO BOOK VALUES ('B007', 'CAT08', 'Islam and the West',           '978-983-001-007-7', 2004, 'Oxford University',    3, 3);
INSERT INTO BOOK VALUES ('B008', 'CAT04', 'Muqaddimah',                   '978-983-001-008-8', 1377, 'Pustaka Antara',       5, 5);
INSERT INTO BOOK VALUES ('B009', 'CAT02', 'Ranjau Sepanjang Jalan',       '978-983-001-009-9', 1966, 'Utusan Publications', 4, 2);
INSERT INTO BOOK VALUES ('B010', 'CAT08', 'Islam and Secularism',         '978-983-001-010-0', 1978, 'ISTAC',                3, 3);
INSERT INTO BOOK VALUES ('B011', 'CAT05', 'The Universe in a Nutshell',   '978-983-001-011-1', 2001, 'Bantam Books',         4, 4);
INSERT INTO BOOK VALUES ('B012', 'CAT06', 'The God Delusion',             '978-983-001-012-2', 2006, 'Bantam Books',         2, 2);
INSERT INTO BOOK VALUES ('B013', 'CAT04', 'Sejarah Melayu',               '978-983-001-013-3', 1612, 'DBP',                  5, 5);
INSERT INTO BOOK VALUES ('B014', 'CAT07', 'Puisi-Puisi Pilihan',          '978-983-001-014-4', 1975, 'Dewan Bahasa Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B015', 'CAT08', 'Falsafah dan Peradaban Islam', '978-983-001-015-5', 1990, 'ISTAC',                4, 4);

-- ============================================================
-- BAHAGIAN 7: BOOK_AUTHOR (18 rows — ada buku multi-author)
-- ============================================================

INSERT INTO BOOK_AUTHOR VALUES ('B001', 'A001');
INSERT INTO BOOK_AUTHOR VALUES ('B002', 'A004');
INSERT INTO BOOK_AUTHOR VALUES ('B003', 'A003');
INSERT INTO BOOK_AUTHOR VALUES ('B004', 'A009');
INSERT INTO BOOK_AUTHOR VALUES ('B005', 'A005');
INSERT INTO BOOK_AUTHOR VALUES ('B006', 'A006');
INSERT INTO BOOK_AUTHOR VALUES ('B007', 'A007');
INSERT INTO BOOK_AUTHOR VALUES ('B008', 'A008');
INSERT INTO BOOK_AUTHOR VALUES ('B009', 'A009');
INSERT INTO BOOK_AUTHOR VALUES ('B010', 'A010');
INSERT INTO BOOK_AUTHOR VALUES ('B011', 'A005');  -- Hawking tulis 2 buku
INSERT INTO BOOK_AUTHOR VALUES ('B012', 'A006');  -- Dawkins tulis 2 buku
INSERT INTO BOOK_AUTHOR VALUES ('B013', 'A004');  -- A. Samad Said contributor
INSERT INTO BOOK_AUTHOR VALUES ('B014', 'A003');
INSERT INTO BOOK_AUTHOR VALUES ('B014', 'A004');  -- B014 ada 2 author
INSERT INTO BOOK_AUTHOR VALUES ('B015', 'A010');
INSERT INTO BOOK_AUTHOR VALUES ('B015', 'A007');  -- B015 ada 2 author
INSERT INTO BOOK_AUTHOR VALUES ('B001', 'A010');  -- B001 ada 2 author

-- ============================================================
-- BAHAGIAN 8: BORROWING (15 rows — pelbagai status)
-- ============================================================

-- RETURNED (dah pulang, ada fine & tak ada fine)
INSERT INTO BORROWING VALUES ('BR001', 'M001', 'B001', 'L001', DATE '2025-01-05', DATE '2025-01-19', DATE '2025-01-18', 0,    'RETURNED');
INSERT INTO BORROWING VALUES ('BR002', 'M002', 'B005', 'L002', DATE '2025-01-10', DATE '2025-01-24', DATE '2025-01-30', 6.00, 'RETURNED');
INSERT INTO BORROWING VALUES ('BR003', 'M003', 'B002', 'L001', DATE '2025-02-01', DATE '2025-02-15', DATE '2025-02-14', 0,    'RETURNED');
INSERT INTO BORROWING VALUES ('BR004', 'M004', 'B008', 'L003', DATE '2025-02-10', DATE '2025-02-24', DATE '2025-03-05', 9.00, 'RETURNED');
INSERT INTO BORROWING VALUES ('BR005', 'M005', 'B003', 'L002', DATE '2025-03-01', DATE '2025-03-15', DATE '2025-03-15', 0,    'RETURNED');
INSERT INTO BORROWING VALUES ('BR006', 'M006', 'B007', 'L004', DATE '2025-03-10', DATE '2025-03-24', DATE '2025-03-20', 0,    'RETURNED');
INSERT INTO BORROWING VALUES ('BR007', 'M007', 'B009', 'L003', DATE '2025-04-01', DATE '2025-04-15', DATE '2025-04-25', 10.00,'RETURNED');
INSERT INTO BORROWING VALUES ('BR008', 'M008', 'B010', 'L005', DATE '2025-04-05', DATE '2025-04-19', DATE '2025-04-18', 0,    'RETURNED');
INSERT INTO BORROWING VALUES ('BR009', 'M009', 'B006', 'L001', DATE '2025-05-01', DATE '2025-05-15', DATE '2025-05-14', 0,    'RETURNED');
INSERT INTO BORROWING VALUES ('BR010', 'M010', 'B004', 'L002', DATE '2025-05-10', DATE '2025-05-24', DATE '2025-06-01', 8.00, 'RETURNED');

-- BORROWED (masih dipinjam, belum overdue)
INSERT INTO BORROWING VALUES ('BR011', 'M011', 'B011', 'L003', DATE '2026-06-01', DATE '2026-06-15', NULL, 0, 'BORROWED');
INSERT INTO BORROWING VALUES ('BR012', 'M012', 'B013', 'L004', DATE '2026-06-05', DATE '2026-06-19', NULL, 0, 'BORROWED');
INSERT INTO BORROWING VALUES ('BR013', 'M013', 'B014', 'L005', DATE '2026-06-08', DATE '2026-06-22', NULL, 0, 'BORROWED');

-- OVERDUE (dah lepas due date, belum pulang)
INSERT INTO BORROWING VALUES ('BR014', 'M014', 'B015', 'L001', DATE '2026-05-01', DATE '2026-05-15', NULL, 33.00, 'OVERDUE');
INSERT INTO BORROWING VALUES ('BR015', 'M015', 'B012', 'L002', DATE '2026-05-05', DATE '2026-05-19', NULL, 29.00, 'OVERDUE');

COMMIT;

-- ============================================================
-- VERIFY: Semak row count setiap table
-- ============================================================

SELECT 'PERSON'      AS table_name, COUNT(*) AS total_rows FROM PERSON      UNION ALL
SELECT 'MEMBER'      AS table_name, COUNT(*) AS total_rows FROM MEMBER      UNION ALL
SELECT 'LIBRARIAN'   AS table_name, COUNT(*) AS total_rows FROM LIBRARIAN   UNION ALL
SELECT 'CATEGORY'    AS table_name, COUNT(*) AS total_rows FROM CATEGORY    UNION ALL
SELECT 'AUTHOR'      AS table_name, COUNT(*) AS total_rows FROM AUTHOR      UNION ALL
SELECT 'BOOK'        AS table_name, COUNT(*) AS total_rows FROM BOOK        UNION ALL
SELECT 'BOOK_AUTHOR' AS table_name, COUNT(*) AS total_rows FROM BOOK_AUTHOR UNION ALL
SELECT 'BORROWING'   AS table_name, COUNT(*) AS total_rows FROM BORROWING;

-- ============================================================
-- End of Insert Script
-- ============================================================


-- ============================================================
-- BAYU LIBRARY MANAGEMENT SYSTEM
-- Sample Data Insert Script PART 2 (+30 rows)
-- ICT502 Database Engineering - Group 2 NBCS2306A
-- ============================================================
-- Run sebagai user: bayu_library
-- Sambungan dari insert script part 1
-- ============================================================

-- ============================================================
-- BAHAGIAN 1: PERSON (8 rows baru — 6 members, 2 librarians)
-- ============================================================

INSERT INTO PERSON VALUES ('P021', 'Suffian Bin Mokhtar',        'suffian.mokhtar@gmail.com',     '0112233445', 'No 19, Jalan Nilam, Rawang',              'M', 'MEMBER');
INSERT INTO PERSON VALUES ('P022', 'Balkis Binti Zainudin',      'balkis.zainudin@gmail.com',     '0123344556', 'No 44, Taman Wangsa Maju, KL',            'F', 'MEMBER');
INSERT INTO PERSON VALUES ('P023', 'Izzat Hakim Bin Saiful',     'izzat.saiful@gmail.com',        '0134455667', 'No 6, Jalan Perdana, Selayang',           'M', 'MEMBER');
INSERT INTO PERSON VALUES ('P024', 'Maisarah Binti Lokman',      'maisarah.lokman@gmail.com',     '0145566778', 'No 31, Taman Bukit Utama, Ampang',        'F', 'MEMBER');
INSERT INTO PERSON VALUES ('P025', 'Harith Bin Zulkarnain',      'harith.zulkarnain@gmail.com',   '0156677889', 'No 17, Lorong Bahagia, Klang',            'M', 'MEMBER');
INSERT INTO PERSON VALUES ('P026', 'Norfazilah Binti Rashid',    'norfazilah.rashid@gmail.com',   '0167788990', 'No 8, Jalan Impian, Subang',              'F', 'MEMBER');
INSERT INTO PERSON VALUES ('P027', 'Hafizuddin Bin Nordin',      'hafiz.nordin@bayulib.gov.my',   '0178899001', 'No 22, Taman Harmoni, Rawang',            'M', 'LIBRARIAN');
INSERT INTO PERSON VALUES ('P028', 'Rosnani Binti Yahya',        'rosnani.yahya@bayulib.gov.my',  '0189900112', 'No 5, Persiaran Damai, Rawang',           'F', 'LIBRARIAN');

-- ============================================================
-- BAHAGIAN 2: MEMBER (6 rows baru — P021 hingga P026)
-- ============================================================

INSERT INTO MEMBER VALUES ('M016', 'P021', DATE '2025-04-10', 'STANDARD', 'ACTIVE');
INSERT INTO MEMBER VALUES ('M017', 'P022', DATE '2025-04-22', 'PREMIUM',  'ACTIVE');
INSERT INTO MEMBER VALUES ('M018', 'P023', DATE '2025-05-03', 'STANDARD', 'ACTIVE');
INSERT INTO MEMBER VALUES ('M019', 'P024', DATE '2025-05-18', 'PREMIUM',  'ACTIVE');
INSERT INTO MEMBER VALUES ('M020', 'P025', DATE '2025-06-01', 'STANDARD', 'INACTIVE');
INSERT INTO MEMBER VALUES ('M021', 'P026', DATE '2025-06-14', 'STANDARD', 'ACTIVE');

-- ============================================================
-- BAHAGIAN 3: LIBRARIAN (2 rows baru)
-- ============================================================

INSERT INTO LIBRARIAN VALUES ('L006', 'P027', 'STF-2025-006', 'Librarian');
INSERT INTO LIBRARIAN VALUES ('L007', 'P028', 'STF-2025-007', 'Assistant Librarian');

-- ============================================================
-- BAHAGIAN 4: CATEGORY (4 rows baru)
-- ============================================================

INSERT INTO CATEGORY VALUES ('CAT09', 'Children',       NULL);
INSERT INTO CATEGORY VALUES ('CAT10', 'Technology',     NULL);
INSERT INTO CATEGORY VALUES ('CAT11', 'Chemistry',      'CAT01');
INSERT INTO CATEGORY VALUES ('CAT12', 'Folktales',      'CAT09');

-- ============================================================
-- BAHAGIAN 5: AUTHOR (5 rows baru)
-- ============================================================

INSERT INTO AUTHOR VALUES ('A011', 'Zurinah Hassan',        'Malaysian');
INSERT INTO AUTHOR VALUES ('A012', 'Abdullah Hussain',      'Malaysian');
INSERT INTO AUTHOR VALUES ('A013', 'Carl Sagan',            'American');
INSERT INTO AUTHOR VALUES ('A014', 'Michio Kaku',           'American');
INSERT INTO AUTHOR VALUES ('A015', 'Ibrahim Fikri',         'Malaysian');

-- ============================================================
-- BAHAGIAN 6: BOOK (7 rows baru)
-- ============================================================

INSERT INTO BOOK VALUES ('B016', 'CAT07', 'Sajak-Sajak Cinta',          '978-983-001-016-6', 2000, 'Dewan Bahasa Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B017', 'CAT02', 'Interlok',                   '978-983-001-017-7', 2010, 'Fajar Bakti',          4, 4);
INSERT INTO BOOK VALUES ('B018', 'CAT10', 'Cosmos',                     '978-983-001-018-8', 1980, 'Random House',         3, 2);
INSERT INTO BOOK VALUES ('B019', 'CAT10', 'Physics of the Future',      '978-983-001-019-9', 2011, 'Doubleday',            4, 4);
INSERT INTO BOOK VALUES ('B020', 'CAT11', 'Kimia Tingkatan 4',          '978-983-001-020-0', 2018, 'Penerbitan Pelangi',   6, 6);
INSERT INTO BOOK VALUES ('B021', 'CAT09', 'Sang Kancil dan Buaya',      '978-983-001-021-1', 2005, 'PTS Publications',     8, 7);
INSERT INTO BOOK VALUES ('B022', 'CAT12', 'Cerita Rakyat Nusantara',    '978-983-001-022-2', 2010, 'PTS Publications',     5, 5);

-- ============================================================
-- BAHAGIAN 7: BOOK_AUTHOR (9 rows baru)
-- ============================================================

INSERT INTO BOOK_AUTHOR VALUES ('B016', 'A011');
INSERT INTO BOOK_AUTHOR VALUES ('B017', 'A012');
INSERT INTO BOOK_AUTHOR VALUES ('B018', 'A013');
INSERT INTO BOOK_AUTHOR VALUES ('B019', 'A014');
INSERT INTO BOOK_AUTHOR VALUES ('B020', 'A015');
INSERT INTO BOOK_AUTHOR VALUES ('B021', 'A015');
INSERT INTO BOOK_AUTHOR VALUES ('B022', 'A015');
INSERT INTO BOOK_AUTHOR VALUES ('B018', 'A014'); -- Kaku & Sagan kolaborasi
INSERT INTO BOOK_AUTHOR VALUES ('B016', 'A003'); -- Usman Awang contributor

-- ============================================================
-- BAHAGIAN 8: BORROWING (8 rows baru)
-- ============================================================

-- RETURNED
INSERT INTO BORROWING VALUES ('BR016', 'M016', 'B016', 'L006', DATE '2025-10-01', DATE '2025-10-15', DATE '2025-10-14', 0,    'RETURNED');
INSERT INTO BORROWING VALUES ('BR017', 'M017', 'B017', 'L007', DATE '2025-10-10', DATE '2025-10-24', DATE '2025-11-01', 8.00, 'RETURNED');
INSERT INTO BORROWING VALUES ('BR018', 'M018', 'B018', 'L006', DATE '2025-11-01', DATE '2025-11-15', DATE '2025-11-13', 0,    'RETURNED');
INSERT INTO BORROWING VALUES ('BR019', 'M019', 'B020', 'L007', DATE '2025-11-20', DATE '2025-12-04', DATE '2025-12-04', 0,    'RETURNED');
INSERT INTO BORROWING VALUES ('BR020', 'M001', 'B019', 'L001', DATE '2025-12-01', DATE '2025-12-15', DATE '2025-12-20', 5.00, 'RETURNED');

-- BORROWED (sedang dipinjam)
INSERT INTO BORROWING VALUES ('BR021', 'M021', 'B021', 'L006', DATE '2026-06-10', DATE '2026-06-24', NULL, 0, 'BORROWED');
INSERT INTO BORROWING VALUES ('BR022', 'M017', 'B022', 'L007', DATE '2026-06-12', DATE '2026-06-26', NULL, 0, 'BORROWED');

-- OVERDUE
INSERT INTO BORROWING VALUES ('BR023', 'M020', 'B006', 'L003', DATE '2026-05-10', DATE '2026-05-24', NULL, 24.00, 'OVERDUE');

COMMIT;

-- ============================================================
-- VERIFY: Semak row count semua table
-- ============================================================

SELECT 'PERSON'      AS table_name, COUNT(*) AS total_rows FROM PERSON      UNION ALL
SELECT 'MEMBER'      AS table_name, COUNT(*) AS total_rows FROM MEMBER      UNION ALL
SELECT 'LIBRARIAN'   AS table_name, COUNT(*) AS total_rows FROM LIBRARIAN   UNION ALL
SELECT 'CATEGORY'    AS table_name, COUNT(*) AS total_rows FROM CATEGORY    UNION ALL
SELECT 'AUTHOR'      AS table_name, COUNT(*) AS total_rows FROM AUTHOR      UNION ALL
SELECT 'BOOK'        AS table_name, COUNT(*) AS total_rows FROM BOOK        UNION ALL
SELECT 'BOOK_AUTHOR' AS table_name, COUNT(*) AS total_rows FROM BOOK_AUTHOR UNION ALL
SELECT 'BORROWING'   AS table_name, COUNT(*) AS total_rows FROM BORROWING;

-- ============================================================
-- End of Insert Script Part 2
-- ============================================================
