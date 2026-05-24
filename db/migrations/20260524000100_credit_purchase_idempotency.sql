create unique index if not exists credit_transactions_purchase_reference_idx
  on credit_transactions(reference_id)
  where kind = 'purchase' and reference_id is not null;
