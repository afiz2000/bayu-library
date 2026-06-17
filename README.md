# Bayu Library Management System

A library management system built with Next.js (App Router) and Oracle
Database. ICT502 Database Engineering - Group 2 NBCS2306A.

## Stack

- Next.js 16 (App Router, Turbopack)
- Oracle Database (tested on Oracle 23ai Free)
- `oracledb` (Thin mode — no Oracle Instant Client required)
- Vitest for integration tests

## Prerequisites

- Node.js 20+
- An Oracle Database instance you can connect to (Oracle 23ai Free,
  XE, or any edition — just adjust the connection string)
- `sqlplus` available if you want to run the SQL scripts from the
  command line (or use SQL Developer / any Oracle client)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the database schema

Connect as a privileged user (e.g. `SYS AS SYSDBA`) and run, in order:

```bash
sqlplus sys/<password>@localhost/<service> as sysdba
SQL> @bayu_library_FULL.sql       -- creates the bayu_library user, schema, and sample data
```

Then, connected as the `bayu_library` user, apply the auth migrations:

```sql
@sql/auth_migration.sql           -- adds LIBRARIAN.PASSWORD_HASH
@sql/member_auth_migration.sql    -- adds MEMBER.PASSWORD_HASH
```

> `bayu_library_FULL.sql` is the master schema + seed data script and
> is not part of this repo (kept outside version control). Ask your
> team for a copy, or recreate the 8 tables described in
> `src/types/index.ts` and seed your own data.

### 3. Configure environment variables

Create `.env.local` in the project root:

```env
DB_USER=bayu_library
DB_PASSWORD=<your DB password>
DB_CONNECTION_STRING=localhost/<your service name>

NEXT_PUBLIC_APP_NAME=Bayu Library Management System

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=<random hex string>

# Only needed if you run the test suite — must match a real seeded
# librarian/member password hash from the auth migrations above
DEMO_LIBRARIAN_PASSWORD=<demo librarian password>
DEMO_MEMBER_PASSWORD=<demo member password>
```

### 4. Run the app

```bash
npm run dev
```

- Staff (librarian) sign-in: [http://localhost:3000/login](http://localhost:3000/login) — use a `STAFF_ID` (e.g. `STF-2020-001`) and the password set during the auth migration.
- Member self-service portal: [http://localhost:3000/member/login](http://localhost:3000/member/login) — sign in with the member's email and the password set during the member auth migration.

Default demo passwords are intentionally **not** documented here —
ask whoever ran the auth migrations, or set your own by editing the
`UPDATE ... SET PASSWORD_HASH = ...` statements in `sql/auth_migration.sql`
and `sql/member_auth_migration.sql` before running them (generate a
hash with `node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"`).

## Project structure

```
src/
  app/
    (dashboard)/        librarian-facing pages (Categories, Authors, Members,
                         Librarians, Books, Borrowings) — requires LIBRARIAN session
    member/              member self-service portal — requires MEMBER session
    login/               librarian sign-in page
    api/                 route handlers (CRUD for all entities, auth)
  components/            shared UI (DataTable, Modal, forms, table search/pagination)
  lib/                   db.ts (Oracle pool + query helpers), session.ts, errors.ts
  proxy.ts                auth gate for every page/route (Next's middleware, renamed
                          to "proxy" as of Next 16)
sql/
  auth_migration.sql           adds LIBRARIAN.PASSWORD_HASH
  member_auth_migration.sql    adds MEMBER.PASSWORD_HASH
tests/                  Vitest integration tests (hit the real database)
```

## Business rules worth knowing

- **Borrowing status and fines are computed automatically.** Any
  `BORROWED` row past its due date is flipped to `OVERDUE` and its
  fine recalculated (RM1 per day late) every time the borrowings list
  is loaded — see `sweepOverdueBorrowings()` in `src/lib/db.ts`.
- **Returning a book auto-calculates the final fine** based on
  `return_date - due_date`; librarians don't enter it manually.
- **Login passwords are independent of the Oracle DB account
  password.** Don't reuse `DB_PASSWORD` as a demo login password —
  treat them as unrelated secrets.

## Testing

```bash
npm test
```

This runs Vitest against your **real** configured database (no
mocking), exercising CRUD, auth, and the borrowing/fine business
logic end-to-end. Tests clean up the rows they create; borrowings in
particular are purged directly via SQL in an `afterAll` hook since
the API intentionally has no DELETE endpoint for borrowings (audit
trail).

## Production build

```bash
npm run build
npm start
```

## Known limitations

- No pagination/search server-side — search/pagination on the list
  pages is client-side, fine for the current dataset size.
- No rate limiting on the login endpoints.
- The `postcss` advisory surfaced by `npm audit` lives inside Next.js's
  own bundled tooling — do **not** run `npm audit fix --force` (it
  downgrades Next.js to an ancient version). Safe to ignore for now.
