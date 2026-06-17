-- ============================================================
-- BAYU LIBRARY MANAGEMENT SYSTEM
-- Auth migration - librarian login
-- ============================================================
-- Adds password storage for librarian sign-in (Next.js app).
-- Hash below was generated with bcryptjs (10 rounds) for the seeded
-- demo accounts. Login uses STAFF_ID + password.
-- Already applied to the running DB; kept here for reference / re-provisioning.
-- Change all seeded passwords immediately in any non-local environment.
-- See project documentation (not committed) for the demo password value.
-- ============================================================

ALTER TABLE LIBRARIAN ADD (PASSWORD_HASH VARCHAR2(100));

UPDATE LIBRARIAN SET PASSWORD_HASH = '$2b$10$EHuTu2un6HXGiBXe2qmGaejW/elMq5zVunDsx8TudoHcFq7Wm1iMq';

COMMIT;
