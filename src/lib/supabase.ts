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

export const INTAKE = "https://subtle-gaur.pikapod.net/webhook/genome-upload";
export const ANALYSE = "https://subtle-gaur.pikapod.net/webhook/genome-analyse";

const FAILED_KEY = (id: string) => `webhook-failed:${id}`;

/** True if the last attempt to reach the analysis service for this upload failed. */
export function webhookFailed(uploadId: string) {
  return typeof window !== "undefined" && sessionStorage.getItem(FAILED_KEY(uploadId)) === "1";
}

/** Clear the failure flag (e.g. before retrying). */
export function clearWebhookFailed(uploadId: string) {
  if (typeof window !== "undefined") sessionStorage.removeItem(FAILED_KEY(uploadId));
}

/** Fire-and-forget: never await these, the status column is the source of truth.
 *  If the service can't even be reached, log it and flag it so the UI can show a retry. */
export function fireWebhook(url: string, uploadId: string) {
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ upload_id: uploadId }),
  }).catch((err) => {
    console.error("Could not reach the analysis service:", err);
    try {
      sessionStorage.setItem(FAILED_KEY(uploadId), "1");
    } catch {
      /* storage unavailable — console error above still records it */
    }
  });
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
