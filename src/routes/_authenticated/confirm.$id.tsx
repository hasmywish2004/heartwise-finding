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
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ gene: "", hgvs_c: "", lab_classification: "" });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("observations").select("*").eq("upload_id", id).order("created_at").then(({ data }) => setRows((data ?? []) as Observation[]));
  }, [id]);

  const total = rows?.length ?? 0;
  const count = rows?.filter((r) => ok[r.id]).length ?? 0;
  const all = total > 0 && count === total;

  async function go() {
    setBusy(true);
    await supabase.from("observations").update({ user_confirmed: true }).eq("upload_id", id);
    fireWebhook(ANALYSE, id);
    navigate({ to: "/reading/$id", params: { id } });
  }

  function startEdit(o: Observation) {
    setEditing(o.id);
    setDraft({ gene: o.gene ?? "", hgvs_c: o.hgvs_c ?? "", lab_classification: o.lab_classification ?? "" });
    setRemoving(null);
  }

  async function saveEdit(o: Observation) {
    setSaving(true);
    const gene = draft.gene.trim() || null;
    const hgvs_c = draft.hgvs_c.trim() || null;
    const lab_classification = draft.lab_classification.trim() || null;
    await supabase.from("observations").update({ gene, hgvs_c, lab_classification }).eq("id", o.id);
    setRows((rs) => (rs ?? []).map((r) => (r.id === o.id ? { ...r, gene, hgvs_c, lab_classification } : r)));
    setOk((prev) => ({ ...prev, [o.id]: false }));
    setSaving(false);
    setEditing(null);
  }

  async function removeRow(o: Observation) {
    await supabase.from("observations").delete().eq("id", o.id);
    setRows((rs) => (rs ?? []).filter((r) => r.id !== o.id));
    setOk((prev) => {
      const next = { ...prev };
      delete next[o.id];
      return next;
    });
    setRemoving(null);
  }

  return (
    <AppShell>
      <h1 className="t-title fade-up">Does this match your report?</h1>
      <p className="mt-2 fade-up">This is the one step a person checks — you. An AI read the table in your report; everything after this is decided by fixed rules, not another review. Check each row against your paper copy before anything is looked up.</p>
      <p className="mt-4 flex gap-2 rounded-xl bg-amber-bg p-3 t-small text-amber"><Icon.Alert size={18} className="mt-0.5 shrink-0" />One wrong letter would give you someone else's evidence — that's why this step exists.</p>

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
                    {editing === o.id ? (
                      <div className="mt-4 space-y-3 rounded-xl border bg-background p-4">
                        <label className="block t-small text-muted-foreground">
                          Gene
                          <input className="field mt-1" value={draft.gene} onChange={(e) => setDraft({ ...draft, gene: e.target.value })} />
                        </label>
                        <label className="block t-small text-muted-foreground">
                          DNA spelling code (hgvs_c)
                          <input className="field mt-1 font-mono" value={draft.hgvs_c} onChange={(e) => setDraft({ ...draft, hgvs_c: e.target.value })} />
                        </label>
                        <label className="block t-small text-muted-foreground">
                          What your lab says
                          <input className="field mt-1" value={draft.lab_classification} onChange={(e) => setDraft({ ...draft, lab_classification: e.target.value })} />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={saving} onClick={() => saveEdit(o)} className="btn btn-primary flex-1 sm:flex-none">
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost flex-1 sm:flex-none">Cancel</button>
                        </div>
                      </div>
                    ) : removing === o.id ? (
                      <div className="mt-4 rounded-xl border border-dashed border-cantsay-border p-4">
                        <p className="t-small text-ink">Are you sure? This row will be removed and never looked up.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" onClick={() => removeRow(o)} className="btn btn-outline flex-1 sm:flex-none">Yes, remove it</button>
                          <button type="button" onClick={() => setRemoving(null)} className="btn btn-ghost flex-1 sm:flex-none">Keep</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" aria-pressed={on} onClick={() => setOk({ ...ok, [o.id]: !on })}
                          className={`btn flex-1 sm:flex-none ${on ? "bg-strong-bg text-strong" : "btn-secondary"}`}>
                          {on ? <><Icon.Tick size={18} strokeWidth={2.6} />Matches</> : "Confirm"}
                        </button>
                        <button type="button" onClick={() => startEdit(o)} className="btn btn-secondary flex-1 sm:flex-none">Fix</button>
                        <button type="button" onClick={() => { setRemoving(o.id); setEditing(null); }} className="btn btn-ghost flex-1 sm:flex-none">Not on my report</button>
                      </div>
                    )}
                  </li>
                </FadeUp>
              );
            })}
          </ul>
          <p className="mt-4 t-small text-muted-foreground">If a row is wrong, fix it or remove it. We only look up what you confirm.</p>
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
