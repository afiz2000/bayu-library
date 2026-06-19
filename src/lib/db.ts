// src/lib/db.ts
// ============================================================
// Oracle Database Connection Pool
// Bayu Library Management System
// ============================================================

import oracledb from "oracledb";

// Thin mode — tak perlu install Oracle Instant Client

// Pool config
const poolConfig: oracledb.PoolAttributes = {
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  connectString: process.env.DB_CONNECTION_STRING!,
  poolMin: 2,
  poolMax: 10,
  poolIncrement: 2,
  poolTimeout: 60,
};

// Simpan pool dalam global supaya tak create baru tiap kali
// (penting dalam Next.js dev mode sebab hot reload)
declare global {
  var _oraclePool: oracledb.Pool | undefined;
}

// ============================================================
// Initialize Pool
// ============================================================
export async function getPool(): Promise<oracledb.Pool> {
  if (global._oraclePool) {
    return global._oraclePool;
  }

  try {
    global._oraclePool = await oracledb.createPool(poolConfig);
    console.log("✅ Oracle connection pool created");
    return global._oraclePool;
  } catch (err) {
    console.error("❌ Failed to create Oracle pool:", err);
    throw err;
  }
}

// ============================================================
// Get Connection dari Pool
// ============================================================
export async function getConnection(): Promise<oracledb.Connection> {
  const pool = await getPool();
  return await pool.getConnection();
}

// ============================================================
// Helper: Execute Query
// Guna ni untuk SELECT
// ============================================================
export async function executeQuery<T = Record<string, unknown>>(
  sql: string,
  binds: oracledb.BindParameters = [],
  options: oracledb.ExecuteOptions = {}
): Promise<T[]> {
  const conn = await getConnection();
  try {
    const result = await conn.execute<T>(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT, // return sebagai object, bukan array
      ...options,
    });
    return (result.rows as T[]) ?? [];
  } finally {
    await conn.close(); // Lepas connection balik ke pool
  }
}

// ============================================================
// Helper: Execute DML
// Guna ni untuk INSERT, UPDATE, DELETE
// ============================================================
export async function executeDML(
  sql: string,
  binds: oracledb.BindParameters = [],
  options: oracledb.ExecuteOptions = {}
): Promise<oracledb.Result<unknown>> {
  const conn = await getConnection();
  try {
    const result = await conn.execute(sql, binds, {
      autoCommit: true, // auto commit selepas DML
      ...options,
    });
    return result;
  } finally {
    await conn.close();
  }
}

// ============================================================
// Helper: Execute Transaction
// Guna ni kalau nak buat beberapa DML sekaligus (atomic)
// Contoh: INSERT PERSON + INSERT MEMBER dalam satu transaction
// ============================================================
export async function executeTransaction(
  operations: (conn: oracledb.Connection) => Promise<void>
): Promise<void> {
  const conn = await getConnection();
  try {
    await operations(conn);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

// ============================================================
// Sweep Overdue Borrowings
// Flip BORROWED -> OVERDUE once due_date has passed, and keep the
// accruing fine in sync (RM1 per day late, matches the seeded dataset).
// ============================================================
export async function sweepOverdueBorrowings(): Promise<void> {
  await executeDML(`
    UPDATE BORROWING
    SET STATUS = 'OVERDUE',
        FINE_AMOUNT = TRUNC(SYSDATE) - DUE_DATE
    WHERE RETURN_DATE IS NULL
      AND DUE_DATE < TRUNC(SYSDATE)
  `);
}

// ============================================================
// Close Pool (guna masa shutdown server)
// ============================================================
export async function closePool(): Promise<void> {
  if (global._oraclePool) {
    await global._oraclePool.close(10);
    global._oraclePool = undefined;
    console.log("Oracle pool closed");
  }
}
