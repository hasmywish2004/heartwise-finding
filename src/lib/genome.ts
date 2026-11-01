export type LabelKey = "strong" | "contested" | "weak" | "refused";

export const LABEL_NAMES: Record<LabelKey, string> = {
  strong: "Strong evidence",
  contested: "Experts disagree",
  weak: "Weak evidence",
  refused: "Can't say",
};

export type Check = { name: string; pass: boolean };

/** Turn a rule_trace string into the four evidence checks. Null = hide checks. */
export function parseChecks(ruleTrace: string | null | undefined, label?: string): Check[] | null {
  if (!ruleTrace || label === "refused") return null;
  const t = ruleTrace.toLowerCase();
  const age = t.match(/age=(\d+(?:\.\d+)?)/);
  const year = t.match(/year=(\d{4})/);
  const subs = t.match(/submissions=(\d+)/);
  const n = subs ? parseInt(subs[1], 10) : 0;
  return [
    { name: "Labs agree", pass: !t.includes("conflicting") },
    {
      name: "Checked in the last 5 years",
      pass: (!!age && parseFloat(age[1]) <= 5) || (!!year && parseInt(year[1], 10) >= 2021),
    },
    { name: `${n} lab report${n === 1 ? "" : "s"}`, pass: n >= 2 },
    { name: "South Asian data", pass: t.includes("sas checked") },
  ];
}

export function extractApoe(headlines: (string | null)[]): string | null {
  for (const h of headlines) {
    const m = h?.match(/APOE type is\s+([A-Za-z0-9/εe]+)/i);
    if (m) return m[1].replace(/[.,;]$/, "");
  }
  return null;
}

export function extractMarker(headline: string | null): string {
  if (!headline) return "";
  const gene = headline.match(/\b([A-Z][A-Z0-9]{1,9})\b/)?.[1];
  const rs = headline.match(/\brs\d+\b/i)?.[0];
  return [gene, rs].filter(Boolean).join(" · ");
}

export function extractPct(population: string | null): number | null {
  const m = population?.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!m) return null;
  return Math.max(0, Math.min(100, Math.round(parseFloat(m[1]))));
}

export function plainClassification(c: string | null): string {
  const k = (c ?? "").toLowerCase().trim();
  if (k.startsWith("likely pathogenic")) return "it probably causes disease";
  if (k.startsWith("pathogenic")) return "it causes disease";
  if (k.includes("risk factor")) return "it may raise risk";
  if (k.includes("uncertain")) return "nobody knows yet";
  if (k.includes("likely benign")) return "probably harmless";
  if (k.includes("benign")) return "harmless";
  return "";
}

export function sourceLabel(url: string): string {
  if (url.includes("ncbi.nlm.nih.gov")) return "ClinVar — what labs say";
  if (url.includes("gnomad")) return "gnomAD — who has it";
  return "The study";
}

export function typeWords(path: string | null): string {
  if (path === "A") return "Raw DNA file";
  if (path === "B") return "Lab report";
  if (path === "R") return "Not read";
  return "Checking…";
}

export function routeForStatus(status: string): "findings" | "confirm" | "refused" | "reading" {
  if (status === "done") return "findings";
  if (status === "awaiting_confirmation") return "confirm";
  if (status === "refused") return "refused";
  return "reading";
}
