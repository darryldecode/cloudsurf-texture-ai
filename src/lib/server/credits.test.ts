import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  query: vi.fn(),
}));

import { debitCredit, ensureCreditAccount, purchaseCredits, refundCredit, STARTING_CREDITS } from "./credits";
import { query } from "./db";

type LedgerEntry = {
  kind: "debit" | "refund" | "purchase";
  amount: number;
  balanceAfter: number;
  reason: string;
  referenceId: string;
};

describe("credit ledger", () => {
  const queryMock = vi.mocked(query);
  let accountExists = false;
  let balance = 0;
  let ledger: LedgerEntry[] = [];

  beforeEach(() => {
    accountExists = false;
    balance = 0;
    ledger = [];
    queryMock.mockReset();
    queryMock.mockImplementation(async (text, values = []) => {
      const sql = String(text);
      const params = values as unknown[];
      const userId = String(params[0]);

      if (sql.includes("insert into credit_accounts")) {
        if (!accountExists) {
          accountExists = true;
          balance = Number(params[1]);
        }
        return { rows: [] };
      }

      if (sql.includes("select * from credit_accounts")) {
        return {
          rows: accountExists
            ? [
                {
                  user_id: userId,
                  balance,
                  created_at: new Date("2026-05-23T00:00:00.000Z"),
                  updated_at: new Date("2026-05-23T00:00:00.000Z"),
                },
              ]
            : [],
        };
      }

      if (sql.includes("set balance = balance - $2")) {
        const amount = Number(params[1]);
        if (balance < amount) return { rows: [] };
        balance -= amount;
        ledger.push({
          kind: "debit",
          amount: -amount,
          balanceAfter: balance,
          reason: String(params[3]),
          referenceId: String(params[4]),
        });
        return { rows: [{ balance_after: balance }] };
      }

      if (sql.includes("set balance = balance + $2") && sql.includes("'refund'")) {
        const amount = Number(params[1]);
        balance += amount;
        ledger.push({
          kind: "refund",
          amount,
          balanceAfter: balance,
          reason: String(params[3]),
          referenceId: String(params[4]),
        });
        return { rows: [{ balance_after: balance }] };
      }

      if (sql.includes("kind = 'purchase'")) {
        const amount = Number(params[1]);
        const reason = String(params[3]);
        const referenceId = String(params[4]);
        const existing = ledger.find((entry) => entry.kind === "purchase" && entry.referenceId === referenceId);

        if (existing) {
          return { rows: [{ balance_after: existing.balanceAfter, applied: false }] };
        }

        balance += amount;
        ledger.push({
          kind: "purchase",
          amount,
          balanceAfter: balance,
          reason,
          referenceId,
        });
        return { rows: [{ balance_after: balance, applied: true }] };
      }

      throw new Error(`Unexpected query: ${sql}`);
    });
  });

  it("initializes new accounts with 10 credits", async () => {
    const account = await ensureCreditAccount("user-1");

    expect(account.balance).toBe(STARTING_CREDITS);
  });

  it("debits one credit and creates a ledger entry", async () => {
    const debit = await debitCredit("user-1", "atlas_generation", "workflow-1");

    expect(debit).toEqual({ ok: true, balance: 9 });
    expect(ledger).toEqual([
      {
        kind: "debit",
        amount: -1,
        balanceAfter: 9,
        reason: "atlas_generation",
        referenceId: "workflow-1",
      },
    ]);
  });

  it("returns the current balance when credits are insufficient", async () => {
    accountExists = true;
    balance = 0;

    const debit = await debitCredit("user-1", "atlas_generation", "workflow-1");

    expect(debit).toEqual({ ok: false, balance: 0 });
    expect(ledger).toEqual([]);
  });

  it("refunds a failed generation credit", async () => {
    accountExists = true;
    balance = 9;

    const refund = await refundCredit("user-1", "atlas_generation", "workflow-1");

    expect(refund).toEqual({ balance: 10 });
    expect(ledger).toEqual([
      {
        kind: "refund",
        amount: 1,
        balanceAfter: 10,
        reason: "atlas_generation",
        referenceId: "workflow-1",
      },
    ]);
  });

  it("adds purchased credits once for a Paddle transaction", async () => {
    accountExists = true;
    balance = 9;

    const firstPurchase = await purchaseCredits("user-1", 25, "credit_purchase", "txn_1");
    const duplicatePurchase = await purchaseCredits("user-1", 25, "credit_purchase", "txn_1");

    expect(firstPurchase).toEqual({ balance: 34, applied: true });
    expect(duplicatePurchase).toEqual({ balance: 34, applied: false });
    expect(ledger).toEqual([
      {
        kind: "purchase",
        amount: 25,
        balanceAfter: 34,
        reason: "credit_purchase",
        referenceId: "txn_1",
      },
    ]);
  });
});
