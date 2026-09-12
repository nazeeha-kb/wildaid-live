import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/request-reset-password")({
  component: RequestResetPassword,
  head: () => ({
    meta: [
      { title: "Reset password | AnimalAid" },
      { name: "description", content: "Request an AnimalAid password reset email." },
    ],
  }),
});

function RequestResetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setIsSubmitting(false);
    setMessage(error ? error.message : "Check your spam or inbox for a password reset email.");
  };

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <Link to="/auth" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to login</Link>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h1 className="font-display text-2xl">Reset your password</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Enter your account email and AnimalAid will send you a secure reset link.</p>
          <form onSubmit={submit} className="mt-5 grid gap-4">
            <label className="grid gap-1.5 text-sm font-semibold">
              Email
              <span className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
              </span>
            </label>
            {message && <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}
            <button disabled={isSubmitting} className="h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm tap-press hover:bg-primary/90 disabled:opacity-60">{isSubmitting ? "Sending..." : "Send reset link"}</button>
          </form>
        </div>
      </section>
    </main>
  );
}
