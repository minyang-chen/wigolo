const RECENCY_TOKENS = /\b(recent|latest|new|just released|today|this week)\b/i;

// Finance queries are almost always time-sensitive — stale earnings, rates,
// or price data is actively harmful. Trigger recency boost for any financial
// intent keyword so old reports don't outrank current ones.
const FINANCE_RECENCY_TOKENS = /\b(earnings|revenue|eps|guidance|forecast|outlook|price|rate|rates|dividend|quarter|q[1-4]|fiscal|inflation|gdp|cpi|pce|fomc|fed|jobs|payroll|upgrade|downgrade|target|rating)\b/i;

export function hasRecencyIntent(query: string, now: Date = new Date()): boolean {
  if (RECENCY_TOKENS.test(query)) return true;
  if (FINANCE_RECENCY_TOKENS.test(query)) return true;
  const yearMatches = query.match(/\b(20\d{2})\b/g);
  if (!yearMatches) return false;
  const currentYear = now.getUTCFullYear();
  return yearMatches.some((y) => parseInt(y, 10) >= currentYear);
}

export function recencyFactor(publishedDate: string | undefined, now: Date = new Date()): number {
  if (!publishedDate) return 1.0;
  const ts = new Date(publishedDate).getTime();
  if (isNaN(ts)) return 1.0;
  const ageDays = (now.getTime() - ts) / (1000 * 60 * 60 * 24);
  if (ageDays < 7) return 1.5;
  if (ageDays < 30) return 1.3;
  if (ageDays < 90) return 1.1;
  return 1.0;
}
