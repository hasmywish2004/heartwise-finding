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

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/reports", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    if (tab === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setError(error.message === "Invalid login credentials" ? "That email and password don't match. Please try again." : error.message);
      navigate({ to: "/reports" });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/auth" } });
      setBusy(false);
      if (error) return setError(error.message);
      if (!data.session) {
        setInfo("Check your inbox to confirm, then log in.");
        setTab("login");
      } else navigate({ to: "/reports" });
    }
  }

  return (
    <div className="min-h-screen">
      <header className="container-app flex h-20 items-center"><Logo /></header>
      <main className="container-app max-w-[440px] pt-4">
        <div className="card fade-up p-6 md:p-8">
          <h1 className="t-title">{tab === "login" ? "Welcome back" : "Create your account"}</h1>
          <div role="tablist" className="mt-6 grid grid-cols-2 rounded-xl bg-background p-1">
            {(["login", "signup"] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => { setTab(t); setError(""); }}
                className={`min-h-[44px] rounded-lg font-semibold transition ${tab === t ? "bg-card text-ink shadow-[var(--shadow-rest)]" : "text-muted-foreground"}`}>
                {t === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>
          {info && <p className="mt-5 flex gap-2 rounded-xl bg-tint p-3 t-small text-primary"><Icon.Info size={18} className="mt-0.5 shrink-0" />{info}</p>}
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="email" className="t-small text-ink">Email</label>
              <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-1" />
            </div>
            <div>
              <label htmlFor="pw" className="t-small text-ink">Password</label>
              <input id="pw" type="password" required minLength={6} autoComplete={tab === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="field mt-1" />
            </div>
            {error && <p role="alert" className="flex gap-2 rounded-xl bg-amber-bg p-3 t-small text-amber"><Icon.Alert size={18} className="mt-0.5 shrink-0" />{error}</p>}
            <button type="submit" disabled={busy} className="btn btn-primary w-full">{busy ? "One moment…" : tab === "login" ? "Log in" : "Create account"}</button>
          </form>
        </div>
      </main>
    </div>
  );
}
