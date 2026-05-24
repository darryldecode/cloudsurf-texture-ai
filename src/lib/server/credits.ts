import { query } from "./db";
import type { QueryResultRow } from "@neondatabase/serverless";

export const STARTING_CREDITS = 10;
export const GENERATION_CREDIT_COST = 1;

export type CreditReason = "atlas_generation" | "pbr_generation" | "utility_pbr_generation" | "utility_emissive_generation";
export type CreditPurchaseReason = "credit_purchase";

type CreditAccountRow = QueryResultRow & {
  user_id: string;
  balance: number;
  created_at: string | Date;
  updated_at: string | Date;
};

type CreditTransactionRow = QueryResultRow & {
  balance_after: number;
  applied?: boolean;
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

export async function purchaseCredits(userId: string, amount: number, reason: CreditPurchaseReason, referenceId: string) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Credit purchase amount must be a positive integer.");
  }

  await ensureCreditAccount(userId);
  const id = crypto.randomUUID();
  const result = await query<CreditTransactionRow>(
    `with inserted as (
       insert into credit_transactions (id, user_id, kind, amount, balance_after, reason, reference_id, created_at)
       values ($3, $1, 'purchase', $2, 0, $4, $5, now())
       on conflict do nothing
       returning id
     ),
     updated as (
       update credit_accounts
       set balance = balance + $2, updated_at = now()
       where user_id = $1 and exists (select 1 from inserted)
       returning balance
     ),
     finalized as (
       update credit_transactions
       set balance_after = updated.balance
       from updated
       where credit_transactions.id = $3
       returning credit_transactions.balance_after
     ),
     existing as (
       select balance_after
       from credit_transactions
       where user_id = $1 and kind = 'purchase' and reference_id = $5 and not exists (select 1 from inserted)
       limit 1
     )
     select balance_after, true as applied from finalized
     union all
     select balance_after, false as applied from existing
     limit 1`,
    [userId, amount, id, reason, referenceId],
  );

  const row = result.rows[0];
  if (!row) {
    return { balance: await getCreditBalance(userId), applied: false };
  }

  return { balance: Number(row.balance_after), applied: row.applied !== false };
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
