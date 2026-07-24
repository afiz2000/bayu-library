-- ============================================================
-- BAYU LIBRARY MANAGEMENT SYSTEM
-- MASTER SCRIPT - Run semua dalam urutan betul
-- ICT502 Database Engineering - Group 2 NBCS2306A
-- ============================================================
-- Single consolidated script: user/schema setup, tables, seed data,
-- login password hashes, and PL/SQL objects (function/triggers/views).
--
-- Cara guna dalam SQL Developer:
--   1. Login sebagai SYS dengan role SYSDBA, run BAHAGIAN 1-6 (F5)
--   2. Sambung balik sebagai user bayu_library, run selebihnya
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
-- PASSWORD_HASH disertakan terus dalam MEMBER & LIBRARIAN sejak
-- awal — tak perlu migration ALTER TABLE berasingan lagi.
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
    password_hash       VARCHAR2(100),
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
    password_hash   VARCHAR2(100),
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
-- BAHAGIAN 7: SEED DATA
-- (Run sebagai user bayu_library)
-- ============================================================

-- ---- PERSON (28 rows — 21 members, 7 librarians) ----

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
INSERT INTO PERSON VALUES ('P021', 'Suffian Bin Mokhtar',        'suffian.mokhtar@gmail.com',     '0112233445', 'No 19, Jalan Nilam, Rawang',              'M', 'MEMBER');
INSERT INTO PERSON VALUES ('P022', 'Balkis Binti Zainudin',      'balkis.zainudin@gmail.com',     '0123344556', 'No 44, Taman Wangsa Maju, KL',            'F', 'MEMBER');
INSERT INTO PERSON VALUES ('P023', 'Izzat Hakim Bin Saiful',     'izzat.saiful@gmail.com',        '0134455667', 'No 6, Jalan Perdana, Selayang',           'M', 'MEMBER');
INSERT INTO PERSON VALUES ('P024', 'Maisarah Binti Lokman',      'maisarah.lokman@gmail.com',     '0145566778', 'No 31, Taman Bukit Utama, Ampang',        'F', 'MEMBER');
INSERT INTO PERSON VALUES ('P025', 'Harith Bin Zulkarnain',      'harith.zulkarnain@gmail.com',   '0156677889', 'No 17, Lorong Bahagia, Klang',            'M', 'MEMBER');
INSERT INTO PERSON VALUES ('P026', 'Norfazilah Binti Rashid',    'norfazilah.rashid@gmail.com',   '0167788990', 'No 8, Jalan Impian, Subang',              'F', 'MEMBER');
INSERT INTO PERSON VALUES ('P027', 'Hafizuddin Bin Nordin',      'hafiz.nordin@bayulib.gov.my',   '0178899001', 'No 22, Taman Harmoni, Rawang',            'M', 'LIBRARIAN');
INSERT INTO PERSON VALUES ('P028', 'Rosnani Binti Yahya',        'rosnani.yahya@bayulib.gov.my',  '0189900112', 'No 5, Persiaran Damai, Rawang',           'F', 'LIBRARIAN');

-- ---- MEMBER (21 rows) ----

INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M001', 'P001', DATE '2024-01-10', 'PREMIUM',  'ACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M002', 'P002', DATE '2024-02-15', 'STANDARD', 'ACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M003', 'P003', DATE '2024-03-20', 'PREMIUM',  'ACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M004', 'P004', DATE '2024-04-05', 'STANDARD', 'ACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M005', 'P005', DATE '2024-05-11', 'STANDARD', 'ACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M006', 'P006', DATE '2024-06-18', 'PREMIUM',  'ACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M007', 'P007', DATE '2024-07-22', 'STANDARD', 'INACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M008', 'P008', DATE '2024-08-30', 'STANDARD', 'ACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M009', 'P009', DATE '2024-09-14', 'PREMIUM',  'ACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M010', 'P010', DATE '2024-10-03', 'STANDARD', 'ACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M011', 'P011', DATE '2024-11-07', 'STANDARD', 'INACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M012', 'P012', DATE '2024-12-01', 'PREMIUM',  'ACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M013', 'P013', DATE '2025-01-19', 'STANDARD', 'ACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M014', 'P014', DATE '2025-02-28', 'STANDARD', 'ACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M015', 'P015', DATE '2025-03-15', 'PREMIUM',  'ACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M016', 'P021', DATE '2025-04-10', 'STANDARD', 'ACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M017', 'P022', DATE '2025-04-22', 'PREMIUM',  'ACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M018', 'P023', DATE '2025-05-03', 'STANDARD', 'ACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M019', 'P024', DATE '2025-05-18', 'PREMIUM',  'ACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M020', 'P025', DATE '2025-06-01', 'STANDARD', 'INACTIVE');
INSERT INTO MEMBER (member_id, person_id, membership_date, membership_type, status) VALUES ('M021', 'P026', DATE '2025-06-14', 'STANDARD', 'ACTIVE');

-- ---- LIBRARIAN (7 rows) ----

INSERT INTO LIBRARIAN (librarian_id, person_id, staff_id, position) VALUES ('L001', 'P016', 'STF-2020-001', 'Head Librarian');
INSERT INTO LIBRARIAN (librarian_id, person_id, staff_id, position) VALUES ('L002', 'P017', 'STF-2021-002', 'Senior Librarian');
INSERT INTO LIBRARIAN (librarian_id, person_id, staff_id, position) VALUES ('L003', 'P018', 'STF-2022-003', 'Librarian');
INSERT INTO LIBRARIAN (librarian_id, person_id, staff_id, position) VALUES ('L004', 'P019', 'STF-2023-004', 'Librarian');
INSERT INTO LIBRARIAN (librarian_id, person_id, staff_id, position) VALUES ('L005', 'P020', 'STF-2024-005', 'Assistant Librarian');
INSERT INTO LIBRARIAN (librarian_id, person_id, staff_id, position) VALUES ('L006', 'P027', 'STF-2025-006', 'Librarian');
INSERT INTO LIBRARIAN (librarian_id, person_id, staff_id, position) VALUES ('L007', 'P028', 'STF-2025-007', 'Assistant Librarian');

-- ---- CATEGORY (15 rows — variable-depth hierarchy: 1, 2, and 3 levels;
--      e.g. Technology -> Database -> Oracle is a 3-level chain) ----

INSERT INTO CATEGORY VALUES ('CAT01', 'Science', NULL);
INSERT INTO CATEGORY VALUES ('CAT02', 'Literature', NULL);
INSERT INTO CATEGORY VALUES ('CAT03', 'Religion', NULL);
INSERT INTO CATEGORY VALUES ('CAT04', 'History', NULL);
INSERT INTO CATEGORY VALUES ('CAT05', 'Physics', 'CAT01');
INSERT INTO CATEGORY VALUES ('CAT06', 'Biology', 'CAT01');
INSERT INTO CATEGORY VALUES ('CAT07', 'Poetry', 'CAT02');
INSERT INTO CATEGORY VALUES ('CAT08', 'Islamic Studies', 'CAT03');
INSERT INTO CATEGORY VALUES ('CAT09', 'Children', NULL);
INSERT INTO CATEGORY VALUES ('CAT10', 'Technology', NULL);
INSERT INTO CATEGORY VALUES ('CAT11', 'Chemistry', 'CAT01');
INSERT INTO CATEGORY VALUES ('CAT12', 'Folktales', 'CAT09');
INSERT INTO CATEGORY VALUES ('CAT13', 'Database', 'CAT10');
INSERT INTO CATEGORY VALUES ('CAT14', 'Oracle', 'CAT13');
INSERT INTO CATEGORY VALUES ('CAT16', 'Programming', 'CAT10');

-- ---- AUTHOR (220 rows — real authors, sourced from a Malaysian gov
--      library catalogue, see Appendix note in report) ----

INSERT INTO AUTHOR VALUES ('A001', 'Arbaeyah Yahya', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A002', 'Mohd Yusof Hj. Othman', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A003', 'Khalijah Mohd. Salleh', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A004', 'Ali Abdul Hamid Abu Al-Khair', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A005', 'Abu Bakar Nordin', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A006', 'Bashah Abu Bakar', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A007', 'Danial Zainal Abidin', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A008', 'Prof. Dr. Shaharir Mohamad Zain', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A009', 'Kamal Shukri Abdullah Sani', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A010', 'Mohammad Ilyas', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A011', 'Hal Hellman', 'American');
INSERT INTO AUTHOR VALUES ('A012', 'Shin Jae Hwan', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A013', 'Ye Young', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A014', 'Zian Farodis', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A015', 'Abd Rahman Embong', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A016', 'Haji Abu Hassan Haji Ali', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A017', 'Faridah Hanum', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A018', 'Kasim Osman', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A019', 'A. Latif', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A020', 'Kipas Hikmat', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A021', 'S. L. Wong', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A022', 'Sunitha Bisan', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A023', 'Ratna Malar Selvaratnam', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A024', 'Sahlan Mohd. Saman', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A025', 'Zuber Usman', 'Indonesian');
INSERT INTO AUTHOR VALUES ('A026', 'Salmah Jan Noor Muhammad', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A027', 'Chong Fah Hing', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A028', 'Mohd Amran Daud', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A029', 'Ahmad Kamal Abdullah', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A030', 'Ahmad Razali Haji Yusof', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A031', 'Jabdin bin Juhat', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A032', 'Haslina Usman', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A033', 'Usman Awang', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A034', 'Lim Swee Tin', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A035', 'Siti Zainon Ismail', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A036', 'Han', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A037', 'Harun Mat Piah', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A038', 'A. Samad Said', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A039', 'Dharmawijaya', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A040', 'Syed Hamid Albar', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A041', 'Unknown', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A042', 'Ac Jaffrie', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A043', 'Sutung Umar RS', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A044', 'Pahrol Mohd Juoi', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A045', 'Abu Muslim', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A046', 'Syed Abdillah Ahmad Aljufri', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A047', 'Haji Manshuruddin BatuBara', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A048', 'H. Mohd Sharif Aziz', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A049', 'Abu Muslim@Safwan Fathy', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A050', 'Ibnu Qayyim Al-Jauziah', 'Syrian');
INSERT INTO AUTHOR VALUES ('A051', 'Zaki Ali Al-Sayyid Abu Ghudah', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A052', 'Ahmad Baei Jaafar', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A053', 'Zawanah Muhammad', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A054', 'Dr. Abdul Rahman Hj. Abdullah', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A055', 'Panel Penulis SS DATO'' SERI HJ. DR. ZULKIFLI AL-BAKRI', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A056', 'Dr. Mohammas Nidzam Abd. Kadir', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A057', 'Dr. Mohd. Azrul Azlen Abd. Hamid', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A058', 'Dr. Nik Abd. Rahim Ghani', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A059', 'Dr. Azhar Mohamed', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A060', 'Ustaz Rohidzir Rais', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A061', 'Ustaz Abdul Aziz', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A062', 'Raja Mukhtaruddin bin Raja Mohd. Dain', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A063', 'Ustaz Hj Shihabudin', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A064', 'Abdul Mu''izz', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A065', 'Haron Din', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A066', 'Mohd. Zaidi bin Ismail', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A067', 'Norkumala binti Awang', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A068', 'Faisal Hj. Othman', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A069', 'penyelaras program', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A070', 'Faisal Haji Othman', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A071', 'Dr. Mat Saad Abdul Rahman', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A072', 'Ismail Ibrahim', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A073', 'Ab. Rahman', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A074', 'Mahathir Mohamad', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A075', 'Muhiddin Yusin', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A076', 'Hj. Ibrahim T.Y. MA', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A077', 'Sayid Sabiq', 'Egyptian');
INSERT INTO AUTHOR VALUES ('A078', 'Ketua Pengarang Khoo Kay Kim', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A079', 'Pengarang Mohd. Fadhil Othman', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A080', 'Fawzi Basri', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A081', 'Hasnah bte Musa', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A082', 'Haji Buyong Adil', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A083', 'Yoneo Ishii', 'Japanese');
INSERT INTO AUTHOR VALUES ('A084', 'Syed Muhammad Naguib Al-Attas', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A085', 'Abdul Rahman Haji Abdullah', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A086', 'Zainal Abidin bin Abdul Wahid', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A087', 'penyusun', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A088', 'Ustaz Abdul Basit bin Abdul Rahman', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A089', 'Kassim Thukiman', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A090', 'Yahaya Abu Bakar', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A091', 'Mahmud Embong', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A092', 'Maruwiah Ahmat', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A093', 'Dr. Khalid Muhammad Khalid', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A094', 'Mahani Musa', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A095', 'Muhammad Husain Haekal', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A096', 'Fathuri Ahza Mumtaza', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A097', 'Jas Laile Suzana Jaafar', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A098', 'Ainon Mohd', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A099', 'Abdullah Hassan', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A100', 'Soon Siew Fuang', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A101', 'Siti Eiasah Abd. Rashid', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A102', 'Azam Md. Atan', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A103', 'Ladin Nuawi', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A104', 'Khadijah Alari', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A105', 'Mohamed Fadzil Che Din', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A106', 'John McIlwain', 'British');
INSERT INTO AUTHOR VALUES ('A107', 'HB. Akhyar', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A108', 'Pathmanathan R. Nalasamy', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A109', 'Siti Hajar Abu Bakar Ah', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A110', 'Normah Che Din', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A111', 'Mahadir Ahmad', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A112', 'Rogayah Ab Razak', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A113', 'Fonny Dameaty Hutagalung', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A114', 'Chew Fong Peng', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A115', 'Wadiassofi Jaafar', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A116', 'Mohd Kamal Mohd Ali', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A117', ': Ustaz Tuan Asmawi Tuan Umar', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A118', 'Ustaz Azuraudi Jusoh', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A119', 'Ustaz Syamsul', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A120', 'Shukri Ahmad', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A121', 'Wan Ab. Rahman Khudzi Wan Abdullah', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A122', 'Mohd. Fadzilah Kamsah', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A123', 'Fauzul Naim Ishak', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A124', 'Adrian R.Nugraha', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A125', 'Deny Riana', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A126', 'R. Harjit Kaur', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A127', 'Harpreet Kaur', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A128', 'Tapasi De', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A129', 'Ashadi bin Mohd Zain', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A130', 'Tony H.', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A131', 'Abu Hikmah Al-Husni', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A132', 'Ainol Khusyairi Radzi', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A133', 'Hakimi Muhammad', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A134', ': Moulvi Al-Hafiz S.A. Seyed Ibrahim Al-Bukhari M.A.', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A135', 'Abdul Manaf Bohari', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A136', 'Juliana Aida Abu Bakar', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A137', 'Zakirah Othman', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A138', 'Hamdan Ali', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A139', 'Shawaludin Md. Aris', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A140', 'Mat Misiah Ayob', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A141', 'Abdul Razak Hamdan', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A142', 'Mohd Aizaini bin Maarof', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A143', 'Ahmad Shukri Mohd Nain', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A144', 'Amran Md. Rasli', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A145', 'Jamalludin Harun', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A146', 'Shoichi Yamashita (ed)', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A147', 'Goh Ong Sing', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A148', 'Farid Ahmad', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A149', 'Mahamud Shahid', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A150', 'Mohamed bin Daud', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A151', 'Muhd Zohadie Bardaie', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A152', 'Ron White', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A153', 'Mazleena Salleh', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A154', 'M. Manimaran', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A155', 'editor', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A156', 'Anil Madaan', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A157', 'Othman Shariff', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A158', 'C. J. Date', 'American');
INSERT INTO AUTHOR VALUES ('A159', 'Robert C. Goldstein', 'American');
INSERT INTO AUTHOR VALUES ('A160', 'David Litchfield', 'British');
INSERT INTO AUTHOR VALUES ('A161', 'Philip J. Pratt', 'American');
INSERT INTO AUTHOR VALUES ('A162', 'Isaac Hunter Dunlap', 'American');
INSERT INTO AUTHOR VALUES ('A163', 'Peter Rob', 'American');
INSERT INTO AUTHOR VALUES ('A164', 'Carlos Coronel', 'American');
INSERT INTO AUTHOR VALUES ('A165', 'Laura C. Rivero', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A166', 'Jorge H. Doorn', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A167', 'Viviana E. Ferraggine', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A168', 'Iskandar Ab Rashid', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A169', 'Zaitun Ismail', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A170', 'Michael Malcher', 'American');
INSERT INTO AUTHOR VALUES ('A171', 'Paul Feldman', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A172', 'Love Bhabuta and Simon Holloway', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A173', 'Carol Tenopir and Gerald Lundeen', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A174', 'George U. Hubbard', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A175', 'Patrice-Anne Rutledge', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A176', 'J. Paredaens', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A177', 'Online Training Solutions', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A178', 'Colin J. White', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A179', 'Marini Abu Bakar', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A180', 'Norleyza Jailani', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A181', 'Sufian Idris', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A182', 'Zalmiyah Zakaria', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A183', 'Rosli Ab. Ghani', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A184', 'Marjorie M. Leeson', 'American');
INSERT INTO AUTHOR VALUES ('A185', 'Jim Buyens', 'American');
INSERT INTO AUTHOR VALUES ('A186', 'Mitch Gould', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A187', 'Van Thurston', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A188', 'James S. Quasney', 'American');
INSERT INTO AUTHOR VALUES ('A189', 'Arthur M. Keller', 'American');
INSERT INTO AUTHOR VALUES ('A190', 'Frank C. DiIorio', 'American');
INSERT INTO AUTHOR VALUES ('A191', 'Seymour Lipschutz and Arthur Poe', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A192', 'Barbara Li Santi', 'American');
INSERT INTO AUTHOR VALUES ('A193', 'Lydia Mann', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A194', 'Fred Zlotnick', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A195', 'D. S. Malik', 'American');
INSERT INTO AUTHOR VALUES ('A196', 'Joseph C. Stockman and Alan Simpson', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A197', 'Rick Greenwald', 'American');
INSERT INTO AUTHOR VALUES ('A198', 'Andrew Watt', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A199', 'Dr. P. Sellappan', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A200', 'watfor', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A201', 'watfiv', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A202', 'David T.Basso and Ronald D.Schwartz', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A203', 'Ali Behforooz and Martin O.Holoien', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A204', 'Edward J. Coburn', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A205', 'Stephen Hawking', 'British');
INSERT INTO AUTHOR VALUES ('A206', 'Michio Kaku', 'American');
INSERT INTO AUTHOR VALUES ('A207', 'Brian Greene', 'American');
INSERT INTO AUTHOR VALUES ('A208', 'Richard Feynman', 'American');
INSERT INTO AUTHOR VALUES ('A209', 'Carl Sagan', 'American');
INSERT INTO AUTHOR VALUES ('A210', 'Sam Kean', 'American');
INSERT INTO AUTHOR VALUES ('A211', 'Penny Le Couteur', 'Canadian');
INSERT INTO AUTHOR VALUES ('A212', 'Jay Burreson', 'American');
INSERT INTO AUTHOR VALUES ('A213', 'Theodore Gray', 'American');
INSERT INTO AUTHOR VALUES ('A214', 'Hugh Aldersey-Williams', 'British');
INSERT INTO AUTHOR VALUES ('A215', 'Oliver Sacks', 'British');
INSERT INTO AUTHOR VALUES ('A216', 'Richard Dawkins', 'British');
INSERT INTO AUTHOR VALUES ('A217', 'Charles Darwin', 'British');
INSERT INTO AUTHOR VALUES ('A218', 'Shahnon Ahmad', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A219', 'Abdullah Hussain', 'Malaysian');
INSERT INTO AUTHOR VALUES ('A220', 'Donald E. Knuth', 'American');

-- ---- BOOK (177 rows — real titles/authors; ISBN/publisher/year are
--      placeholder, not verified against the source catalogue) ----

INSERT INTO BOOK VALUES ('B001', 'CAT01', 'Wanita dalam sains & teknologi', '978-967-100-000-0', 1975, 'Dewan Bahasa dan Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B002', 'CAT01', 'Pendidikan tinggi sains ke arah reformasi pendidikan', '978-967-101-001-1', 1982, 'PTS Publications', 4, 4);
INSERT INTO BOOK VALUES ('B003', 'CAT01', 'Al-Quran dan sains moden', '978-967-102-002-2', 1989, 'Utusan Publications', 5, 4);
INSERT INTO BOOK VALUES ('B004', 'CAT01', 'Penaksiran dalam pendidikan & sains sosial', '978-967-103-003-3', 1996, 'ITBM', 6, 6);
INSERT INTO BOOK VALUES ('B005', 'CAT01', 'Bukti-bukti sains & sejarah kerasulan Muhammad', '978-967-104-004-4', 2003, 'Oxford Fajar', 7, 7);
INSERT INTO BOOK VALUES ('B006', 'CAT01', 'Pentingnya pemeribumian sains dan teknologi', '978-967-105-005-5', 2010, 'Pearson', 3, 3);
INSERT INTO BOOK VALUES ('B007', 'CAT01', 'Kesan penggunaan bahasa Inggeris dalam pengajaran sains dan matematik di Institutsi Pendidikan di Malaysia', '978-967-106-006-6', 2017, 'Wiley', 4, 4);
INSERT INTO BOOK VALUES ('B008', 'CAT01', 'Astronomi Islam dan perkembangan sains kegemilangan masa lalu cabaran masa depan', '978-967-107-007-7', 1975, 'O''Reilly Media', 5, 5);
INSERT INTO BOOK VALUES ('B009', 'CAT01', 'Perbalahan hebat dalam sains sepuluh perbalahan paling hangat', '978-967-108-008-8', 1982, 'Penerbit UTM', 6, 6);
INSERT INTO BOOK VALUES ('B010', 'CAT01', 'Oh, senangnya Sains! : biologi', '978-967-109-009-9', 1989, 'Penerbit USM', 7, 7);
INSERT INTO BOOK VALUES ('B011', 'CAT01', 'Mahu menguasai sains tulen? berpuasalah!', '978-967-110-010-0', 1996, 'Dewan Bahasa dan Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B012', 'CAT01', 'Peranan dan orientasi sains sosial Malaysia', '978-967-111-011-1', 2003, 'PTS Publications', 4, 4);
INSERT INTO BOOK VALUES ('B013', 'CAT01', 'ENSIKLOPEDIA Pendidikan SAINS Dalam AL-QURAN', '978-967-112-012-2', 2010, 'Utusan Publications', 5, 5);
INSERT INTO BOOK VALUES ('B014', 'CAT06', 'Kepelbagaian biologi dan pengurusan Taman Negeri Perlis persekitaran fizikal dan biologi wang kelian', '978-967-113-013-3', 2017, 'ITBM', 6, 6);
INSERT INTO BOOK VALUES ('B015', 'CAT06', 'Fuiyooo... Senangnya Biologi!. Tingkatan 4-5', '978-967-114-014-4', 1975, 'Oxford Fajar', 7, 7);
INSERT INTO BOOK VALUES ('B016', 'CAT06', 'Setinggi manakah terbangnya enggang? kerjaya dalam kepelbagaian biologi dan pengurusan alam sekitar Malaysia', '978-967-115-015-5', 1982, 'Pearson', 3, 3);
INSERT INTO BOOK VALUES ('B017', 'CAT06', 'Langkah-langkah pertama satu kit pengajaran ke arah mengarusperdanakan gender dalam pengurusan kepelbagaian biologi di Malaysia', '978-967-116-016-6', 1989, 'Wiley', 4, 3);
INSERT INTO BOOK VALUES ('B018', 'CAT02', 'Novel perang dalam kesusasteraan Malaysia, Indonesia dan Filipina satu perbandingan', '978-967-117-017-7', 1996, 'O''Reilly Media', 5, 5);
INSERT INTO BOOK VALUES ('B019', 'CAT02', 'Kesusasteraan baru Indonesia dari Abdullah bin Abdul Kadir Munshi sampai kepada Chairil Anwar', '978-967-118-018-8', 2003, 'Penerbit UTM', 6, 6);
INSERT INTO BOOK VALUES ('B020', 'CAT02', 'Kesusasteraan lama Indonesia', '978-967-119-019-9', 2010, 'Penerbit USM', 7, 7);
INSERT INTO BOOK VALUES ('B021', 'CAT02', 'Ilmu Diplomatik Melayu dalam Kesusasteraan Melayu Tradisional', '978-967-120-020-0', 2017, 'Dewan Bahasa dan Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B022', 'CAT02', 'Jejak warisan suatu perspektif sejarah tentang penglibatan kaum Cina dalam bahasa dan sastera Melayu', '978-967-121-021-1', 1975, 'PTS Publications', 4, 4);
INSERT INTO BOOK VALUES ('B023', 'CAT07', 'Antologi puisi 1 Malaysia syair, pantun, teka-teki, gurindam, sajak', '978-967-122-022-2', 1982, 'Utusan Publications', 5, 5);
INSERT INTO BOOK VALUES ('B024', 'CAT07', 'Puisi baharu Melayu 1961-1986', '978-967-123-023-3', 1989, 'ITBM', 6, 6);
INSERT INTO BOOK VALUES ('B025', 'CAT07', 'Antologi puisi patriotik', '978-967-124-024-4', 1996, 'Oxford Fajar', 7, 7);
INSERT INTO BOOK VALUES ('B026', 'CAT07', 'Kompilasi Puisi : Anak Jiran Tionghua : 50 Sajak Perpaduan & Keamanan', '978-967-125-025-5', 2003, 'Pearson', 3, 3);
INSERT INTO BOOK VALUES ('B027', 'CAT07', 'antologi puisi Gemersik Tiga', '978-967-126-026-6', 2010, 'Wiley', 4, 4);
INSERT INTO BOOK VALUES ('B028', 'CAT07', 'Penagih Puisi', '978-967-127-027-7', 2017, 'O''Reilly Media', 5, 5);
INSERT INTO BOOK VALUES ('B029', 'CAT07', 'Dirgahayu Tuanku puisi-puisi Kamariah Nuri sasterawan Perak Darul Ridzuan', '978-967-128-028-8', 1975, 'Penerbit UTM', 6, 5);
INSERT INTO BOOK VALUES ('B030', 'CAT07', 'Rindu Ibu 101 Puisi Kanak-Kanak Menjelang Remaja', '978-967-129-029-9', 1982, 'Penerbit USM', 7, 7);
INSERT INTO BOOK VALUES ('B031', 'CAT07', 'A. Samad Said sebuah antologi puisi yang menghimpunkan karya-karya selama lebih setengah abad', '978-967-130-030-0', 1989, 'Dewan Bahasa dan Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B032', 'CAT07', 'Merenung jendela hidup kumpulan puisi', '978-967-131-031-1', 1996, 'PTS Publications', 4, 4);
INSERT INTO BOOK VALUES ('B033', 'CAT07', 'Cinta & rona kinanah : antologi cerpen & puisi : himpunan 15 penulis pelajar Malaysia dan Timur Tengah', '978-967-132-032-2', 2003, 'Utusan Publications', 5, 5);
INSERT INTO BOOK VALUES ('B034', 'CAT07', 'Antologi Cerpen Inspirasi Sajak-sajak Usman Awang Di Bawah Bayang Tulip Merah', '978-967-133-033-3', 2010, 'ITBM', 6, 6);
INSERT INTO BOOK VALUES ('B035', 'CAT07', 'WASIAT', '978-967-134-034-4', 2017, 'Oxford Fajar', 7, 7);
INSERT INTO BOOK VALUES ('B036', 'CAT07', 'Duhai yang tersayang', '978-967-135-035-5', 1975, 'Pearson', 3, 3);
INSERT INTO BOOK VALUES ('B037', 'CAT03', 'Abu Muslim menjawab 1001 masalah agama', '978-967-136-036-6', 1982, 'Wiley', 4, 4);
INSERT INTO BOOK VALUES ('B038', 'CAT03', 'Anda bertanya saya menjawab (kemusykilan agama)', '978-967-137-037-7', 1989, 'O''Reilly Media', 5, 5);
INSERT INTO BOOK VALUES ('B039', 'CAT03', 'Nabi Ibrahim dalam menegakkan kebenaran agama Allah', '978-967-138-038-8', 1996, 'Penerbit UTM', 6, 6);
INSERT INTO BOOK VALUES ('B040', 'CAT03', 'Islam bukan agama keganasan', '978-967-139-039-9', 2003, 'Penerbit USM', 7, 7);
INSERT INTO BOOK VALUES ('B041', 'CAT03', '1001 pertanyaan soal jawab agama', '978-967-140-040-0', 2010, 'Dewan Bahasa dan Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B042', 'CAT03', '50 masalah penting dalam agama dari tinjauan hadis sahih dan dhaif', '978-967-141-041-1', 2017, 'PTS Publications', 4, 4);
INSERT INTO BOOK VALUES ('B043', 'CAT03', 'Keganasan menurut perspektif agama Yahudi, Kristian & Islam', '978-967-142-042-2', 1975, 'Utusan Publications', 5, 5);
INSERT INTO BOOK VALUES ('B044', 'CAT03', '300 jawapan kemusykilan agama wanita jilid 2', '978-967-143-043-3', 1982, 'ITBM', 6, 6);
INSERT INTO BOOK VALUES ('B045', 'CAT03', 'Membongkar Sejarah Agama Dan Budaya Melayu : Perjalanan Panjang Merentas Masa Merubah Zaman', '978-967-144-044-4', 1989, 'Oxford Fajar', 7, 6);
INSERT INTO BOOK VALUES ('B046', 'CAT03', 'Ensiklopedia Soal Jawab Agama Akidah ? Tasawuf ? Taharah ? Solat ? Muamalat', '978-967-145-045-5', 1996, 'Pearson', 3, 3);
INSERT INTO BOOK VALUES ('B047', 'CAT03', 'Kursus dan bimbingan perkahwinan serta 20 soal jawab temuduga Jabatan Agama Islam', '978-967-146-046-6', 2003, 'Wiley', 4, 4);
INSERT INTO BOOK VALUES ('B048', 'CAT03', 'The Malay dilemma Bahasa, bangsa & agama', '978-967-147-047-7', 2010, 'O''Reilly Media', 5, 5);
INSERT INTO BOOK VALUES ('B049', 'CAT03', 'Wanita bertanya ulama menjawab 10001 soal jawab agama', '978-967-148-048-8', 2017, 'Penerbit UTM', 6, 6);
INSERT INTO BOOK VALUES ('B050', 'CAT03', 'Khilaf perselisihan pandangan dalam agama', '978-967-149-049-9', 1975, 'Penerbit USM', 7, 7);
INSERT INTO BOOK VALUES ('B051', 'CAT08', 'Islam panduan komprehensif keluarga bahagia', '978-967-150-050-0', 1982, 'Dewan Bahasa dan Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B052', 'CAT08', 'Islam agama bisnes & pengurusan', '978-967-151-051-1', 1989, 'PTS Publications', 4, 4);
INSERT INTO BOOK VALUES ('B053', 'CAT08', 'Islam : Kesihatan Mental Dan Neuropsikiatri', '978-967-152-052-2', 1996, 'Utusan Publications', 5, 5);
INSERT INTO BOOK VALUES ('B054', 'CAT08', 'Kefahaman orang-orang bukan Islam tentang Islam dan pembangunan imej Islam', '978-967-153-053-3', 2003, 'ITBM', 6, 6);
INSERT INTO BOOK VALUES ('B055', 'CAT08', 'Kefahaman orang bukan Islam tentang Islam kesannya terhadap peningkatan syiar Islam di Malaysia', '978-967-154-054-4', 2010, 'Oxford Fajar', 7, 7);
INSERT INTO BOOK VALUES ('B056', 'CAT08', 'Kedudukan orang bukan Islam dalam sejarah pemerintahan Islam', '978-967-155-055-5', 2017, 'Pearson', 3, 3);
INSERT INTO BOOK VALUES ('B057', 'CAT08', 'Isu Islam semasa', '978-967-156-056-6', 1975, 'Wiley', 4, 4);
INSERT INTO BOOK VALUES ('B058', 'CAT08', 'Pendidikan Islam Malaysia', '978-967-157-057-7', 1982, 'O''Reilly Media', 5, 5);
INSERT INTO BOOK VALUES ('B059', 'CAT08', 'Perspectives on Islam and the future of muslims', '978-967-158-058-8', 1989, 'Penerbit UTM', 6, 6);
INSERT INTO BOOK VALUES ('B060', 'CAT08', 'Islam di Sabah', '978-967-159-059-9', 1996, 'Penerbit USM', 7, 6);
INSERT INTO BOOK VALUES ('B061', 'CAT08', 'What is Islam?', '978-967-160-060-0', 2003, 'Dewan Bahasa dan Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B062', 'CAT08', 'Unsur-unsur kekuatan dalam Islam', '978-967-161-061-1', 2010, 'PTS Publications', 4, 4);
INSERT INTO BOOK VALUES ('B063', 'CAT08', 'Tamadun Islam di Malaysia', '978-967-162-062-2', 2017, 'Utusan Publications', 5, 5);
INSERT INTO BOOK VALUES ('B064', 'CAT04', 'Sejarah Keretapi di Malaysia', '978-967-163-063-3', 1975, 'ITBM', 6, 6);
INSERT INTO BOOK VALUES ('B065', 'CAT04', 'Dewan Perniagaan dan Perusahaan Melayu Malaysia sejarah penubuhan dan peranannya', '978-967-164-064-4', 1982, 'Oxford Fajar', 7, 7);
INSERT INTO BOOK VALUES ('B066', 'CAT04', 'Sejarah Sarawak', '978-967-165-065-5', 1989, 'Pearson', 3, 3);
INSERT INTO BOOK VALUES ('B067', 'CAT04', 'Sejarah Sangha Thai hubungan Buddhisme dengan negara dan masyarakat', '978-967-166-066-6', 1996, 'Wiley', 4, 4);
INSERT INTO BOOK VALUES ('B068', 'CAT04', 'Islam dalam sejarah dan kebudayaan Melayu', '978-967-167-067-7', 2003, 'O''Reilly Media', 5, 5);
INSERT INTO BOOK VALUES ('B069', 'CAT04', 'Wacana falsafah sejarah perspektif barat dan timur', '978-967-168-068-8', 2010, 'Penerbit UTM', 6, 6);
INSERT INTO BOOK VALUES ('B070', 'CAT04', 'Sejarah Malaysia pentafsiran dan penulisan', '978-967-169-069-9', 2017, 'Penerbit USM', 7, 7);
INSERT INTO BOOK VALUES ('B071', 'CAT04', 'Mengenali Madinah Munawwarah menerusi kesan-kesan sejarah', '978-967-170-070-0', 1975, 'Dewan Bahasa dan Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B072', 'CAT04', 'Menelusuri sejarah tempatan Johor', '978-967-171-071-1', 1982, 'PTS Publications', 4, 4);
INSERT INTO BOOK VALUES ('B073', 'CAT04', 'Sejarah Bani Umayyah di Andalus', '978-967-172-072-2', 1989, 'Utusan Publications', 5, 5);
INSERT INTO BOOK VALUES ('B074', 'CAT04', 'Sejarah 133 wira Rasulullah SAW terbilang', '978-967-173-073-3', 1996, 'ITBM', 6, 6);
INSERT INTO BOOK VALUES ('B075', 'CAT04', 'Sejarah & sosioekonomi wanita Melayu Kedah 1881-1940', '978-967-174-074-4', 2003, 'Oxford Fajar', 7, 7);
INSERT INTO BOOK VALUES ('B076', 'CAT04', 'Sejarah hidup Muhammad S.A.W.', '978-967-175-075-5', 2010, 'Pearson', 3, 3);
INSERT INTO BOOK VALUES ('B077', 'CAT09', '70 DOA HARIAN untuk Kanak-Kanak', '978-967-176-076-6', 2017, 'Wiley', 4, 4);
INSERT INTO BOOK VALUES ('B078', 'CAT09', 'Psikologi kanak-kanak dan remaja', '978-967-177-077-7', 1975, 'O''Reilly Media', 5, 5);
INSERT INTO BOOK VALUES ('B079', 'CAT09', 'Mengajar kanak-kanak berfikir panduan guru bahan latihan', '978-967-178-078-8', 1982, 'Penerbit UTM', 6, 6);
INSERT INTO BOOK VALUES ('B080', 'CAT09', 'Koleksi permainan tradisi kanak-kanak Malaysia', '978-967-179-079-9', 1989, 'Penerbit USM', 7, 7);
INSERT INTO BOOK VALUES ('B081', 'CAT09', 'Sup untuk santapan rohani kanak-kanak', '978-967-180-080-0', 1996, 'Dewan Bahasa dan Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B082', 'CAT09', 'Skrip teater kanak-kanak Negeri Kebayan dan lain-lain cerita', '978-967-181-081-1', 2003, 'PTS Publications', 4, 4);
INSERT INTO BOOK VALUES ('B083', 'CAT09', 'Penderaan kanak-kanak cara mengatasi', '978-967-182-082-2', 2010, 'Utusan Publications', 5, 5);
INSERT INTO BOOK VALUES ('B084', 'CAT09', 'Kamus ilustrasi kanak-kanak', '978-967-183-083-3', 2017, 'ITBM', 6, 6);
INSERT INTO BOOK VALUES ('B085', 'CAT09', 'Ensiklomini Ibadah untuk Kanak-Kanak Mengenal Islam Melalui Huruf-Huruf Hijaiah', '978-967-184-084-4', 1975, 'Oxford Fajar', 7, 7);
INSERT INTO BOOK VALUES ('B086', 'CAT09', 'Hak kanak-kanak dalam jagaan institusi awam', '978-967-185-085-5', 1982, 'Pearson', 3, 3);
INSERT INTO BOOK VALUES ('B087', 'CAT09', 'Pengurusan Klinikal Kanak-Kanak Disleksia', '978-967-186-086-6', 1989, 'Wiley', 4, 4);
INSERT INTO BOOK VALUES ('B088', 'CAT09', 'Penyelidikan dalam Pendidikan Awal Kanak-kanak', '978-967-187-087-7', 1996, 'O''Reilly Media', 5, 5);
INSERT INTO BOOK VALUES ('B089', 'CAT09', 'Kumpulan Cerpen Kanak-Kanak : Sepakat Membawa Berkat', '978-967-188-088-8', 2003, 'Penerbit UTM', 6, 6);
INSERT INTO BOOK VALUES ('B090', 'CAT09', 'Interpretasi lukisan kanak-kanak panduan kepada pendidik awal kanak-kanak', '978-967-189-089-9', 2010, 'Penerbit USM', 7, 7);
INSERT INTO BOOK VALUES ('B091', 'CAT09', 'Senangnya Solat Untuk Kanak-Kanak', '978-967-190-090-0', 2017, 'Dewan Bahasa dan Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B092', 'CAT12', 'Cerita-cerita motivasi jiwa', '978-967-191-091-1', 1975, 'PTS Publications', 4, 4);
INSERT INTO BOOK VALUES ('B093', 'CAT12', 'Cerita-cerita motivasi untuk pemimpin', '978-967-192-092-2', 1982, 'Utusan Publications', 5, 5);
INSERT INTO BOOK VALUES ('B094', 'CAT12', 'Cerita-cerita Quran menakjubkan untuk buah hati', '978-967-193-093-3', 1989, 'ITBM', 6, 6);
INSERT INTO BOOK VALUES ('B095', 'CAT12', 'Koleksi cerita-cerita moral haiwan', '978-967-194-094-4', 1996, 'Oxford Fajar', 7, 7);
INSERT INTO BOOK VALUES ('B096', 'CAT12', 'Koleksi Cerita HAiWAN RiMBA dan Cerita-Cerita Lain', '978-967-195-095-5', 2003, 'Pearson', 3, 3);
INSERT INTO BOOK VALUES ('B097', 'CAT12', '52 cerita dongeng koleksi sebuah cerita setiap minggu', '978-967-196-096-6', 2010, 'Wiley', 4, 4);
INSERT INTO BOOK VALUES ('B098', 'CAT12', 'Cerita betul facebook membongkar cerita di sebalik kemasyhuran facebook', '978-967-197-097-7', 2017, 'O''Reilly Media', 5, 5);
INSERT INTO BOOK VALUES ('B099', 'CAT12', 'Kumpulan cerita ajaib, aneh & mencuit hati', '978-967-198-098-8', 1975, 'Penerbit UTM', 6, 6);
INSERT INTO BOOK VALUES ('B100', 'CAT12', 'Cerita-certia motivasi untuk iman', '978-967-199-099-9', 1982, 'Penerbit USM', 7, 7);
INSERT INTO BOOK VALUES ('B101', 'CAT12', 'Cerita yang belum berakhir', '978-967-200-100-0', 1989, 'Dewan Bahasa dan Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B102', 'CAT12', '2002 memori kumpulan cerita ajaib, aneh & mencuit hati siri - 2', '978-967-201-101-1', 1996, 'PTS Publications', 4, 4);
INSERT INTO BOOK VALUES ('B103', 'CAT12', 'Koleksi cerita fabel kegemaranku', '978-967-202-102-2', 2003, 'Utusan Publications', 5, 5);
INSERT INTO BOOK VALUES ('B104', 'CAT12', 'Satu Hari Satu Cerita 366 Cerita Dari Al-Quran Dan Hadis', '978-967-203-103-3', 2010, 'ITBM', 6, 6);
INSERT INTO BOOK VALUES ('B105', 'CAT10', 'Teknologi maklumat dan komunikasi pendekatan pengurusan teknologi', '978-967-204-104-4', 2017, 'Oxford Fajar', 7, 7);
INSERT INTO BOOK VALUES ('B106', 'CAT10', 'Teknologi penyejukan dan penyamanan udara', '978-967-205-105-5', 1975, 'Pearson', 3, 3);
INSERT INTO BOOK VALUES ('B107', 'CAT10', 'Teknologi maklumat & komunikasi', '978-967-206-106-6', 1982, 'Wiley', 4, 4);
INSERT INTO BOOK VALUES ('B108', 'CAT10', 'Teknologi maklumat multimedia, keselamatan data, dan koridor raya multimedia (MSC)', '978-967-207-107-7', 1989, 'O''Reilly Media', 5, 5);
INSERT INTO BOOK VALUES ('B109', 'CAT10', 'Pengurusan teknologi', '978-967-208-108-8', 1996, 'Penerbit UTM', 6, 6);
INSERT INTO BOOK VALUES ('B110', 'CAT10', 'Teknologi maklumat sistem komputer dan perisian', '978-967-209-109-9', 2003, 'Penerbit USM', 7, 7);
INSERT INTO BOOK VALUES ('B111', 'CAT10', 'Teknologi video digital teori dan praktis', '978-967-210-110-0', 2010, 'Dewan Bahasa dan Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B112', 'CAT10', 'Pemindahan teknologi dan pengurusan Jepun ke negara-negara ASEAN', '978-967-211-111-1', 2017, 'PTS Publications', 4, 4);
INSERT INTO BOOK VALUES ('B113', 'CAT10', 'Kamus komputer dan teknologi maklumat', '978-967-212-112-2', 1975, 'Utusan Publications', 5, 5);
INSERT INTO BOOK VALUES ('B114', 'CAT10', 'Teknologi maklumat internet, sistem maklumat dan bahasa pengaturcaraan', '978-967-213-113-3', 1982, 'ITBM', 6, 6);
INSERT INTO BOOK VALUES ('B115', 'CAT10', 'Manual teknologi fertigasi penanaman cili, rockmelon dan tomato', '978-967-214-114-4', 1989, 'Oxford Fajar', 7, 7);
INSERT INTO BOOK VALUES ('B116', 'CAT10', 'Komputer itu mudah', '978-967-215-115-5', 1996, 'Pearson', 3, 3);
INSERT INTO BOOK VALUES ('B117', 'CAT10', 'Bagaimana komputer berfungsi', '978-967-216-116-6', 2003, 'Wiley', 4, 4);
INSERT INTO BOOK VALUES ('B118', 'CAT10', 'Organisasi komputer dan bahasa himpunan', '978-967-217-117-7', 2010, 'O''Reilly Media', 5, 5);
INSERT INTO BOOK VALUES ('B119', 'CAT10', 'Penyelesaian kegagalan komputer', '978-967-218-118-8', 2017, 'Penerbit UTM', 6, 6);
INSERT INTO BOOK VALUES ('B120', 'CAT10', 'Pemasangan komputer', '978-967-219-119-9', 1975, 'Penerbit USM', 7, 6);
INSERT INTO BOOK VALUES ('B121', 'CAT10', 'Golden''s kamus komputer bergambar untuk umur 9 hingga 99 tahun', '978-967-220-120-0', 1982, 'Dewan Bahasa dan Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B122', 'CAT10', 'Manual asas kerosakan dan baik pulih komputer peribadi', '978-967-221-121-1', 1989, 'PTS Publications', 4, 4);
INSERT INTO BOOK VALUES ('B123', 'CAT13', 'Database a primer', '978-967-222-122-2', 1996, 'Utusan Publications', 5, 5);
INSERT INTO BOOK VALUES ('B124', 'CAT13', 'Database technology and management', '978-967-223-123-3', 2003, 'ITBM', 6, 6);
INSERT INTO BOOK VALUES ('B125', 'CAT13', 'The database hacker''s handbooks defending database servers', '978-967-224-124-4', 2010, 'Oxford Fajar', 7, 7);
INSERT INTO BOOK VALUES ('B126', 'CAT13', 'Microcomputer database management using dBase 1V', '978-967-225-125-5', 2017, 'Pearson', 3, 3);
INSERT INTO BOOK VALUES ('B127', 'CAT13', 'Microcomputer database management using dBase IV version 1.1', '978-967-226-126-6', 1975, 'Wiley', 4, 4);
INSERT INTO BOOK VALUES ('B128', 'CAT13', 'Open source database driven web development a guide for information professionals', '978-967-227-127-7', 1982, 'O''Reilly Media', 5, 4);
INSERT INTO BOOK VALUES ('B129', 'CAT13', 'Database systems design, implementation, and management', '978-967-228-128-8', 1989, 'Penerbit UTM', 6, 6);
INSERT INTO BOOK VALUES ('B130', 'CAT13', 'Encyclopedia of database technologies and applications', '978-967-229-129-9', 1996, 'Penerbit USM', 7, 7);
INSERT INTO BOOK VALUES ('B131', 'CAT13', 'An introduction to database systems', '978-967-230-130-0', 2003, 'Dewan Bahasa dan Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B132', 'CAT13', 'Fun with database', '978-967-231-131-1', 2010, 'PTS Publications', 4, 4);
INSERT INTO BOOK VALUES ('B133', 'CAT14', 'Oracle database administration for Micrososft SQL server DBAs Work seamlessly in a mixed-database environment', '978-967-232-132-2', 2017, 'Utusan Publications', 5, 4);
INSERT INTO BOOK VALUES ('B134', 'CAT13', 'Information management and planning database 87', '978-967-233-133-3', 1975, 'ITBM', 6, 6);
INSERT INTO BOOK VALUES ('B135', 'CAT13', 'Managing your information how to design and create a textual database on your microcomputer', '978-967-234-134-4', 1982, 'Oxford Fajar', 7, 7);
INSERT INTO BOOK VALUES ('B136', 'CAT13', 'Computer-assisted data base design', '978-967-235-135-5', 1989, 'Pearson', 3, 2);
INSERT INTO BOOK VALUES ('B137', 'CAT13', 'Access 2000 fast & easy', '978-967-236-136-6', 1996, 'Wiley', 4, 4);
INSERT INTO BOOK VALUES ('B138', 'CAT13', 'Databases', '978-967-237-137-7', 2003, 'O''Reilly Media', 5, 5);
INSERT INTO BOOK VALUES ('B139', 'CAT13', 'Microsoft Office Access 2003 step by step', '978-967-238-138-8', 2010, 'Penerbit UTM', 6, 6);
INSERT INTO BOOK VALUES ('B140', 'CAT13', 'A guide to DB2', '978-967-239-139-9', 2017, 'Penerbit USM', 7, 6);
INSERT INTO BOOK VALUES ('B141', 'CAT16', 'Pengaturcaraan C', '978-967-240-140-0', 1975, 'Dewan Bahasa dan Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B142', 'CAT16', 'Pengenalan pengaturcaraan LISP', '978-967-241-141-1', 1982, 'PTS Publications', 4, 4);
INSERT INTO BOOK VALUES ('B143', 'CAT16', 'Asas pengaturcaraan pengkalan data web PHP-MySQL', '978-967-242-142-2', 1989, 'Utusan Publications', 5, 5);
INSERT INTO BOOK VALUES ('B144', 'CAT16', 'Programming logic', '978-967-243-143-3', 1996, 'ITBM', 6, 6);
INSERT INTO BOOK VALUES ('B145', 'CAT16', 'Faster smarter beginning programming', '978-967-244-144-4', 2003, 'Oxford Fajar', 7, 6);
INSERT INTO BOOK VALUES ('B146', 'CAT16', 'Windows 95 multimedia programming', '978-967-245-145-5', 2010, 'Pearson', 3, 3);
INSERT INTO BOOK VALUES ('B147', 'CAT16', 'Programming in Quick BASIC', '978-967-246-146-6', 2017, 'Wiley', 4, 4);
INSERT INTO BOOK VALUES ('B148', 'CAT16', 'A first course in computer programming using PASCAL', '978-967-247-147-7', 1975, 'O''Reilly Media', 5, 5);
INSERT INTO BOOK VALUES ('B149', 'CAT16', 'SAS applications programming a gentle introduction', '978-967-248-148-8', 1982, 'Penerbit UTM', 6, 6);
INSERT INTO BOOK VALUES ('B150', 'CAT16', 'Schaum''s outline of theory and problems of programming with fortran', '978-967-249-149-9', 1989, 'Penerbit USM', 7, 6);
INSERT INTO BOOK VALUES ('B151', 'CAT16', 'Algorithms, programming, pascal', '978-967-250-150-0', 1996, 'Dewan Bahasa dan Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B152', 'CAT16', 'C++ programming from problem anlaysis to program design', '978-967-251-151-1', 2003, 'PTS Publications', 4, 4);
INSERT INTO BOOK VALUES ('B153', 'CAT16', 'Access 2007 VBA programming for dummies', '978-967-252-152-2', 2010, 'Utusan Publications', 5, 5);
INSERT INTO BOOK VALUES ('B154', 'CAT14', 'Professional Oracle programming', '978-967-253-153-3', 2017, 'ITBM', 6, 5);
INSERT INTO BOOK VALUES ('B155', 'CAT16', 'Microsoft SQL Server 2005 programming for dummies', '978-967-254-154-4', 1975, 'Oxford Fajar', 7, 7);
INSERT INTO BOOK VALUES ('B156', 'CAT16', 'Visual Basic.Net Programming', '978-967-255-155-5', 1982, 'Pearson', 3, 3);
INSERT INTO BOOK VALUES ('B157', 'CAT16', 'Programming with fortran', '978-967-256-156-6', 1989, 'Wiley', 4, 4);
INSERT INTO BOOK VALUES ('B158', 'CAT16', 'Problem solving and structured programming with pascal', '978-967-257-157-7', 1996, 'O''Reilly Media', 5, 5);
INSERT INTO BOOK VALUES ('B159', 'CAT16', 'Advanced basic structured programming for microcomputers', '978-967-258-158-8', 2003, 'Penerbit UTM', 6, 6);
INSERT INTO BOOK VALUES ('B160', 'CAT05', 'A Brief History of Time', '978-967-259-159-9', 2010, 'Penerbit USM', 7, 6);
INSERT INTO BOOK VALUES ('B161', 'CAT05', 'The Universe in a Nutshell', '978-967-260-160-0', 2017, 'Dewan Bahasa dan Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B162', 'CAT05', 'Physics of the Future', '978-967-261-161-1', 1975, 'PTS Publications', 4, 4);
INSERT INTO BOOK VALUES ('B163', 'CAT05', 'The Elegant Universe', '978-967-262-162-2', 1982, 'Utusan Publications', 5, 5);
INSERT INTO BOOK VALUES ('B164', 'CAT05', 'Six Easy Pieces', '978-967-263-163-3', 1989, 'ITBM', 6, 6);
INSERT INTO BOOK VALUES ('B165', 'CAT05', 'Cosmos', '978-967-264-164-4', 1996, 'Oxford Fajar', 7, 6);
INSERT INTO BOOK VALUES ('B166', 'CAT11', 'The Disappearing Spoon', '978-967-265-165-5', 2003, 'Pearson', 3, 3);
INSERT INTO BOOK VALUES ('B167', 'CAT11', 'Napoleon''s Buttons: How 17 Molecules Changed History', '978-967-266-166-6', 2010, 'Wiley', 4, 4);
INSERT INTO BOOK VALUES ('B168', 'CAT11', 'The Elements: A Visual Exploration', '978-967-267-167-7', 2017, 'O''Reilly Media', 5, 5);
INSERT INTO BOOK VALUES ('B169', 'CAT11', 'Periodic Tales', '978-967-268-168-8', 1975, 'Penerbit UTM', 6, 6);
INSERT INTO BOOK VALUES ('B170', 'CAT11', 'Uncle Tungsten: Memories of a Chemical Boyhood', '978-967-269-169-9', 1982, 'Penerbit USM', 7, 6);
INSERT INTO BOOK VALUES ('B171', 'CAT06', 'The Selfish Gene', '978-967-270-170-0', 1989, 'Dewan Bahasa dan Pustaka', 3, 3);
INSERT INTO BOOK VALUES ('B172', 'CAT06', 'On the Origin of Species', '978-967-271-171-1', 1996, 'PTS Publications', 4, 4);
INSERT INTO BOOK VALUES ('B173', 'CAT02', 'Salina', '978-967-272-172-2', 2003, 'Utusan Publications', 5, 5);
INSERT INTO BOOK VALUES ('B174', 'CAT02', 'Ranjau Sepanjang Jalan', '978-967-273-173-3', 2010, 'ITBM', 6, 6);
INSERT INTO BOOK VALUES ('B175', 'CAT02', 'Interlok', '978-967-274-174-4', 2017, 'Oxford Fajar', 7, 7);
INSERT INTO BOOK VALUES ('B176', 'CAT02', 'Rentong', '978-967-275-175-5', 1975, 'Pearson', 3, 3);
INSERT INTO BOOK VALUES ('B177', 'CAT16', 'The Art of Computer Programming, Vol. 1: Fundamental Algorithms', '978-967-276-176-6', 1982, 'Wiley', 4, 4);

-- ---- BOOK_AUTHOR (233 rows — bridge, multi-author books included) ----

INSERT INTO BOOK_AUTHOR VALUES ('B001', 'A001');
INSERT INTO BOOK_AUTHOR VALUES ('B002', 'A002');
INSERT INTO BOOK_AUTHOR VALUES ('B002', 'A003');
INSERT INTO BOOK_AUTHOR VALUES ('B003', 'A004');
INSERT INTO BOOK_AUTHOR VALUES ('B004', 'A005');
INSERT INTO BOOK_AUTHOR VALUES ('B004', 'A006');
INSERT INTO BOOK_AUTHOR VALUES ('B005', 'A007');
INSERT INTO BOOK_AUTHOR VALUES ('B006', 'A008');
INSERT INTO BOOK_AUTHOR VALUES ('B007', 'A009');
INSERT INTO BOOK_AUTHOR VALUES ('B008', 'A010');
INSERT INTO BOOK_AUTHOR VALUES ('B009', 'A011');
INSERT INTO BOOK_AUTHOR VALUES ('B010', 'A012');
INSERT INTO BOOK_AUTHOR VALUES ('B010', 'A013');
INSERT INTO BOOK_AUTHOR VALUES ('B011', 'A014');
INSERT INTO BOOK_AUTHOR VALUES ('B012', 'A015');
INSERT INTO BOOK_AUTHOR VALUES ('B013', 'A016');
INSERT INTO BOOK_AUTHOR VALUES ('B014', 'A017');
INSERT INTO BOOK_AUTHOR VALUES ('B014', 'A018');
INSERT INTO BOOK_AUTHOR VALUES ('B014', 'A019');
INSERT INTO BOOK_AUTHOR VALUES ('B015', 'A020');
INSERT INTO BOOK_AUTHOR VALUES ('B016', 'A021');
INSERT INTO BOOK_AUTHOR VALUES ('B017', 'A022');
INSERT INTO BOOK_AUTHOR VALUES ('B017', 'A023');
INSERT INTO BOOK_AUTHOR VALUES ('B018', 'A024');
INSERT INTO BOOK_AUTHOR VALUES ('B019', 'A025');
INSERT INTO BOOK_AUTHOR VALUES ('B020', 'A025');
INSERT INTO BOOK_AUTHOR VALUES ('B021', 'A026');
INSERT INTO BOOK_AUTHOR VALUES ('B022', 'A027');
INSERT INTO BOOK_AUTHOR VALUES ('B023', 'A028');
INSERT INTO BOOK_AUTHOR VALUES ('B024', 'A029');
INSERT INTO BOOK_AUTHOR VALUES ('B024', 'A030');
INSERT INTO BOOK_AUTHOR VALUES ('B025', 'A031');
INSERT INTO BOOK_AUTHOR VALUES ('B026', 'A032');
INSERT INTO BOOK_AUTHOR VALUES ('B027', 'A033');
INSERT INTO BOOK_AUTHOR VALUES ('B027', 'A034');
INSERT INTO BOOK_AUTHOR VALUES ('B027', 'A035');
INSERT INTO BOOK_AUTHOR VALUES ('B028', 'A036');
INSERT INTO BOOK_AUTHOR VALUES ('B029', 'A037');
INSERT INTO BOOK_AUTHOR VALUES ('B030', 'A038');
INSERT INTO BOOK_AUTHOR VALUES ('B031', 'A039');
INSERT INTO BOOK_AUTHOR VALUES ('B032', 'A040');
INSERT INTO BOOK_AUTHOR VALUES ('B033', 'A041');
INSERT INTO BOOK_AUTHOR VALUES ('B034', 'A042');
INSERT INTO BOOK_AUTHOR VALUES ('B035', 'A043');
INSERT INTO BOOK_AUTHOR VALUES ('B036', 'A044');
INSERT INTO BOOK_AUTHOR VALUES ('B037', 'A045');
INSERT INTO BOOK_AUTHOR VALUES ('B038', 'A046');
INSERT INTO BOOK_AUTHOR VALUES ('B039', 'A047');
INSERT INTO BOOK_AUTHOR VALUES ('B040', 'A048');
INSERT INTO BOOK_AUTHOR VALUES ('B041', 'A049');
INSERT INTO BOOK_AUTHOR VALUES ('B042', 'A050');
INSERT INTO BOOK_AUTHOR VALUES ('B043', 'A051');
INSERT INTO BOOK_AUTHOR VALUES ('B044', 'A052');
INSERT INTO BOOK_AUTHOR VALUES ('B044', 'A053');
INSERT INTO BOOK_AUTHOR VALUES ('B045', 'A054');
INSERT INTO BOOK_AUTHOR VALUES ('B046', 'A055');
INSERT INTO BOOK_AUTHOR VALUES ('B046', 'A056');
INSERT INTO BOOK_AUTHOR VALUES ('B046', 'A057');
INSERT INTO BOOK_AUTHOR VALUES ('B046', 'A058');
INSERT INTO BOOK_AUTHOR VALUES ('B046', 'A059');
INSERT INTO BOOK_AUTHOR VALUES ('B046', 'A060');
INSERT INTO BOOK_AUTHOR VALUES ('B047', 'A061');
INSERT INTO BOOK_AUTHOR VALUES ('B048', 'A062');
INSERT INTO BOOK_AUTHOR VALUES ('B049', 'A063');
INSERT INTO BOOK_AUTHOR VALUES ('B050', 'A064');
INSERT INTO BOOK_AUTHOR VALUES ('B051', 'A065');
INSERT INTO BOOK_AUTHOR VALUES ('B052', 'A065');
INSERT INTO BOOK_AUTHOR VALUES ('B053', 'A066');
INSERT INTO BOOK_AUTHOR VALUES ('B053', 'A067');
INSERT INTO BOOK_AUTHOR VALUES ('B054', 'A068');
INSERT INTO BOOK_AUTHOR VALUES ('B055', 'A069');
INSERT INTO BOOK_AUTHOR VALUES ('B055', 'A070');
INSERT INTO BOOK_AUTHOR VALUES ('B056', 'A071');
INSERT INTO BOOK_AUTHOR VALUES ('B057', 'A072');
INSERT INTO BOOK_AUTHOR VALUES ('B058', 'A073');
INSERT INTO BOOK_AUTHOR VALUES ('B059', 'A074');
INSERT INTO BOOK_AUTHOR VALUES ('B060', 'A075');
INSERT INTO BOOK_AUTHOR VALUES ('B061', 'A076');
INSERT INTO BOOK_AUTHOR VALUES ('B062', 'A077');
INSERT INTO BOOK_AUTHOR VALUES ('B063', 'A078');
INSERT INTO BOOK_AUTHOR VALUES ('B063', 'A079');
INSERT INTO BOOK_AUTHOR VALUES ('B064', 'A080');
INSERT INTO BOOK_AUTHOR VALUES ('B065', 'A081');
INSERT INTO BOOK_AUTHOR VALUES ('B066', 'A082');
INSERT INTO BOOK_AUTHOR VALUES ('B067', 'A083');
INSERT INTO BOOK_AUTHOR VALUES ('B068', 'A084');
INSERT INTO BOOK_AUTHOR VALUES ('B069', 'A085');
INSERT INTO BOOK_AUTHOR VALUES ('B070', 'A086');
INSERT INTO BOOK_AUTHOR VALUES ('B071', 'A087');
INSERT INTO BOOK_AUTHOR VALUES ('B071', 'A088');
INSERT INTO BOOK_AUTHOR VALUES ('B072', 'A089');
INSERT INTO BOOK_AUTHOR VALUES ('B072', 'A090');
INSERT INTO BOOK_AUTHOR VALUES ('B072', 'A091');
INSERT INTO BOOK_AUTHOR VALUES ('B073', 'A092');
INSERT INTO BOOK_AUTHOR VALUES ('B074', 'A093');
INSERT INTO BOOK_AUTHOR VALUES ('B075', 'A094');
INSERT INTO BOOK_AUTHOR VALUES ('B076', 'A095');
INSERT INTO BOOK_AUTHOR VALUES ('B077', 'A096');
INSERT INTO BOOK_AUTHOR VALUES ('B078', 'A097');
INSERT INTO BOOK_AUTHOR VALUES ('B079', 'A098');
INSERT INTO BOOK_AUTHOR VALUES ('B079', 'A099');
INSERT INTO BOOK_AUTHOR VALUES ('B080', 'A100');
INSERT INTO BOOK_AUTHOR VALUES ('B081', 'A101');
INSERT INTO BOOK_AUTHOR VALUES ('B081', 'A102');
INSERT INTO BOOK_AUTHOR VALUES ('B082', 'A103');
INSERT INTO BOOK_AUTHOR VALUES ('B083', 'A104');
INSERT INTO BOOK_AUTHOR VALUES ('B083', 'A105');
INSERT INTO BOOK_AUTHOR VALUES ('B084', 'A106');
INSERT INTO BOOK_AUTHOR VALUES ('B085', 'A107');
INSERT INTO BOOK_AUTHOR VALUES ('B086', 'A108');
INSERT INTO BOOK_AUTHOR VALUES ('B086', 'A109');
INSERT INTO BOOK_AUTHOR VALUES ('B087', 'A110');
INSERT INTO BOOK_AUTHOR VALUES ('B087', 'A111');
INSERT INTO BOOK_AUTHOR VALUES ('B087', 'A112');
INSERT INTO BOOK_AUTHOR VALUES ('B088', 'A113');
INSERT INTO BOOK_AUTHOR VALUES ('B088', 'A114');
INSERT INTO BOOK_AUTHOR VALUES ('B089', 'A115');
INSERT INTO BOOK_AUTHOR VALUES ('B090', 'A116');
INSERT INTO BOOK_AUTHOR VALUES ('B091', 'A117');
INSERT INTO BOOK_AUTHOR VALUES ('B091', 'A118');
INSERT INTO BOOK_AUTHOR VALUES ('B091', 'A119');
INSERT INTO BOOK_AUTHOR VALUES ('B092', 'A120');
INSERT INTO BOOK_AUTHOR VALUES ('B092', 'A121');
INSERT INTO BOOK_AUTHOR VALUES ('B093', 'A122');
INSERT INTO BOOK_AUTHOR VALUES ('B093', 'A123');
INSERT INTO BOOK_AUTHOR VALUES ('B094', 'A124');
INSERT INTO BOOK_AUTHOR VALUES ('B094', 'A125');
INSERT INTO BOOK_AUTHOR VALUES ('B095', 'A126');
INSERT INTO BOOK_AUTHOR VALUES ('B096', 'A127');
INSERT INTO BOOK_AUTHOR VALUES ('B096', 'A128');
INSERT INTO BOOK_AUTHOR VALUES ('B097', 'A129');
INSERT INTO BOOK_AUTHOR VALUES ('B098', 'A130');
INSERT INTO BOOK_AUTHOR VALUES ('B099', 'A131');
INSERT INTO BOOK_AUTHOR VALUES ('B100', 'A132');
INSERT INTO BOOK_AUTHOR VALUES ('B101', 'A133');
INSERT INTO BOOK_AUTHOR VALUES ('B102', 'A131');
INSERT INTO BOOK_AUTHOR VALUES ('B103', 'A041');
INSERT INTO BOOK_AUTHOR VALUES ('B104', 'A134');
INSERT INTO BOOK_AUTHOR VALUES ('B105', 'A135');
INSERT INTO BOOK_AUTHOR VALUES ('B105', 'A136');
INSERT INTO BOOK_AUTHOR VALUES ('B105', 'A137');
INSERT INTO BOOK_AUTHOR VALUES ('B106', 'A138');
INSERT INTO BOOK_AUTHOR VALUES ('B106', 'A139');
INSERT INTO BOOK_AUTHOR VALUES ('B106', 'A140');
INSERT INTO BOOK_AUTHOR VALUES ('B107', 'A141');
INSERT INTO BOOK_AUTHOR VALUES ('B108', 'A142');
INSERT INTO BOOK_AUTHOR VALUES ('B109', 'A143');
INSERT INTO BOOK_AUTHOR VALUES ('B109', 'A144');
INSERT INTO BOOK_AUTHOR VALUES ('B110', 'A142');
INSERT INTO BOOK_AUTHOR VALUES ('B111', 'A145');
INSERT INTO BOOK_AUTHOR VALUES ('B112', 'A146');
INSERT INTO BOOK_AUTHOR VALUES ('B113', 'A147');
INSERT INTO BOOK_AUTHOR VALUES ('B113', 'A148');
INSERT INTO BOOK_AUTHOR VALUES ('B114', 'A142');
INSERT INTO BOOK_AUTHOR VALUES ('B115', 'A149');
INSERT INTO BOOK_AUTHOR VALUES ('B116', 'A150');
INSERT INTO BOOK_AUTHOR VALUES ('B116', 'A151');
INSERT INTO BOOK_AUTHOR VALUES ('B117', 'A152');
INSERT INTO BOOK_AUTHOR VALUES ('B118', 'A153');
INSERT INTO BOOK_AUTHOR VALUES ('B119', 'A154');
INSERT INTO BOOK_AUTHOR VALUES ('B120', 'A154');
INSERT INTO BOOK_AUTHOR VALUES ('B120', 'A155');
INSERT INTO BOOK_AUTHOR VALUES ('B121', 'A156');
INSERT INTO BOOK_AUTHOR VALUES ('B122', 'A157');
INSERT INTO BOOK_AUTHOR VALUES ('B123', 'A158');
INSERT INTO BOOK_AUTHOR VALUES ('B124', 'A159');
INSERT INTO BOOK_AUTHOR VALUES ('B125', 'A160');
INSERT INTO BOOK_AUTHOR VALUES ('B126', 'A161');
INSERT INTO BOOK_AUTHOR VALUES ('B127', 'A161');
INSERT INTO BOOK_AUTHOR VALUES ('B128', 'A162');
INSERT INTO BOOK_AUTHOR VALUES ('B129', 'A163');
INSERT INTO BOOK_AUTHOR VALUES ('B129', 'A164');
INSERT INTO BOOK_AUTHOR VALUES ('B130', 'A165');
INSERT INTO BOOK_AUTHOR VALUES ('B130', 'A166');
INSERT INTO BOOK_AUTHOR VALUES ('B130', 'A167');
INSERT INTO BOOK_AUTHOR VALUES ('B131', 'A158');
INSERT INTO BOOK_AUTHOR VALUES ('B132', 'A168');
INSERT INTO BOOK_AUTHOR VALUES ('B132', 'A169');
INSERT INTO BOOK_AUTHOR VALUES ('B133', 'A170');
INSERT INTO BOOK_AUTHOR VALUES ('B134', 'A171');
INSERT INTO BOOK_AUTHOR VALUES ('B134', 'A172');
INSERT INTO BOOK_AUTHOR VALUES ('B135', 'A173');
INSERT INTO BOOK_AUTHOR VALUES ('B136', 'A174');
INSERT INTO BOOK_AUTHOR VALUES ('B137', 'A175');
INSERT INTO BOOK_AUTHOR VALUES ('B138', 'A176');
INSERT INTO BOOK_AUTHOR VALUES ('B139', 'A177');
INSERT INTO BOOK_AUTHOR VALUES ('B140', 'A158');
INSERT INTO BOOK_AUTHOR VALUES ('B140', 'A178');
INSERT INTO BOOK_AUTHOR VALUES ('B141', 'A179');
INSERT INTO BOOK_AUTHOR VALUES ('B141', 'A180');
INSERT INTO BOOK_AUTHOR VALUES ('B141', 'A181');
INSERT INTO BOOK_AUTHOR VALUES ('B142', 'A182');
INSERT INTO BOOK_AUTHOR VALUES ('B143', 'A183');
INSERT INTO BOOK_AUTHOR VALUES ('B144', 'A184');
INSERT INTO BOOK_AUTHOR VALUES ('B145', 'A185');
INSERT INTO BOOK_AUTHOR VALUES ('B146', 'A186');
INSERT INTO BOOK_AUTHOR VALUES ('B146', 'A187');
INSERT INTO BOOK_AUTHOR VALUES ('B147', 'A188');
INSERT INTO BOOK_AUTHOR VALUES ('B148', 'A189');
INSERT INTO BOOK_AUTHOR VALUES ('B149', 'A190');
INSERT INTO BOOK_AUTHOR VALUES ('B150', 'A191');
INSERT INTO BOOK_AUTHOR VALUES ('B151', 'A192');
INSERT INTO BOOK_AUTHOR VALUES ('B151', 'A193');
INSERT INTO BOOK_AUTHOR VALUES ('B151', 'A194');
INSERT INTO BOOK_AUTHOR VALUES ('B152', 'A195');
INSERT INTO BOOK_AUTHOR VALUES ('B153', 'A196');
INSERT INTO BOOK_AUTHOR VALUES ('B154', 'A197');
INSERT INTO BOOK_AUTHOR VALUES ('B155', 'A198');
INSERT INTO BOOK_AUTHOR VALUES ('B156', 'A199');
INSERT INTO BOOK_AUTHOR VALUES ('B157', 'A200');
INSERT INTO BOOK_AUTHOR VALUES ('B157', 'A201');
INSERT INTO BOOK_AUTHOR VALUES ('B157', 'A202');
INSERT INTO BOOK_AUTHOR VALUES ('B158', 'A203');
INSERT INTO BOOK_AUTHOR VALUES ('B159', 'A204');
INSERT INTO BOOK_AUTHOR VALUES ('B160', 'A205');
INSERT INTO BOOK_AUTHOR VALUES ('B161', 'A205');
INSERT INTO BOOK_AUTHOR VALUES ('B162', 'A206');
INSERT INTO BOOK_AUTHOR VALUES ('B163', 'A207');
INSERT INTO BOOK_AUTHOR VALUES ('B164', 'A208');
INSERT INTO BOOK_AUTHOR VALUES ('B165', 'A209');
INSERT INTO BOOK_AUTHOR VALUES ('B166', 'A210');
INSERT INTO BOOK_AUTHOR VALUES ('B167', 'A211');
INSERT INTO BOOK_AUTHOR VALUES ('B167', 'A212');
INSERT INTO BOOK_AUTHOR VALUES ('B168', 'A213');
INSERT INTO BOOK_AUTHOR VALUES ('B169', 'A214');
INSERT INTO BOOK_AUTHOR VALUES ('B170', 'A215');
INSERT INTO BOOK_AUTHOR VALUES ('B171', 'A216');
INSERT INTO BOOK_AUTHOR VALUES ('B172', 'A217');
INSERT INTO BOOK_AUTHOR VALUES ('B173', 'A038');
INSERT INTO BOOK_AUTHOR VALUES ('B174', 'A218');
INSERT INTO BOOK_AUTHOR VALUES ('B175', 'A219');
INSERT INTO BOOK_AUTHOR VALUES ('B176', 'A218');
INSERT INTO BOOK_AUTHOR VALUES ('B177', 'A220');

-- ---- BORROWING (30 rows — pelbagai status) ----

INSERT INTO BORROWING VALUES ('BR001', 'M001', 'B005', 'L001', DATE '2025-01-05', DATE '2025-02-04', DATE '2025-02-02', 0, 'RETURNED');
INSERT INTO BORROWING VALUES ('BR002', 'M002', 'B012', 'L002', DATE '2025-01-20', DATE '2025-02-03', DATE '2025-02-09', 6, 'RETURNED');
INSERT INTO BORROWING VALUES ('BR003', 'M003', 'B023', 'L003', DATE '2025-02-03', DATE '2025-03-05', DATE '2025-03-03', 0, 'RETURNED');
INSERT INTO BORROWING VALUES ('BR004', 'M004', 'B034', 'L004', DATE '2025-02-18', DATE '2025-03-04', DATE '2025-03-12', 8, 'RETURNED');
INSERT INTO BORROWING VALUES ('BR005', 'M005', 'B041', 'L005', DATE '2025-03-02', DATE '2025-03-16', DATE '2025-03-14', 0, 'RETURNED');
INSERT INTO BORROWING VALUES ('BR006', 'M006', 'B052', 'L006', DATE '2025-03-15', DATE '2025-04-14', DATE '2025-04-24', 10, 'RETURNED');
INSERT INTO BORROWING VALUES ('BR007', 'M008', 'B063', 'L007', DATE '2025-04-01', DATE '2025-04-15', DATE '2025-04-13', 0, 'RETURNED');
INSERT INTO BORROWING VALUES ('BR008', 'M009', 'B071', 'L001', DATE '2025-04-20', DATE '2025-05-20', DATE '2025-05-26', 6, 'RETURNED');
INSERT INTO BORROWING VALUES ('BR009', 'M010', 'B082', 'L002', DATE '2025-05-05', DATE '2025-05-19', DATE '2025-05-17', 0, 'RETURNED');
INSERT INTO BORROWING VALUES ('BR010', 'M012', 'B090', 'L003', DATE '2025-05-25', DATE '2025-06-24', DATE '2025-07-02', 8, 'RETURNED');
INSERT INTO BORROWING VALUES ('BR011', 'M013', 'B098', 'L004', DATE '2025-06-10', DATE '2025-06-24', DATE '2025-06-22', 0, 'RETURNED');
INSERT INTO BORROWING VALUES ('BR012', 'M014', 'B103', 'L005', DATE '2025-07-01', DATE '2025-07-15', DATE '2025-07-25', 10, 'RETURNED');
INSERT INTO BORROWING VALUES ('BR013', 'M015', 'B108', 'L006', DATE '2025-08-15', DATE '2025-09-14', DATE '2025-09-12', 0, 'RETURNED');
INSERT INTO BORROWING VALUES ('BR014', 'M016', 'B112', 'L007', DATE '2025-09-10', DATE '2025-09-24', DATE '2025-09-30', 6, 'RETURNED');
INSERT INTO BORROWING VALUES ('BR015', 'M017', 'B120', 'L001', DATE '2026-06-20', DATE '2026-07-20', NULL, 4, 'OVERDUE');
INSERT INTO BORROWING VALUES ('BR016', 'M018', 'B128', 'L002', DATE '2026-06-25', DATE '2026-07-09', NULL, 15, 'OVERDUE');
INSERT INTO BORROWING VALUES ('BR017', 'M019', 'B133', 'L003', DATE '2026-07-01', DATE '2026-07-31', NULL, 0, 'BORROWED');
INSERT INTO BORROWING VALUES ('BR018', 'M021', 'B136', 'L004', DATE '2026-07-05', DATE '2026-07-19', NULL, 5, 'OVERDUE');
INSERT INTO BORROWING VALUES ('BR019', 'M001', 'B140', 'L005', DATE '2026-07-10', DATE '2026-08-09', NULL, 0, 'BORROWED');
INSERT INTO BORROWING VALUES ('BR020', 'M002', 'B145', 'L006', DATE '2026-07-15', DATE '2026-07-29', NULL, 0, 'BORROWED');
INSERT INTO BORROWING VALUES ('BR021', 'M003', 'B150', 'L007', DATE '2026-07-18', DATE '2026-08-17', NULL, 0, 'BORROWED');
INSERT INTO BORROWING VALUES ('BR022', 'M004', 'B154', 'L001', DATE '2026-07-20', DATE '2026-08-03', NULL, 0, 'BORROWED');
INSERT INTO BORROWING VALUES ('BR023', 'M005', 'B160', 'L002', DATE '2026-04-01', DATE '2026-04-15', NULL, 100, 'OVERDUE');
INSERT INTO BORROWING VALUES ('BR024', 'M006', 'B165', 'L003', DATE '2026-04-15', DATE '2026-05-15', NULL, 70, 'OVERDUE');
INSERT INTO BORROWING VALUES ('BR025', 'M008', 'B170', 'L004', DATE '2026-05-01', DATE '2026-05-15', NULL, 70, 'OVERDUE');
INSERT INTO BORROWING VALUES ('BR026', 'M009', 'B003', 'L005', DATE '2026-05-10', DATE '2026-06-09', NULL, 45, 'OVERDUE');
INSERT INTO BORROWING VALUES ('BR027', 'M010', 'B017', 'L006', DATE '2026-05-20', DATE '2026-06-03', NULL, 51, 'OVERDUE');
INSERT INTO BORROWING VALUES ('BR028', 'M012', 'B029', 'L007', DATE '2026-06-01', DATE '2026-07-01', NULL, 23, 'OVERDUE');
INSERT INTO BORROWING VALUES ('BR029', 'M013', 'B045', 'L001', DATE '2026-06-05', DATE '2026-06-19', NULL, 35, 'OVERDUE');
INSERT INTO BORROWING VALUES ('BR030', 'M014', 'B060', 'L002', DATE '2026-06-10', DATE '2026-06-24', NULL, 30, 'OVERDUE');

COMMIT;


-- ============================================================
-- BAHAGIAN 8: LOGIN PASSWORDS (LIBRARIAN & MEMBER)
-- ============================================================
-- Hash di bawah dijana dengan bcryptjs (10 rounds) untuk akaun demo
-- seeded. Login librarian guna STAFF_ID + password; login member
-- guna email + password. Tukar password seeded ni serta-merta untuk
-- mana-mana environment bukan tempatan (non-local).
-- Lihat dokumentasi projek (tidak dikomit) untuk nilai password demo.
-- ============================================================

UPDATE LIBRARIAN SET PASSWORD_HASH = '$2b$10$EHuTu2un6HXGiBXe2qmGaejW/elMq5zVunDsx8TudoHcFq7Wm1iMq';
UPDATE MEMBER    SET PASSWORD_HASH = '$2b$10$/oAxGu1Fo9vDhVS1EfXnveiwU97vJ.rFvz8bGoTowwg/ZemdCZg56';

COMMIT;

-- ============================================================
-- BAHAGIAN 9: PL/SQL OBJECTS — Function, Triggers, Views
-- ============================================================
-- Memindahkan business logic borrowing yang sebelum ini hanya wujud
-- pada lapisan aplikasi Next.js terus ke dalam database, supaya
-- peraturan ini berkuat kuasa walaupun diakses terus melalui SQL.
-- ============================================================

-- FUNCTION: fine standard RM1 setiap hari lewat. Single source of
-- truth, dipanggil oleh endpoint return dan job sweep overdue.
CREATE OR REPLACE FUNCTION fn_calculate_fine (
  p_due_date    IN DATE,
  p_return_date IN DATE
) RETURN NUMBER
IS
BEGIN
  RETURN GREATEST(0, TRUNC(p_return_date) - TRUNC(p_due_date));
END fn_calculate_fine;
/

-- TRIGGER: kurangkan AVAILABLE_COPIES bila borrowing dicipta, dan
-- tolak insert jika baki kopi sudah 0. Memindahkan availability
-- guard daripada lapisan aplikasi ke dalam database.
CREATE OR REPLACE TRIGGER trg_borrowing_after_insert
AFTER INSERT ON BORROWING
FOR EACH ROW
DECLARE
  v_rows NUMBER;
BEGIN
  UPDATE BOOK
  SET AVAILABLE_COPIES = AVAILABLE_COPIES - 1
  WHERE BOOK_ID = :NEW.BOOK_ID AND AVAILABLE_COPIES > 0;

  v_rows := SQL%ROWCOUNT;
  IF v_rows = 0 THEN
    RAISE_APPLICATION_ERROR(-20001, 'Book not available for borrowing');
  END IF;
END trg_borrowing_after_insert;
/

-- TRIGGER: tambah semula AVAILABLE_COPIES sebaik sahaja borrowing
-- bertukar daripada "belum pulang" kepada "telah pulang".
CREATE OR REPLACE TRIGGER trg_borrowing_after_return
AFTER UPDATE OF RETURN_DATE ON BORROWING
FOR EACH ROW
WHEN (NEW.RETURN_DATE IS NOT NULL AND OLD.RETURN_DATE IS NULL)
BEGIN
  UPDATE BOOK
  SET AVAILABLE_COPIES = LEAST(TOTAL_COPIES, AVAILABLE_COPIES + 1)
  WHERE BOOK_ID = :NEW.BOOK_ID;
END trg_borrowing_after_return;
/

-- VIEW: laporan pinjaman lewat (ahli, buku, hari lewat, fine).
CREATE OR REPLACE VIEW vw_overdue_report AS
SELECT br.BORROW_ID,
       pm.FULL_NAME                  AS MEMBER_NAME,
       bk.TITLE                      AS BOOK_TITLE,
       br.BORROW_DATE,
       br.DUE_DATE,
       br.FINE_AMOUNT,
       TRUNC(SYSDATE) - br.DUE_DATE  AS DAYS_OVERDUE
FROM BORROWING br
JOIN MEMBER m  ON br.MEMBER_ID = m.MEMBER_ID
JOIN PERSON pm ON m.PERSON_ID = pm.PERSON_ID
JOIN BOOK bk   ON br.BOOK_ID = bk.BOOK_ID
WHERE br.STATUS = 'OVERDUE';

-- VIEW: buku paling banyak dipinjam, untuk laporan "popular books".
CREATE OR REPLACE VIEW vw_book_popularity AS
SELECT bk.BOOK_ID,
       bk.TITLE,
       COUNT(br.BORROW_ID) AS TIMES_BORROWED
FROM BOOK bk
LEFT JOIN BORROWING br ON bk.BOOK_ID = br.BOOK_ID
GROUP BY bk.BOOK_ID, bk.TITLE
ORDER BY TIMES_BORROWED DESC;

-- ============================================================
-- BAHAGIAN 10: VERIFY - Semak row count setiap table
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
-- End of Master Script
-- ============================================================
