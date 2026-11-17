import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {} } }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));

import { validateNewPassword, MIN_PASSWORD_LENGTH } from "@/pages/ResetPassword";

describe("validateNewPassword", () => {
  it("rejects short passwords", () => {
    expect(validateNewPassword("short", "short")).toMatch(String(MIN_PASSWORD_LENGTH));
  });
  it("rejects a mismatched confirmation", () => {
    expect(validateNewPassword("longenough1", "longenough2")).toBe("Passwords don't match.");
  });
  it("accepts a matching pair", () => {
    expect(validateNewPassword("longenough1", "longenough1")).toBeNull();
  });
});
