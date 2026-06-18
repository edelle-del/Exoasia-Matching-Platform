export interface CreditStatus {
  totalBalance: number;
  expiringPools: { amount: number; expires_at: string }[];
}

export function calculateCreditStatus(entries: Array<{ change_amount: number; created_at: string; expires_at?: string | null }>): CreditStatus {
  // Sort entries chronologically
  const sorted = [...entries].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  const pools: { amount: number; expires_at: Date | null }[] = [];
  
  const now = new Date();

  for (const tx of sorted) {
    if (tx.change_amount > 0) {
      pools.push({
        amount: tx.change_amount,
        expires_at: tx.expires_at ? new Date(tx.expires_at) : null,
      });
    } else if (tx.change_amount < 0) {
      let toDeduct = -tx.change_amount;
      // Sort pools: expiring soonest first. Nulls (never expire) last.
      pools.sort((a, b) => {
        if (a.expires_at === null && b.expires_at === null) return 0;
        if (a.expires_at === null) return 1;
        if (b.expires_at === null) return -1;
        return a.expires_at.getTime() - b.expires_at.getTime();
      });

      for (const pool of pools) {
        // Only deduct from pool if it was valid at the time of transaction
        const txDate = new Date(tx.created_at);
        if (pool.expires_at && pool.expires_at < txDate) {
          pool.amount = 0; // expired, can't use
          continue;
        }

        if (pool.amount > 0) {
          const deducted = Math.min(pool.amount, toDeduct);
          pool.amount -= deducted;
          toDeduct -= deducted;
        }
        if (toDeduct === 0) break;
      }
    }
  }

  // Calculate final balance by pruning currently expired pools
  let totalBalance = 0;
  const expiringPools: { amount: number; expires_at: string }[] = [];
  for (const pool of pools) {
    if (pool.expires_at && pool.expires_at < now) {
      continue;
    }
    if (pool.amount > 0) {
      totalBalance += pool.amount;
      if (pool.expires_at) {
        expiringPools.push({ amount: pool.amount, expires_at: pool.expires_at.toISOString() });
      }
    }
  }
  
  expiringPools.sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());

  return { totalBalance, expiringPools };
}

export function calculateCurrentBalance(entries: Array<{ change_amount: number; created_at: string; expires_at?: string | null }>): number {
  return calculateCreditStatus(entries).totalBalance;
}
