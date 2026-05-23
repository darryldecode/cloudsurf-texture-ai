import { neon, type QueryResultRow } from "@neondatabase/serverless";

type QueryResult<T extends QueryResultRow> = {
  rows: T[];
};

let sql: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Neon Postgres.");
  }

  sql ??= neon(process.env.DATABASE_URL);

  return sql;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []): Promise<QueryResult<T>> {
  const rows = await getSql().query(text, values);
  return { rows: rows as T[] };
}
