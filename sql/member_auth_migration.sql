-- ============================================================
-- BAYU LIBRARY MANAGEMENT SYSTEM
-- Auth migration - member self-service login
-- ============================================================
-- Adds password storage for member sign-in (Next.js app).
-- Hash below was generated with bcryptjs (10 rounds) for the seeded
-- demo accounts. Login uses email + password.
-- Change all seeded passwords immediately in any non-local environment.
-- See project documentation (not committed) for the demo password value.
-- ============================================================

ALTER TABLE MEMBER ADD (PASSWORD_HASH VARCHAR2(100));

UPDATE MEMBER SET PASSWORD_HASH = '$2b$10$/oAxGu1Fo9vDhVS1EfXnveiwU97vJ.rFvz8bGoTowwg/ZemdCZg56';

COMMIT;
