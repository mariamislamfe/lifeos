"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Button, Field, Input } from "@/components/ui/primitives";
import { Logo } from "@/components/shell/sidebar";
import { cn } from "@/lib/utils";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.7 2.2 2.4 6.5 2.4 11.8s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const sb = getSupabase();
    try {
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Full reload so the proxy sees the fresh session cookie.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/";
      } else {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { full_name: name || undefined }, emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        if (data.session) window.location.href = "/";
        else setInfo("Check your inbox to confirm your email, then sign in.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Brand side */}
      <div className="relative hidden overflow-hidden border-r border-line bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-accent/15 blur-3xl" />
        <div className="pointer-events-none absolute right-[-120px] bottom-[-160px] h-[420px] w-[420px] rounded-full bg-sky-400/10 blur-3xl" />
        <Logo className="relative" />
        <div className="relative max-w-lg">
          <h1 className="font-display text-[56px] leading-[1.02] tracking-tight">
            Everything in your head, <em className="text-accent">organised.</em>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted">
            University, study, projects, applications, ideas and plans — in one calm place that always tells you what to focus on next.
          </p>
          <div className="mt-10 flex flex-col gap-2.5">
            {[
              ["Up next", "Physics study session", "in 1h 25m"],
              ["Due tomorrow", "Competition application", "23:59"],
              ["In 3 days", "Project presentation", "10:00"],
            ].map(([k, t, v], i) => (
              <div
                key={t}
                className="animate-fade-up flex items-center gap-3 rounded-xl border border-line bg-bg/60 px-4 py-3 shadow-soft backdrop-blur"
                style={{ animationDelay: `${200 + i * 90}ms` }}
              >
                <span className={cn("h-2 w-2 rounded-full", i === 0 ? "bg-accent" : i === 1 ? "bg-orange-500" : "bg-sky-500")} />
                <span className="w-24 text-xs text-subtle">{k}</span>
                <span className="flex-1 text-sm font-medium">{t}</span>
                <span className="tabular text-xs text-muted">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-subtle">Your personal operating system.</p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center px-5 py-12">
        <div className="animate-fade-up w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          <h2 className="text-2xl font-semibold tracking-tight">{mode === "signin" ? "Welcome back" : "Create your LifeOS"}</h2>
          <p className="mt-1 text-sm text-muted">{mode === "signin" ? "Sign in to pick up where you left off." : "It takes ten seconds."}</p>

          {!isSupabaseConfigured ? (
            <div className="mt-8 rounded-2xl border border-line bg-surface p-5 shadow-soft">
              <div className="text-sm font-medium">Supabase isn&apos;t connected yet</div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                Add <code className="rounded bg-surface-2 px-1 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code className="rounded bg-surface-2 px-1 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code className="rounded bg-surface-2 px-1 text-xs">.env.local</code> to enable accounts. Until then you can explore LifeOS in local demo mode.
              </p>
              <Link href="/" className="mt-4 inline-flex">
                <Button variant="primary">
                  Continue in demo mode <ArrowRight />
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Button variant="secondary" size="lg" className="mt-8 w-full" onClick={google}>
                <GoogleIcon /> Continue with Google
              </Button>
              <div className="my-6 flex items-center gap-3 text-[11px] tracking-wide text-subtle uppercase">
                <div className="h-px flex-1 bg-line" /> or <div className="h-px flex-1 bg-line" />
              </div>
              <form onSubmit={submit} className="flex flex-col gap-3.5">
                {mode === "signup" && (
                  <Field label="Name">
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mariam" autoComplete="name" className="h-10" />
                  </Field>
                )}
                <Field label="Email">
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className="h-10" />
                </Field>
                <Field label="Password">
                  <Input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    className="h-10"
                  />
                </Field>
                {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-[13px] text-rose-600 dark:text-rose-400">{error}</p>}
                {info && (
                  <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-700 dark:text-emerald-300">
                    <Mail className="h-4 w-4" /> {info}
                  </p>
                )}
                <Button type="submit" variant="primary" size="lg" className="mt-1 w-full" disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" /> : null}
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>
              <p className="mt-6 text-center text-[13px] text-muted">
                {mode === "signin" ? "New here? " : "Already have an account? "}
                <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="font-medium text-accent hover:underline">
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
