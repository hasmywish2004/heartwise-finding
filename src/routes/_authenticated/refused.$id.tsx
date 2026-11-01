import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, FadeUp, Icon } from "@/components/kit";
import { supabase, type Upload } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/refused/$id")({
  head: () => ({ meta: [{ title: "We didn't read this file — Genome Intelligence" }, { name: "description", content: "Why this file wasn't read, and what we can read." }] }),
  component: Refused,
});

function Refused() {
  const { id } = Route.useParams();
  const [u, setU] = useState<Upload | null>(null);
  useEffect(() => {
    supabase.from("uploads").select("*").eq("id", id).maybeSingle().then(({ data }) => setU(data as Upload));
  }, [id]);

  return (
    <AppShell>
      <FadeUp>
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-cantsay-border bg-card text-cantsay"><Icon.Slash size={28} /></span>
        <h1 className="t-title mt-5">We didn't read this file</h1>
        {u && <p className="mt-1 break-all text-muted-foreground">{u.filename}</p>}
      </FadeUp>
      <FadeUp i={1} className="mt-6 rounded-2xl border bg-background p-5">
        <p className="t-eyebrow !text-muted-foreground">Why</p>
        <p className="mt-2 text-ink">{u?.refusal_reason ?? "…"}</p>
      </FadeUp>
      <FadeUp i={2} className="card mt-4 p-5">
        <h2 className="t-card">What we can read</h2>
        <ul className="mt-3 space-y-2">
          <li className="flex gap-2"><Icon.Helix size={20} className="mt-0.5 shrink-0 text-primary" />Raw DNA files (.txt .csv .vcf)</li>
          <li className="flex gap-2"><Icon.FileUp size={20} className="mt-0.5 shrink-0 text-primary" />Lab reports (.pdf .jpg .png)</li>
        </ul>
      </FadeUp>
      <FadeUp i={3} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link to="/upload" className="btn btn-primary">Upload another file</Link>
        <Link to="/reports" className="btn btn-secondary">Back to reports</Link>
      </FadeUp>
    </AppShell>
  );
}
