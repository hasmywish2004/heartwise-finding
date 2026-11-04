import { LABEL_NAMES, parseChecks, plainClassification, type LabelKey } from "@/lib/genome";
import type { Finding, Upload } from "@/lib/supabase";

const COLORS: Record<LabelKey, [number, number, number]> = {
  strong: [14, 107, 69],
  contested: [154, 74, 7],
  weak: [55, 48, 163],
  refused: [63, 74, 92],
};

// Built-in PDF fonts only cover basic Latin; replace characters they can't draw.
function clean(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, "");
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export async function buildReportPdf(upload: Upload | null, findings: Finding[]): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 18, CW = W - M * 2, BOTTOM = 280;
  let y = M;

  const ensure = (h: number) => { if (y + h > BOTTOM) { doc.addPage(); y = M; } };
  const text = (s: string, size: number, style: "normal" | "bold" = "normal", color: [number, number, number] = [51, 65, 92], indent = 0) => {
    doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(...color);
    const lines = doc.splitTextToSize(clean(s), CW - indent) as string[];
    const lh = size * 0.45;
    for (const l of lines) { ensure(lh); doc.text(l, M + indent, y + lh * 0.8); y += lh; }
  };

  text("Heart-health report", 22, "bold", [11, 27, 51]);
  y += 2;
  text(`File: ${upload?.filename ?? "-"}`, 11);
  if (upload) text(`Uploaded: ${fmtDate(upload.created_at)}`, 11);
  text(`Report made: ${fmtDate(new Date().toISOString())}`, 11);
  text(`Findings: ${findings.length}`, 11);
  y += 3;
  text("Based only on the rows you confirmed. Labels come from fixed rules, not AI. We check against South Asian genetic data (gnomAD).", 10, "normal", [74, 88, 114]);
  y += 4;

  const changed = findings.filter((f) => f.is_stale && f.previous_classification);
  if (changed.length) {
    ensure(14);
    text("Classification changes", 15, "bold", [11, 27, 51]);
    y += 1;
    for (const f of changed) {
      const from = plainClassification(f.previous_classification);
      const to = plainClassification(f.classification);
      text(f.headline ?? "Finding", 11, "bold", [154, 74, 7]);
      text(`${f.previous_classification}${from ? ` (${from})` : ""}  ->  ${f.classification ?? "-"}${to ? ` (${to})` : ""}`, 10, "normal", [51, 65, 92], 3);
      if (f.checked_at) text(`Checked again on ${fmtDate(f.checked_at)}`, 10, "normal", [74, 88, 114], 3);
      y += 2;
    }
    y += 3;
  }

  ensure(14);
  text("Your findings", 15, "bold", [11, 27, 51]);
  y += 2;
  findings.forEach((f, i) => {
    ensure(30);
    doc.setDrawColor(227, 232, 239); doc.line(M, y, W - M, y); y += 4;
    text(`${i + 1}. ${LABEL_NAMES[f.label]}`, 11, "bold", COLORS[f.label]);
    text(f.headline ?? "", 12, "bold", [11, 27, 51]);
    if (f.is_stale && f.previous_classification) {
      text(`Changed: ${f.previous_classification} -> ${f.classification ?? "-"}`, 10, "bold", [154, 74, 7]);
    }
    const checks = parseChecks(f.rule_trace, f.label);
    if (checks) {
      y += 1;
      text("Evidence checks", 10, "bold", [11, 27, 51]);
      for (const c of checks) text(`${c.pass ? "[Yes]" : "[No] "}  ${c.name}`, 10, "normal", c.pass ? [14, 107, 69] : [74, 88, 114], 3);
    }
    const parts: [string, string | null][] = [["What supports it", f.supports], ["What disputes it", f.disputes], ["How old the evidence is", f.evidence_age], ["Population", f.population]];
    for (const [k, v] of parts) if (v) { y += 1; text(k, 10, "bold", [11, 27, 51]); text(v, 10, "normal", [51, 65, 92], 3); }
    if (f.source_urls?.length) { y += 1; text("Sources", 10, "bold", [11, 27, 51]); for (const u of f.source_urls) text(u, 9, "normal", [30, 79, 191], 3); }
    y += 4;
  });

  ensure(16);
  text("If high cholesterol or early heart attacks run in your family, talk to a doctor - whatever this report says.", 10, "bold", [30, 79, 191]);

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(74, 88, 114);
    doc.text(`Genome Intelligence for Heart Health  -  page ${p} of ${pages}`, M, 290);
  }
  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
