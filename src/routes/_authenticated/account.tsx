import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, CountUp, FadeUp, Icon } from "@/components/kit";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Account and privacy — Genome Intelligence" }, { name: "description", content: "Your account, your data, and how to delete it." }] }),
  component: Account,
});

function Account() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [c, setC] = useState({ files: 0, findings: 0, doubts: 0 });
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? "");
      setName((data.user?.user_metadata?.full_name as string) ?? "");
      const [u, f, r] = await Promise.all([
        supabase.from("uploads").select("id", { count: "exact", head: true }),
        supabase.from("findings").select("id", { count: "exact", head: true }),
        supabase.from("rejections").select("id", { count: "exact", head: true }),
      ]);
      setC({ files: u.count ?? 0, findings: f.count ?? 0, doubts: r.count ?? 0 });
    })();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  async function del() {
    setBusy(true);
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from("uploads").delete().eq("user_id", data.user.id);
    await logout();
  }

  const stats = [
    { l: "Files uploaded", v: c.files },
    { l: "Findings saved", v: c.findings },
    { l: "Findings questioned", v: c.doubts },
  ];

  return (
    <AppShell>
      <h1 className="t-title fade-up">Account and privacy</h1>
      <FadeUp className="card mt-6 flex items-center gap-4 p-5">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-tint text-primary"><Icon.User size={24} /></span>
        <div className="min-w-0">
          {name && <p className="t-card">{name}</p>}
          <p className="truncate text-ink">{email}</p>
        </div>
      </FadeUp>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <FadeUp key={s.l} i={i + 1} className="card p-4">
            <CountUp to={s.v} className="block text-[28px] font-extrabold leading-none text-ink" />
            <p className="mt-2 t-small text-muted-foreground">{s.l}</p>
          </FadeUp>
        ))}
      </div>
      <FadeUp i={4} className="card mt-4 p-5">
        <h2 className="t-card">About</h2>
        <p className="mt-2">Genome Intelligence looks at a few heart-health spots in your DNA. Fixed rules choose each label, and every claim links to its source. It is for understanding, not diagnosis, and it doesn't replace a doctor.</p>
      </FadeUp>
      <div className="mt-6 flex flex-col gap-3">
        <button type="button" onClick={logout} className="btn btn-secondary">Log out</button>
        {!confirm ? (
          <button type="button" onClick={() => setConfirm(true)} className="btn btn-ghost text-amber">Delete my account and all data</button>
        ) : (
          <div className="rounded-2xl border border-amber-tile bg-amber-bg p-5">
            <p className="font-semibold text-amber">Delete every file and finding? This can't be undone.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setConfirm(false)} className="btn btn-secondary">Keep my data</button>
              <button type="button" disabled={busy} onClick={del} className="btn bg-amber-tile text-primary-foreground">{busy ? "Deleting…" : "Yes, delete"}</button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
