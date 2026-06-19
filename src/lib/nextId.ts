import { executeQuery } from "@/lib/db";

const ID_CONFIGS = {
  category: { table: "CATEGORY", column: "CATEGORY_ID", prefix: "CAT", width: 2 },
  author: { table: "AUTHOR", column: "AUTHOR_ID", prefix: "A", width: 3 },
  member: { table: "MEMBER", column: "MEMBER_ID", prefix: "M", width: 3 },
  librarian: { table: "LIBRARIAN", column: "LIBRARIAN_ID", prefix: "L", width: 3 },
  book: { table: "BOOK", column: "BOOK_ID", prefix: "B", width: 3 },
  borrowing: { table: "BORROWING", column: "BORROW_ID", prefix: "BR", width: 3 },
  person: { table: "PERSON", column: "PERSON_ID", prefix: "P", width: 3 },
} as const;

export type IdEntity = keyof typeof ID_CONFIGS;

export const ID_ENTITIES = Object.keys(ID_CONFIGS) as IdEntity[];

// Table/column/prefix values below come only from the fixed map above
// (never from request input), so interpolating them into SQL is safe.
export async function getNextId(entity: IdEntity): Promise<string> {
  const { table, column, prefix, width } = ID_CONFIGS[entity];

  const rows = await executeQuery<{ MAX_NUM: number | null }>(`
    SELECT MAX(TO_NUMBER(SUBSTR(${column}, ${prefix.length + 1}))) AS MAX_NUM
    FROM ${table}
    WHERE REGEXP_LIKE(${column}, '^${prefix}[0-9]+$')
  `);

  const nextNum = (rows[0]?.MAX_NUM ?? 0) + 1;
  return `${prefix}${String(nextNum).padStart(width, "0")}`;
}
