import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://mnbafonstnhdybonknap.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Ac-nl9N2mV6mA0l2ZfayOg_aKgbEP-3";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

export const INTAKE = "https://genomeintelligence.app.n8n.cloud/webhook/genome-upload";
export const ANALYSE = "https://genomeintelligence.app.n8n.cloud/webhook/genome-analyse";

/** Fire-and-forget: never await these, the status column is the source of truth. */
export function fireWebhook(url: string, uploadId: string) {
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ upload_id: uploadId }),
  }).catch(() => {});
}

export type Upload = {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  detected_type: string | null;
  path: "A" | "B" | "R" | null;
  status: "received" | "processing" | "awaiting_confirmation" | "done" | "refused";
  refusal_reason: string | null;
  created_at: string;
};

export type Observation = {
  id: string;
  upload_id: string;
  source: string;
  gene: string | null;
  rsid: string | null;
  genotype: string | null;
  hgvs_c: string | null;
  hgvs_p: string | null;
  zygosity: string | null;
  lab_classification: string | null;
  user_confirmed: boolean | null;
};

export type Finding = {
  id: string;
  upload_id: string;
  observation_id: string | null;
  label: "strong" | "contested" | "weak" | "refused";
  headline: string | null;
  supports: string | null;
  disputes: string | null;
  evidence_age: string | null;
  population: string | null;
  source_urls: string[] | null;
  rule_trace: string | null;
  sort_order: number | null;
  is_stale: boolean | null;
  previous_classification: string | null;
  classification: string | null;
  checked_at: string | null;
  created_at: string;
};
