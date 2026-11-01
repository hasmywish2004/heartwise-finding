import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, FadeUp, Icon, Spinner } from "@/components/kit";
import { routeForStatus, typeWords } from "@/lib/genome";
import { supabase, type Upload } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "My reports — Genome Intelligence" }, { name: "description", content: "Your uploaded files and findings." }] }),
  component: Reports,
});

function Pill({ u, n }: { u: Upload; n: number }) {
  if (u.status === "done") return <span className="chip chip-strong"><Icon.Tick size={14} strokeWidth={2.6} /><span className="num">{n}</span> finding{n === 1 ? "" : "s"}</span>;
  if (u.status === "awaiting_confirmation") return <span className="chip chip-contested"><Icon.Alert size={14} />Check needed</span>;
  if (u.status === "refused") return <span className="chip chip-grey"><Icon.Slash size={14} />Not read</span>;
  return <span className="chip chip-blue"><span className="pulse-dot" />Reading…</span>;
}

function Reports() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Upload[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("uploads").select("*").order("created_at", { ascending: false });
      const ups = (data ?? []) as Upload[];
      setRows(ups);
      const done = ups.filter((u) => u.status === "done").map((u) => u.id);
      if (done.length) {
        const { data: f } = await supabase.from("findings").select("upload_id").in("upload_id", done);
        const c: Record<string, number> = {};
        (f ?? []).forEach((r: { upload_id: string }) => (c[r.upload_id] = (c[r.upload_id] ?? 0) + 1));
        setCounts(c);
      }
    })();
  }, []);

  function open(u: Upload) {
    const r = routeForStatus(u.status);
    navigate({ to: `/${r}/$id` as "/findings/$id", params: { id: u.id } });
  }

  return (
    <AppShell>
      <h1 className="t-title fade-up">My reports</h1>
      <FadeUp i={1}>
        <Link to="/upload" className="card card-lift mt-6 flex items-center gap-4 border-tint-border bg-tint p-5 md:p-6">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Icon.FileUp size={24} /></span>
          <span className="flex-1">
            <span className="t-card block">Upload a file</span>
            <span className="t-small block text-muted-foreground">A raw DNA file or a lab report</span>
          </span>
          <Icon.Arrow size={22} className="text-primary" />
        </Link>
      </FadeUp>

      <div className="mt-8">
        {rows === null ? <Spinner /> : rows.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">No files yet. Upload one to begin.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((u, i) => (
              <FadeUp key={u.id} i={i + 2}>
                <li>
                  <button type="button" onClick={() => open(u)} className="card card-lift flex w-full items-center gap-3 p-4 text-left md:p-5">
                    <span className="min-w-0 flex-1">
                      <span className="t-card block truncate">{u.filename}</span>
                      <span className="t-small block text-muted-foreground">{typeWords(u.path)} · {new Date(u.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
                    </span>
                    <Pill u={u} n={counts[u.id] ?? 0} />
                  </button>
                </li>
              </FadeUp>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
