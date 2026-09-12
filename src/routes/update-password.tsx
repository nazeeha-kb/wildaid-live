import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Lock } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/update-password")({
  component: UpdatePassword,
  head: () => ({
    meta: [
      { title: "Update password | AnimalAid" },
      { name: "description", content: "Choose a new AnimalAid account password." },
    ],
  }),
});

function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    if (password.length < 6) {
      setMessage("Use at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    navigate({ to: "/auth" });
  };

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h1 className="font-display text-2xl">Create a new password</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Password text is visible here so you can confirm it before saving.</p>
          <form onSubmit={submit} className="mt-5 grid gap-4">
            <PasswordInput label="New password" value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
            <PasswordInput label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
            {message && <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}
            <button disabled={isSubmitting} className="h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm tap-press hover:bg-primary/90 disabled:opacity-60">{isSubmitting ? "Saving..." : "Update password"}</button>
          </form>
          <Link to="/auth" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">Back to login</Link>
        </div>
      </section>
    </main>
  );
}

function PasswordInput({ label, value, onChange, visible, onToggle }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      {label}
      <span className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} required minLength={6} autoComplete="new-password" className="h-11 w-full rounded-lg border border-input bg-background px-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
        <button type="button" onClick={onToggle} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={visible ? "Hide password" : "Show password"}>
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>
    </label>
  );
}
