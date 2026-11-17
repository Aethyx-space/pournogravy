import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const MIN_PASSWORD_LENGTH = 8;

// Returns an error message, or null when the pair is acceptable.
export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password !== confirm) return "Passwords don't match.";
  return null;
}

// Landing page for the "forgot password" email link. Supabase signs the user
// in with a recovery session when they arrive, and this page lets them set a
// new password. Before, the link pointed at /login, which only signed them in
// and never asked for a new password.
const ResetPassword = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateNewPassword(password, confirm);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    navigate("/account", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 pt-32">
      <div className="w-full max-w-md">
        <div className="border border-[#fde047]/20 bg-card p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="font-display text-3xl tracking-widest">NEW PASSWORD</h1>
            <p className="font-marker text-xs tracking-[0.3em] uppercase text-muted-foreground">
              Last call for the old one
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !user ? (
            <div className="space-y-4 text-center text-sm text-muted-foreground">
              <p>This reset link has expired or was already used.</p>
              <Link to="/login" className="text-[#fde047] underline underline-offset-4">
                Request a new one
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="font-marker text-[11px] tracking-[0.25em] uppercase text-muted-foreground">
                  New password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="font-marker text-[11px] tracking-[0.25em] uppercase text-muted-foreground">
                  Confirm password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "SAVE PASSWORD"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
