import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, FadeUp, Icon, Spinner } from "@/components/kit";
import { plainClassification } from "@/lib/genome";
import { ANALYSE, fireWebhook, supabase, type Observation } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/confirm/$id")({
  head: () => ({ meta: [{ title: "Check what we read — Genome Intelligence" }, { name: "description", content: "Check each row against your paper report." }] }),
  component: Confirm,
});

function Confirm() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Observation[] | null>(null);
  const [ok, setOk] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("observations").select("*").eq("upload_id", id).order("created_at").then(({ data }) => setRows((data ?? []) as Observation[]));
  }, [id]);

  const total = rows?.length ?? 0;
  const count = Object.values(ok).filter(Boolean).length;
  const all = total > 0 && count === total;

  async function go() {
    setBusy(true);
    await supabase.from("observations").update({ user_confirmed: true }).eq("upload_id", id);
    fireWebhook(ANALYSE, id);
    navigate({ to: "/reading/$id", params: { id } });
  }

  return (
    <AppShell>
      <h1 className="t-title fade-up">Does this match your report?</h1>
      <p className="mt-2 fade-up">An AI read the table in your report. Check each row against your paper copy. Nothing is looked up until you confirm.</p>
      <p className="mt-4 flex gap-2 rounded-xl bg-amber-bg p-3 t-small text-amber"><Icon.Alert size={18} className="mt-0.5 shrink-0" />One wrong letter would give you someone else's evidence.</p>

      {rows === null ? <Spinner /> : (
        <>
          <p className="mt-6 t-small text-muted-foreground" aria-live="polite"><span className="num text-ink">{count}</span> of <span className="num">{total}</span> confirmed</p>
          <ul className="mt-3 space-y-3">
            {rows.map((o, i) => {
              const on = !!ok[o.id];
              const plain = plainClassification(o.lab_classification);
              return (
                <FadeUp key={o.id} i={i}>
                  <li className={`card p-5 transition ${on ? "border-strong-tile" : ""}`}>
                    <p className="num text-[26px] font-extrabold text-ink">{o.gene ?? "—"}</p>
                    {o.hgvs_c && <p className="mt-1 break-all font-mono text-[15px] text-ink">{o.hgvs_c}</p>}
                    {o.zygosity?.toLowerCase().startsWith("het") && <p className="mt-1 t-small text-muted-foreground">One copy — you got it from one parent</p>}
                    {o.lab_classification && (
                      <p className="mt-3">Your lab says <strong className="text-ink">{o.lab_classification}</strong>{plain && <span className="text-muted-foreground"> — {plain}</span>}</p>
                    )}
                    <button type="button" aria-pressed={on} onClick={() => setOk({ ...ok, [o.id]: !on })}
                      className={`btn mt-4 w-full sm:w-auto ${on ? "bg-strong-bg text-strong" : "btn-secondary"}`}>
                      {on ? <><Icon.Tick size={18} strokeWidth={2.6} />Matches</> : "Confirm"}
                    </button>
                  </li>
                </FadeUp>
              );
            })}
          </ul>
          <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-card/95 py-3 backdrop-blur">
            <div className="container-app max-w-[760px]">
              <button type="button" disabled={!all || busy} onClick={go} className="btn btn-primary w-full">
                {busy ? "One moment…" : "Everything matches — continue"}
              </button>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
