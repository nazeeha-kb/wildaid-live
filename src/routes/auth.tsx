import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        navigate({ to: "/rehabber" });
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Account created. Please check your email if verification is required.");
        setIsLogin(true);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-card/60">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link to="/" search={{}} className="font-display text-lg font-semibold">
            RehabStatus
          </Link>

          <Link
            to="/"
            search={{}}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Caller view
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 py-10">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h1 className="font-display text-2xl font-semibold">
            {isLogin ? "Rehabber login" : "Create rehabber account"}
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {isLogin
              ? "Sign in to update your wildlife intake capacity."
              : "Create an account to access the rehabber dashboard."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="At least 6 characters"
              />
            </div>

            {message && (
              <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground disabled:opacity-60"
            >
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage("");
            }}
            className="mt-5 w-full text-sm text-muted-foreground hover:text-foreground"
          >
            {isLogin
              ? "Don't have an account? Create one"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </main>
    </div>
  );
}