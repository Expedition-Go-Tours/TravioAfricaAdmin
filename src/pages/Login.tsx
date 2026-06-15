import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/auth/useAuth";
import { getDefaultRoute } from "@/lib/permissions";
import logoSrc from "@/assets/new_logo.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, loading, error, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getDefaultRoute(), { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate(getDefaultRoute(), { replace: true });
    }
  };

  const handleGoogleLogin = async () => {
    const success = await loginWithGoogle();
    if (success) {
      navigate(getDefaultRoute(), { replace: true });
    }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50/60 p-4">
      <div className="w-full max-w-sm rounded-sm border border-green-100/60 bg-white p-8 shadow-lg shadow-green-900/5">
        {/* Logo & Brand */}
          <div className="mb-7 flex flex-col items-center text-center">
            <img src={logoSrc} alt="TravioAfrica" className="h-36 w-36 object-contain" />

        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-sm border border-border bg-surface-base px-4 py-2.5 text-sm font-medium text-text-primary shadow-sm transition-all hover:bg-surface-muted hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {loading ? "Signing in..." : "Continue with Google"}
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 border-t border-border-muted" />
          <span className="text-xs font-medium text-text-tertiary">OR</span>
          <div className="flex-1 border-t border-border-muted" />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@travioafrica.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              autoComplete="email"
              className="h-10 focus-visible:ring-green-500/40"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Password
              </Label>
              <button type="button" className="text-xs font-medium text-green-600 hover:text-green-700 transition-colors">
                Forgot?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              autoComplete="current-password"
              className="h-10 focus-visible:ring-green-500/40"
            />
          </div>
          {error && (
            <div
              className="rounded-sm border border-status-rejected/30 bg-status-rejected/10 px-3 py-2.5 text-sm text-status-rejected"
              role="alert"
            >
              {error}
            </div>
          )}
          <Button type="submit" className="w-full h-10 bg-green-600 hover:bg-green-700" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <p className="mt-7 text-center text-xs text-text-tertiary/60">
          TravioAfrica Admin Portal &mdash; Authorized access only
        </p>
      </div>
    </div>
  );
}
