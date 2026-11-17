// Pure helpers for stripe-webhook. No remote imports, so they can be unit
// tested with `deno test supabase/functions/stripe-webhook/`.

/** Order statuses that mean "payment not yet recorded". Only an order in one
 *  of these states may be claimed by a payment event; anything else (paid,
 *  in_production, shipped, refunded, disputed...) means the order was already
 *  processed, so a retried or duplicate Stripe event must not touch it. */
export const CLAIMABLE_STATUSES = ["pending"] as const;

/** Best email for the order: the one saved at checkout, else the one Stripe has. */
export function resolveCustomerEmail(
  orderEmail: string | null | undefined,
  stripeEmail: string | null | undefined,
): string | null {
  const clean = (v: string | null | undefined) => {
    const t = (v ?? "").trim();
    return t.includes("@") ? t : null;
  };
  return clean(orderEmail) ?? clean(stripeEmail);
}

/** Friendly name for emails. Never throws on a missing email. */
export function customerDisplayName(
  email: string | null | undefined,
  shipName?: string | null,
): string {
  const local = (email ?? "").split("@")[0]?.trim();
  if (local) return local;
  const name = (shipName ?? "").trim();
  return name || "Customer";
}

/** Memoizes an async URL signer so each storage path is signed once per run.
 *  The back-logo path in particular was signed once per item before. */
export function memoizeSigner(
  sign: (path: string) => Promise<string>,
): (path: string) => Promise<string> {
  const cache = new Map<string, Promise<string>>();
  return (path: string) => {
    let hit = cache.get(path);
    if (!hit) {
      hit = sign(path);
      cache.set(path, hit);
    }
    return hit;
  };
}

/** Runs `task` after the response is sent when the Supabase runtime supports
 *  it (EdgeRuntime.waitUntil), so Stripe gets its 200 right away instead of
 *  waiting on emails. Falls back to awaiting the task inline. */
export async function runInBackground(
  task: Promise<unknown>,
  runtime: { waitUntil?: (p: Promise<unknown>) => void } | undefined,
): Promise<"background" | "inline"> {
  if (runtime && typeof runtime.waitUntil === "function") {
    runtime.waitUntil(task);
    return "background";
  }
  await task;
  return "inline";
}
