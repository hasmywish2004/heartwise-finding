import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, CheckBars, Collapse, CountUp, FadeUp, Icon, LabelChip, LabelTile, Spinner } from "@/components/kit";
import { extractApoe, extractGene, extractMarker, GENE_INFO, LABEL_NAMES, parseChecks, type LabelKey } from "@/lib/genome";
import { supabase, type Finding, type Upload } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/findings/$id")({
  head: () => ({ meta: [{ title: "Your findings — Genome Intelligence" }, { name: "description", content: "Your heart-health findings with the evidence for and against." }] }),
  component: Findings,
});

const MEANING: { k: LabelKey; d: string }[] = [
  { k: "strong", d: "Several labs agree, and they checked in the last five years." },
  { k: "contested", d: "Labs looked at it and came to different answers." },
  { k: "weak", d: "Only one lab looked, or the check is old." },
  { k: "refused", d: "Not enough evidence, so we make no claim at all." },
];

function Findings() {
  const { id } = Route.useParams();
  const [upload, setUpload] = useState<Upload | null>(null);
  const [rows, setRows] = useState<Finding[] | null>(null);

  useEffect(() => {
    supabase.from("uploads").select("*").eq("id", id).maybeSingle().then(({ data }) => setUpload(data as Upload));
    supabase.from("findings").select("*").eq("upload_id", id).order("sort_order").then(({ data }) => setRows((data ?? []) as Finding[]));
  }, [id]);

  const apoe = rows ? extractApoe(rows.map((r) => r.headline)) : null;
  const genes = rows ? [...new Set(rows.map((r) => extractGene(r.headline)).filter((g): g is string => !!g))] : [];

  return (
    <AppShell>
      <h1 className="t-title fade-up">Your findings</h1>
      {rows === null ? <Spinner /> : (
        <>
          <div className={`mt-6 grid gap-3 ${apoe ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2"}`}>
            <FadeUp className="card col-span-2 p-4 md:col-span-1">
              <p className="t-small text-muted-foreground">Your file</p>
              <p className="t-card mt-1 truncate">{upload?.filename ?? "—"}</p>
              {upload && <p className="t-small text-muted-foreground">{new Date(upload.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p>}
            </FadeUp>
            <FadeUp i={1} className="card p-4">
              <p className="t-small text-muted-foreground">Findings</p>
              <CountUp to={rows.length} className="mt-1 block text-[32px] font-extrabold leading-none text-ink" />
            </FadeUp>
            {apoe && (
              <FadeUp i={2} className="card p-4">
                <p className="t-small text-muted-foreground">APOE type</p>
                <p className="num mt-1 text-[28px] font-extrabold leading-none text-ink">{apoe}</p>
              </FadeUp>
            )}
          </div>

          <p className="mt-4 t-small text-muted-foreground">
            We check against South Asian genetic data (gnomAD). If that isn't your background, a label still holds — but the population percentages below may not describe you.
          </p>

          <div className="mt-6">
            <Collapse title="What the labels mean">
              <ul className="space-y-3">
                {MEANING.map((m) => (
                  <li key={m.k} className="flex items-start gap-3">
                    <LabelTile label={m.k} />
                    <div><p className="font-semibold text-ink">{LABEL_NAMES[m.k]}</p><p className="t-small">{m.d}</p></div>
                  </li>
                ))}
              </ul>
            </Collapse>
          </div>

          {genes.length > 0 && (
            <div className="mt-4">
              <Collapse title="What these genes do">
                <ul className="space-y-3">
                  {genes.map((g) => (
                    <li key={g}>
                      <p className="font-semibold text-ink">{g}</p>
                      {GENE_INFO[g] && <p className="t-small">{GENE_INFO[g]}</p>}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 t-small text-muted-foreground">The code after each gene (like rs7412) is the exact spot in your DNA being discussed — not the result itself.</p>
              </Collapse>
            </div>
          )}

          <ul className="mt-4 space-y-3">
            {rows.map((f, i) => {
              const checks = parseChecks(f.rule_trace, f.label);
              return (
                <FadeUp key={f.id} i={i + 1}>
                  <li>
                    <Link to="/finding/$id" params={{ id: f.id }} className={`card card-lift block p-5 ${f.label === "refused" ? "border-dashed border-cantsay-border" : ""}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <LabelChip label={f.label} />
                        <span className="num t-small text-muted-foreground">{extractMarker(f.headline)}</span>
                      </div>
                      <p className="t-card mt-3">{f.headline}</p>
                      {f.is_stale && (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-bg px-2 py-0.5 t-small font-semibold text-amber">
                          <Icon.Alert size={12} /> Classification changed since this was shown
                        </span>
                      )}
                      {checks && <div className="mt-4"><CheckBars checks={checks} /></div>}
                      <span className="mt-3 inline-flex items-center gap-1 t-small text-primary">See the evidence <Icon.Arrow size={16} /></span>
                    </Link>
                  </li>
                </FadeUp>
              );
            })}
          </ul>

          {rows.length > 0 && <PdfButton upload={upload} rows={rows} />}

          <p className="mt-6 flex gap-3 rounded-2xl border border-tint-border bg-tint p-4 text-ink">
            <Icon.Info size={20} className="mt-0.5 shrink-0 text-primary" />
            If high cholesterol or early heart attacks run in your family, talk to a doctor — whatever these cards say.
          </p>
        </>
      )}
    </AppShell>
  );
}
