import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Leaf, Lock, Mail, UserPlus } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AuthMode = "login" | "signup";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in | AnimalAid" },
      { name: "description", content: "Create an AnimalAid account or sign in to contact nearby helpers." },
    ],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const credentials = { email: email.trim(), password };
    const { data, error } =
      mode === "signup"
        ? await supabase.auth.signUp({
            ...credentials,
            options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/` },
          })
        : await supabase.auth.signInWithPassword(credentials);

    setIsSubmitting(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    if (mode === "signup" && !data.session) {
      setMessage("Account created. Check your email if confirmation is enabled, then sign in.");
      setMode("login");
      setPassword("");
      return;
    }

    navigate({ to: "/" });
  };

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center gap-8 md:grid-cols-[1fr_26rem]">
        <div className="max-w-xl">
          <Link to="/" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm">
            <span className="grid size-8 place-items-center rounded-md bg-primary/12 text-primary"><Leaf className="size-4" /></span>
            AnimalAid
          </Link>
          <p className="mt-8 inline-flex items-center gap-2 rounded-lg border border-open/10 bg-open-soft px-3 py-1.5 text-xs font-semibold text-open">
            Nearby help works best with a real account
          </p>
          <h1 className="mt-4 font-display text-4xl leading-tight text-foreground sm:text-5xl">Sign in before you contact people near you.</h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            Accounts keep map contacts intentional, reduce spam pings, and make it clear who needs help when someone responds.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="grid grid-cols-2 rounded-xl bg-muted p-1">
            <button type="button" onClick={() => setMode("login")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>Login</button>
            <button type="button" onClick={() => setMode("signup")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>Create account</button>
          </div>

          <form onSubmit={submit} className="mt-5 grid gap-4">
            {mode === "signup" && (
              <label className="grid gap-1.5 text-sm font-semibold">
                Full name
                <span className="relative">
                  <UserPlus className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={name} onChange={(event) => setName(event.target.value)} required className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                </span>
              </label>
            )}

            <label className="grid gap-1.5 text-sm font-semibold">
              Email
              <span className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
              </span>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold">
              Password
              <span className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} className="h-11 w-full rounded-lg border border-input bg-background px-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>

            {mode === "login" && <Link to="/request-reset-password" className="justify-self-start text-sm font-semibold text-primary hover:underline">Forgot password?</Link>}

            {message && <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}

            <button disabled={isSubmitting} className="h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm tap-press hover:bg-primary/90 disabled:opacity-60">
              {isSubmitting ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
