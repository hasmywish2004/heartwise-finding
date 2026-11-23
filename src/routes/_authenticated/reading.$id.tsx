import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell, DnaStrip, Icon } from "@/components/kit";
import { ANALYSE, clearWebhookFailed, fireWebhook, INTAKE, supabase, webhookFailed, type Upload } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/reading/$id")({
  head: () => ({ meta: [{ title: "Reading your file — Genome Intelligence" }, { name: "description", content: "We are reading your file." }] }),
  component: Reading,
});

const STEPS = ["Opened your file", "Kept 3 spots, set aside the rest", "Checked what labs say", "Checked South Asian data", "Wrote your findings"];
const LIMIT = 180;

function Reading() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [secs, setSecs] = useState(0);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const t = setInterval(() => setSecs(Math.floor((Date.now() - startRef.current) / 1000)), 200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    async function poll() {
      if (webhookFailed(id)) setUnreachable(true);
      const { data } = await supabase.from("uploads").select("*").eq("id", id).maybeSingle();
      if (!alive || !data) return;
      setUpload(data as Upload);
      if (data.status === "done") navigate({ to: "/findings/$id", params: { id }, replace: true });
      else if (data.status === "awaiting_confirmation") navigate({ to: "/confirm/$id", params: { id }, replace: true });
      else if (data.status === "refused") navigate({ to: "/refused/$id", params: { id }, replace: true });
    }
    poll();
    const t = setInterval(poll, 2000);
    return () => { alive = false; clearInterval(t); };
  }, [id, navigate]);

  const step = Math.min(STEPS.length - 1, Math.floor((Date.now() - startRef.current) / 1400));
  const slow = secs >= LIMIT;

  function retry() {
    clearWebhookFailed(id);
    setUnreachable(false);
    fireWebhook(upload?.path === "B" ? ANALYSE : INTAKE, id);
    startRef.current = Date.now();
    setSecs(0);
  }

  return (
    <AppShell>
      <h1 className="t-title fade-up">Reading your file</h1>
      {upload && <p className="mt-1 truncate text-muted-foreground">{upload.filename}</p>}

      <div className="card fade-up mt-6 overflow-hidden p-5 md:p-7">
        <DnaStrip rows={5} fade />
      </div>

      <div className="card fade-up mt-4 p-5 md:p-7">
        <div className="flex items-baseline justify-between">
          <p className="t-small text-muted-foreground">Time so far</p>
          <p className="num text-3xl font-extrabold text-ink">{secs}<span className="ml-1 text-base font-semibold text-muted-foreground">s</span></p>
        </div>
        <ol className="mt-5 space-y-3">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={s} className={`flex items-center gap-3 transition-opacity ${i > step ? "opacity-40" : ""}`}>
                <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${done ? "bg-strong-tile text-primary-foreground" : active ? "bg-tint text-primary" : "bg-background text-muted-foreground"}`}>
                  {done ? <Icon.Tick size={16} strokeWidth={2.8} /> : active ? <span className="pulse-dot" /> : <span className="num t-small">{i + 1}</span>}
                </span>
                <span className={done || active ? "text-ink" : ""}>{s}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {unreachable && (
        <div role="alert" className="card mt-4 flex flex-col gap-3 border-amber p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <Icon.Alert size={20} className="mt-0.5 shrink-0 text-amber" />
            <div>
              <p className="font-semibold text-ink">We couldn't reach the analysis service</p>
              <p className="mt-1 t-small text-muted-foreground">Your file was saved and nothing was lost — please try again in a moment.</p>
            </div>
          </div>
          <button type="button" onClick={retry} className="btn btn-secondary shrink-0">Try again</button>
        </div>
      )}
      {slow && !unreachable && (
        <div className="card mt-4 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-ink">This is taking longer than usual</p>
          <button type="button" onClick={retry} className="btn btn-secondary">Try again</button>
        </div>
      )}
    </AppShell>
  );
}
