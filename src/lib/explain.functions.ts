import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

const LABEL_NAMES: Record<string, string> = {
  strong: "Strong evidence",
  contested: "Experts disagree",
  weak: "Weak evidence",
  refused: "Can't say",
};

export const explainFinding = createServerFn({ method: "POST" })
  .inputValidator((input: { findingId: string; question: string }) => {
    const question = String(input?.question ?? "").trim();
    if (!input?.findingId || question.length < 3 || question.length > 500) throw new Error("Please ask a question of 3 to 500 characters.");
    return { findingId: String(input.findingId), question };
  })
  .handler(async ({ data }) => {
    const auth = getRequestHeader("authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return { ok: false as const, error: "Please log in again." };

    const { createClient } = await import("@supabase/supabase-js");
    const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = await import("@/lib/supabase");
    const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await sb.auth.getUser(token);
    if (!userData?.user) return { ok: false as const, error: "Please log in again." };
    // RLS limits this to the signed-in owner's findings.
    const { data: f } = await sb.from("findings").select("label, headline, supports, disputes, evidence_age, population, rule_trace").eq("id", data.findingId).maybeSingle();
    if (!f) return { ok: false as const, error: "We couldn't find that finding." };

    const label = LABEL_NAMES[f.label as string] ?? "Can't say";
    const evidence = [
      `Label (fixed by rules, cannot change): ${label}`,
      `Headline: ${f.headline ?? ""}`,
      `What supports it: ${f.supports ?? "none given"}`,
      `What argues against it: ${f.disputes ?? "none given"}`,
      `Evidence age: ${f.evidence_age ?? "unknown"}`,
      `In South Asians: ${f.population ?? "unknown"}`,
      `Rule trace: ${f.rule_trace ?? "none"}`,
    ].join("\n");

    try {
      const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
      try {
        const res = await generateResponse({
          model: "openai/gpt-6-astra",
          instructions:
            "You explain one heart-health DNA finding to someone with no science background. Use ONLY the evidence given. Short sentences, under 150 words. Never invent facts, numbers or studies. The label was chosen by fixed rules: never suggest it is different, never re-rate it, never give medical advice or a diagnosis. Avoid the words variant, allele, zygosity, pathogenic, heterozygous. If the evidence does not answer the question, say so plainly and suggest talking to a doctor.",
          input: `Evidence:\n${evidence}\n\nQuestion: ${data.question}`,
        });
        const text = (res as { output_text?: string }).output_text ??
          ((res as any).output ?? []).flatMap((o: any) => o.content ?? []).filter((c: any) => c.type === "output_text").map((c: any) => c.text).join("");
        if (!text) return { ok: false as const, error: "No answer came back. Please try again." };
        return { ok: true as const, answer: text.trim(), label };
      } catch (e) {
        if (e instanceof GatewayError) {
          console.error("explainFinding gateway error", e.code, e.ids);
          if (e.code === "rate_limited" || e.httpStatus === 429) return { ok: false as const, error: "Too many questions right now. Please wait a minute." };
          if (e.httpStatus === 402) return { ok: false as const, error: "The explainer is paused right now. Please try later." };
        } else console.error(e);
        return { ok: false as const, error: "We couldn't explain this right now. Please try again." };
      }
    } catch (e) {
      console.error(e);
      return { ok: false as const, error: "We couldn't explain this right now." };
    }
  });
