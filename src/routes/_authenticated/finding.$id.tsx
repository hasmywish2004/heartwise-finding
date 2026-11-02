import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, CheckList, Collapse, DotGrid, FadeUp, Icon, LabelChip, Spinner } from "@/components/kit";
import { extractMarker, extractPct, parseChecks, sourceLabel } from "@/lib/genome";
import { supabase, type Finding } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/finding/$id")({
  head: () => ({ meta: [{ title: "One finding — Genome Intelligence" }, { name: "description", content: "What supports this finding and what argues against it." }] }),
  component: FindingPage,
});

const REASONS = [
  "The evidence looks too thin",
  "It doesn't match what my doctor told me",
  "The label seems wrong",
  "I don't understand it",
  "Something else",
];

function FindingPage() {
  const { id } = Route.useParams();
  const [f, setF] = useState<Finding | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.from("findings").select("*").eq("id", id).maybeSingle().then(({ data }) => setF(data as Finding));
  }, [id]);

  if (!f) return <AppShell><Spinner /></AppShell>;
  const checks = parseChecks(f.rule_trace, f.label);
  const pct = extractPct(f.population);
  const urls = Array.isArray(f.source_urls) ? f.source_urls : [];

  return (
    <AppShell>
      <article className={`card fade-up p-5 md:p-8 ${f.label === "refused" ? "border-dashed border-cantsay-border" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <LabelChip label={f.label} />
          <span className="num t-small text-muted-foreground">{extractMarker(f.headline)}</span>
        </div>
        <h1 className="t-title mt-4">{f.headline}</h1>
        {checks && <div className="mt-5"><CheckList checks={checks} /></div>}

        {f.supports && (
          <section className="mt-7">
            <h2 className="t-card flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-strong-tile" />What supports it</h2>
            <p className="mt-2">{f.supports}</p>
          </section>
        )}
        {f.disputes && (
          <section className="mt-6">
            <h2 className="t-card flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-tile" />What argues against it</h2>
            <p className="mt-2">{f.disputes}</p>
          </section>
        )}
        {f.evidence_age && <p className="mt-6 t-small text-muted-foreground">{f.evidence_age}</p>}
      </article>

      {f.population && (
        <FadeUp i={1} className="card mt-4 p-5 md:p-8">
          <h2 className="t-section">In South Asians</h2>
          {pct !== null ? (
            <>
              <div className="mt-4"><DotGrid filled={pct} /></div>
              <p className="mt-4 text-ink">About <span className="num font-bold">{pct}</span> in every 100 copies of this gene in South Asians have this change.</p>
              <p className="mt-2 t-small text-muted-foreground">{f.population}</p>
            </>
          ) : <p className="mt-2">{f.population}</p>}
        </FadeUp>
      )}

      {urls.length > 0 && (
        <FadeUp i={2} className="card mt-4 p-5 md:p-8">
          <h2 className="t-section">Check it yourself</h2>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {urls.map((u) => (
              <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                {sourceLabel(u)} <Icon.External size={16} />
              </a>
            ))}
          </div>
        </FadeUp>
      )}

      {f.rule_trace && (
        <div className="mt-4">
          <Collapse title="How we chose this label">
            <p className="t-small text-ink">Fixed rules picked this label. AI only helped write the sentences above, and they were checked against the facts.</p>
            <p className="mt-3 break-words font-mono text-[14px] text-muted-foreground">{f.rule_trace}</p>
          </Collapse>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-card/95 py-3 backdrop-blur">
        <div className="container-app grid max-w-[760px] grid-cols-2 gap-3">
          <Link to="/findings/$id" params={{ id: f.upload_id }} className="btn btn-secondary">All findings</Link>
          <button type="button" onClick={() => setOpen(true)} className="btn btn-outline">I don't believe this</button>
        </div>
      </div>

      {open && <DoubtSheet findingId={f.id} onClose={() => setOpen(false)} />}
    </AppShell>
  );
}

function DoubtSheet({ findingId, onClose }: { findingId: string; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  async function send() {
    setBusy(true);
    const full = extra.trim() ? `${reason}: ${extra.trim()}` : reason;
    const { error } = await supabase.from("rejections").insert({ finding_id: findingId, reason: full });
    setBusy(false);
    if (error) {
      toast.error("That didn't save. Please try again.");
      return;
    }
    onClose();
    toast.success("Thanks — we saved that.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <button type="button" aria-label="Close" className="sheet-backdrop absolute inset-0" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="doubt-title" className="sheet relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-card p-6 md:max-w-[520px] md:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <h2 id="doubt-title" className="t-section">Why don't you believe this?</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="btn btn-ghost -mr-3 -mt-2 px-3"><Icon.Cross size={20} /></button>
        </div>
        <p className="mt-1 t-small text-muted-foreground">Your answer helps us test if this tool is honest. It won't change the finding.</p>
        <fieldset className="mt-5 space-y-2">
          <legend className="sr-only">Reason</legend>
          {REASONS.map((r) => (
            <label key={r} className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 ${reason === r ? "border-primary bg-tint" : ""}`}>
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="h-5 w-5 accent-[var(--primary)]" />
              <span className="text-ink">{r}</span>
            </label>
          ))}
        </fieldset>
        <label htmlFor="extra" className="mt-5 block t-small text-ink">Anything else?</label>
        <textarea id="extra" rows={3} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="What made you doubt it?" className="field mt-1 resize-none" />
        <button type="button" disabled={!reason || busy} onClick={send} className="btn btn-primary mt-5 w-full">{busy ? "Sending…" : "Send"}</button>
      </div>
    </div>
  );
}
