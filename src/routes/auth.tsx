import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Icon, Logo } from "@/components/kit";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Log in — Genome Intelligence" },
      { name: "description", content: "Sign up or log in to read your DNA file or lab report." },
      { property: "og:title", content: "Log in — Genome Intelligence" },
      { property: "og:description", content: "Sign up or log in to Genome Intelligence for Heart Health." },
    ],
  }),
  component: AuthPage,
});

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="t-small text-ink">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type={show ? "text" : "password"}
          required
          minLength={6}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field pr-12"
        />
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={() => setShow(!show)}
          className="absolute inset-y-0 right-0 flex min-h-[44px] w-11 items-center justify-center text-muted-foreground"
        >
          {show ? <Icon.EyeOff size={20} /> : <Icon.Eye size={20} />}
        </button>
      </div>
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/reports", replace: true });
    });
  }, [navigate]);

  const mismatch = confirmPw.length > 0 && confirmPw !== password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    const em = email.trim();
    if (view === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: em, password });
      setBusy(false);
      if (error) return setError(error.message === "Invalid login credentials" ? "That email and password don't match. Please try again." : error.message);
      navigate({ to: "/reports" });
    } else {
      if (password !== confirmPw) {
        setBusy(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({ email: em, password, options: { emailRedirectTo: window.location.origin + "/auth" } });
      setBusy(false);
      if (error) {
        const m = error.message.toLowerCase();
        if (m.includes("already registered") || m.includes("already exists")) {
          setError("That email already has an account — log in instead.");
          setView("login");
        } else if (m.includes("rate limit")) {
          setError("Too many attempts. Please wait a minute and try again.");
        } else {
          setError(error.message);
        }
        return;
      }
      if (!data.session) {
        setInfo("Check your inbox to confirm, then log in.");
        setView("login");
      } else navigate({ to: "/reports" });
    }
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + "/auth" });
    setBusy(false);
    setInfo("If that email has an account, we've sent a reset link.");
  }

  return (
    <div className="min-h-screen">
      <header className="container-app flex h-20 items-center">
        <Logo />
      </header>
      <main className="container-app max-w-[440px] pt-4">
        <div className="card fade-up p-6 md:p-8">
          {view === "reset" ? (
            <>
              <h1 className="t-title">Reset your password</h1>
              {info && (
                <p className="mt-5 flex gap-2 rounded-xl bg-tint p-3 t-small text-primary">
                  <Icon.Info size={18} className="mt-0.5 shrink-0" />
                  {info}
                </p>
              )}
              <form onSubmit={sendReset} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="reset-email" className="t-small text-ink">
                    Email
                  </label>
                  <input id="reset-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-1" />
                </div>
                <button type="submit" disabled={busy} className="btn btn-primary w-full">
                  {busy ? "One moment…" : "Send reset link"}
                </button>
              </form>
              <p className="mt-4 text-center">
                <button type="button" onClick={() => { setView("login"); setError(""); setInfo(""); }} className="t-small font-semibold text-primary">
                  Back to log in
                </button>
              </p>
            </>
          ) : (
            <>
              <h1 className="t-title">{view === "login" ? "Welcome back" : "Create your account"}</h1>
              <div role="tablist" className="mt-6 grid grid-cols-2 rounded-xl bg-background p-1">
                {(["login", "signup"] as const).map((t) => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={view === t}
                    type="button"
                    onClick={() => {
                      setView(t);
                      setError("");
                    }}
                    className={`min-h-[44px] rounded-lg font-semibold transition ${view === t ? "bg-card text-ink shadow-[var(--shadow-rest)]" : "text-muted-foreground"}`}
                  >
                    {t === "login" ? "Log in" : "Sign up"}
                  </button>
                ))}
              </div>
              {info && (
                <p className="mt-5 flex gap-2 rounded-xl bg-tint p-3 t-small text-primary">
                  <Icon.Info size={18} className="mt-0.5 shrink-0" />
                  {info}
                </p>
              )}
              <form onSubmit={submit} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="email" className="t-small text-ink">
                    Email
                  </label>
                  <input id="email" type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-1" />
                </div>
                <div>
                  <PasswordField id="pw" label="Password" value={password} onChange={setPassword} autoComplete={view === "login" ? "current-password" : "new-password"} />
                  {view === "signup" && (
                    <ul className="mt-2 space-y-1">
                      <li className="flex items-center gap-2 t-small text-muted-foreground">
                        {password.length >= 6 ? (
                          <Icon.Tick size={16} strokeWidth={2.6} className="shrink-0 text-strong" />
                        ) : (
                          <span className="mx-[5px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-dot-empty" aria-hidden="true" />
                        )}
                        At least 6 characters
                      </li>
                    </ul>
                  )}
                  {view === "login" && (
                    <div className="mt-2 text-right">
                      <button type="button" onClick={() => { setView("reset"); setError(""); setInfo(""); }} className="t-small font-semibold text-primary">
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>
                {view === "signup" && (
                  <div>
                    <PasswordField id="pw2" label="Confirm password" value={confirmPw} onChange={setConfirmPw} autoComplete="new-password" />
                    {mismatch && (
                      <p role="alert" className="mt-2 flex gap-2 rounded-xl bg-amber-bg p-3 t-small text-amber">
                        <Icon.Alert size={18} className="mt-0.5 shrink-0" />
                        Those passwords don't match.
                      </p>
                    )}
                  </div>
                )}
                {error && (
                  <p role="alert" className="flex gap-2 rounded-xl bg-amber-bg p-3 t-small text-amber">
                    <Icon.Alert size={18} className="mt-0.5 shrink-0" />
                    {error}
                  </p>
                )}
                <button type="submit" disabled={busy} className="btn btn-primary w-full">
                  {busy ? "One moment…" : view === "login" ? "Log in" : "Create account"}
                </button>
              </form>
              <p className="mt-4 text-center t-small text-muted-foreground">
                Your file is stored privately. Only you can open it, and you can delete it any time.
                <br />
                For understanding, not diagnosis.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
