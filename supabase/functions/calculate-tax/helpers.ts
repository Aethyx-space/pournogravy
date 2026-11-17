// Pure helpers for calculate-tax, kept separate so they can be unit tested
// without Stripe or Supabase.

// Stripe Tax product tax code for clothing. Rhode Island exempts clothing and
// footwear up to $250 per item (280-RICR-20-70-6) and Stripe applies that rule
// per line item, so every garment must be its own line with this code.
// Without a tax_code Stripe falls back to the account's default code, which is
// usually "General - Tangible Goods" and would tax a $25 tee at 7%.
export const CLOTHING_TAX_CODE = "txcd_30011000";

export interface TaxableItem {
  id: string;
  quantity: number;
  unit_price_cents: number;
  tax_code?: string | null;
}

export interface TaxLineItem {
  amount: number;
  quantity: number;
  reference: string;
  tax_code: string;
  tax_behavior: "exclusive";
}

// One Stripe Tax line per order item. Stripe treats `amount` as the total for
// the line and divides by quantity to test per-unit thresholds, so a line of
// 3 x $25 tees is checked as three $25 items, not one $75 item.
// The order-level discount is spread across lines in proportion to their
// value (largest remainder, so the cents add up exactly).
export function buildTaxLineItems(items: TaxableItem[], discountCents: number): TaxLineItem[] {
  const gross = items.map((i) => Math.max(0, i.unit_price_cents) * Math.max(1, i.quantity));
  const total = gross.reduce((s, g) => s + g, 0);
  const discount = Math.min(Math.max(0, discountCents), total);

  const shares = gross.map((g) => (total === 0 ? 0 : (g * discount) / total));
  const floors = shares.map(Math.floor);
  let leftover = discount - floors.reduce((s, f) => s + f, 0);
  const order = shares
    .map((s, idx) => ({ idx, frac: s - Math.floor(s) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { idx } of order) {
    if (leftover <= 0) break;
    floors[idx] += 1;
    leftover -= 1;
  }

  return items.map((i, idx) => ({
    amount: gross[idx] - floors[idx],
    quantity: Math.max(1, i.quantity),
    reference: i.id,
    tax_code: i.tax_code || CLOTHING_TAX_CODE,
    tax_behavior: "exclusive" as const,
  }));
}
