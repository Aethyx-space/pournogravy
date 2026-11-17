// Run: deno test supabase/functions/stripe-webhook/
import {
  CLAIMABLE_STATUSES,
  customerDisplayName,
  memoizeSigner,
  resolveCustomerEmail,
  runInBackground,
} from "./helpers.ts";

function assertEquals(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

Deno.test("only pending orders can be claimed by a payment event", () => {
  assertEquals([...CLAIMABLE_STATUSES], ["pending"]);
  for (const s of ["paid", "in_production", "shipped", "refunded", "disputed"]) {
    assertEquals((CLAIMABLE_STATUSES as readonly string[]).includes(s), false);
  }
});

Deno.test("email: order email wins, Stripe email is the fallback", () => {
  assertEquals(resolveCustomerEmail("a@x.com", "b@x.com"), "a@x.com");
  assertEquals(resolveCustomerEmail(null, "b@x.com"), "b@x.com");
  assertEquals(resolveCustomerEmail("  ", "b@x.com"), "b@x.com");
  assertEquals(resolveCustomerEmail(undefined, null), null);
});

Deno.test("display name never throws on a missing email", () => {
  assertEquals(customerDisplayName("sam@x.com"), "sam");
  assertEquals(customerDisplayName(null, "Sam Lee"), "Sam Lee");
  assertEquals(customerDisplayName(null, null), "Customer");
  assertEquals(customerDisplayName(undefined), "Customer");
});

Deno.test("signer is called once per path", async () => {
  let calls = 0;
  const sign = memoizeSigner(async (p) => { calls++; return `signed:${p}`; });
  const urls = await Promise.all([sign("back/a.png"), sign("back/a.png"), sign("black/b.png")]);
  assertEquals(urls, ["signed:back/a.png", "signed:back/a.png", "signed:black/b.png"]);
  assertEquals(calls, 2);
});

Deno.test("background work is handed to waitUntil when available", async () => {
  let handed: Promise<unknown> | null = null;
  const task = new Promise((r) => setTimeout(r, 10));
  const mode = await runInBackground(task, { waitUntil: (p) => { handed = p; } });
  assertEquals(mode, "background");
  assertEquals(handed === task, true);
  await task;
});

Deno.test("background work runs inline without EdgeRuntime", async () => {
  let done = false;
  const mode = await runInBackground((async () => { done = true; })(), undefined);
  assertEquals(mode, "inline");
  assertEquals(done, true);
});
