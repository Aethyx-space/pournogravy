import { assertEquals } from "jsr:@std/assert@1";
import { buildTaxLineItems, CLOTHING_TAX_CODE } from "./helpers.ts";

Deno.test("one line per item, clothing code by default", () => {
  const lines = buildTaxLineItems(
    [
      { id: "a", quantity: 2, unit_price_cents: 2500 },
      { id: "b", quantity: 1, unit_price_cents: 3000 },
    ],
    0,
  );
  assertEquals(lines.length, 2);
  assertEquals(lines[0], { amount: 5000, quantity: 2, reference: "a", tax_code: CLOTHING_TAX_CODE, tax_behavior: "exclusive" });
  assertEquals(lines[1].amount, 3000);
});

Deno.test("discount is spread proportionally and sums exactly", () => {
  const lines = buildTaxLineItems(
    [
      { id: "a", quantity: 1, unit_price_cents: 2500 },
      { id: "b", quantity: 1, unit_price_cents: 2500 },
      { id: "c", quantity: 1, unit_price_cents: 2500 },
    ],
    1000,
  );
  assertEquals(lines.reduce((s, l) => s + l.amount, 0), 7500 - 1000);
  for (const l of lines) {
    if (l.amount < 2166 || l.amount > 2167) throw new Error(`bad share ${l.amount}`);
  }
});

Deno.test("discount larger than subtotal clamps to zero", () => {
  const lines = buildTaxLineItems([{ id: "a", quantity: 1, unit_price_cents: 100 }], 500);
  assertEquals(lines[0].amount, 0);
});

Deno.test("per-item tax_code override is kept", () => {
  const lines = buildTaxLineItems([{ id: "a", quantity: 1, unit_price_cents: 900, tax_code: "txcd_99999999" }], 0);
  assertEquals(lines[0].tax_code, "txcd_99999999");
});
