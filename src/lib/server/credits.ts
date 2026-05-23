import { query } from "./db";
import type { QueryResultRow } from "@neondatabase/serverless";

export const STARTING_CREDITS = 10;
export const GENERATION_CREDIT_COST = 1;

export type CreditReason = "atlas_generation" | "pbr_generation" | "utility_pbr_generation" | "utility_emissive_generation";

type CreditAccountRow = QueryResultRow & {
  user_id: string;
  balance: number;
  created_at: string | Date;
  updated_at: string | Date;
};

type CreditTransactionRow = QueryResultRow & {
  balance_after: number;
};

function iso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value;
}

function accountFromRow(row: CreditAccountRow) {
  return {
    userId: row.user_id,
    balance: Number(row.balance),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export async function ensureCreditAccount(userId: string) {
  await query(
    `insert into credit_accounts (user_id, balance, created_at, updated_at)
     values ($1, $2, now(), now())
     on conflict (user_id) do nothing`,
    [userId, STARTING_CREDITS],
  );
  const result = await query<CreditAccountRow>("select * from credit_accounts where user_id = $1", [userId]);
  return accountFromRow(result.rows[result.rows.length - 1]);
}

export async function getCreditBalance(userId: string) {
  return (await ensureCreditAccount(userId)).balance;
}

export async function debitCredit(userId: string, reason: CreditReason, referenceId: string, amount = GENERATION_CREDIT_COST) {
  await ensureCreditAccount(userId);
  const id = crypto.randomUUID();
  const result = await query<CreditTransactionRow>(
    `with updated as (
       update credit_accounts
       set balance = balance - $2, updated_at = now()
       where user_id = $1 and balance >= $2
       returning balance
     )
     insert into credit_transactions (id, user_id, kind, amount, balance_after, reason, reference_id, created_at)
     select $3, $1, 'debit', -$2, balance, $4, $5, now()
     from updated
     returning balance_after`,
    [userId, amount, id, reason, referenceId],
  );

  if (!result.rows[0]) {
    return { ok: false as const, balance: await getCreditBalance(userId) };
  }

  return { ok: true as const, balance: Number(result.rows[0].balance_after) };
}

export async function refundCredit(userId: string, reason: CreditReason, referenceId: string, amount = GENERATION_CREDIT_COST) {
  await ensureCreditAccount(userId);
  const id = crypto.randomUUID();
  const result = await query<CreditTransactionRow>(
    `with updated as (
       update credit_accounts
       set balance = balance + $2, updated_at = now()
       where user_id = $1
       returning balance
     )
     insert into credit_transactions (id, user_id, kind, amount, balance_after, reason, reference_id, created_at)
     select $3, $1, 'refund', $2, balance, $4, $5, now()
     from updated
     returning balance_after`,
    [userId, amount, id, reason, referenceId],
  );

  return { balance: Number(result.rows[0]?.balance_after ?? (await getCreditBalance(userId))) };
}

export function insufficientCreditsResponse(balance: number, required = GENERATION_CREDIT_COST) {
  return Response.json(
    {
      error: `Not enough credits. You need ${required} credit${required === 1 ? "" : "s"} to generate.`,
      balance,
      required,
    },
    { status: 402 },
  );
}
