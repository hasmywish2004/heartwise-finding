import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell, Icon } from "@/components/kit";
import { fireWebhook, INTAKE, supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({ meta: [{ title: "Upload a file — Genome Intelligence" }, { name: "description", content: "Upload a raw DNA file or a lab report." }] }),
  component: UploadPage,
});

const ACCEPT = [".txt", ".csv", ".vcf", ".pdf", ".jpg", ".jpeg", ".png"];
const MAX = 60 * 1024 * 1024;
const AGREE = [
  "I am 18 or older.",
  "I understand this is for learning, not medical advice.",
  "This is my own DNA, or I have permission to upload it.",
];

function UploadPage() {
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [ticks, setTicks] = useState([false, false, false]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function pick(f: File | undefined) {
    setError("");
    if (!f) return;
    const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
    if (!ACCEPT.includes(ext)) return setError("We can read .txt, .csv, .vcf, .pdf, .jpg or .png files.");
    if (f.size > MAX) return setError("This file is bigger than 60 MB.");
    setFile(f);
  }

  async function start() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { data: u } = await supabase.auth.getUser();
      const user = u.user!;
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const up = await supabase.storage.from("dna-uploads").upload(path, file);
      if (up.error) throw up.error;
      const { data, error } = await supabase.from("uploads").insert({ filename: file.name, storage_path: path, user_id: user.id, status: "received" }).select().single();
      if (error) throw error;
      fireWebhook(INTAKE, data.id);
      navigate({ to: "/reading/$id", params: { id: data.id } });
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    }
  }

  const ready = !!file && ticks.every(Boolean) && !busy;

  return (
    <AppShell>
      <h1 className="t-title fade-up">Upload a file</h1>
      <p className="mt-2 fade-up text-muted-foreground">A raw DNA file or a lab report. We work out which it is.</p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
        className={`fade-up mt-6 rounded-3xl border-2 border-dashed p-8 text-center transition md:p-12 ${drag ? "border-primary bg-tint" : "border-tint-border bg-card"}`}
      >
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-tint text-primary"><Icon.FileUp size={28} /></span>
        {file ? (
          <p className="t-card mt-4 break-all">{file.name}</p>
        ) : (
          <p className="t-card mt-4">Drop your file here</p>
        )}
        <p className="t-small mt-1 text-muted-foreground">.txt .csv .vcf .pdf .jpg .png · up to 60 MB</p>
        <button type="button" onClick={() => input.current?.click()} className="btn btn-secondary mt-5">{file ? "Choose another file" : "Choose a file"}</button>
        <input ref={input} type="file" accept={ACCEPT.join(",")} className="sr-only" aria-label="Choose a file" onChange={(e) => pick(e.target.files?.[0])} />
      </div>

      <fieldset className="mt-6 space-y-2">
        <legend className="sr-only">Before we start</legend>
        {AGREE.map((t, i) => (
          <label key={t} className="card flex min-h-[52px] cursor-pointer items-center gap-3 px-4 py-3">
            <input type="checkbox" checked={ticks[i]} onChange={(e) => setTicks(ticks.map((v, j) => (j === i ? e.target.checked : v)))} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
            <span className="text-ink">{t}</span>
          </label>
        ))}
      </fieldset>

      {error && <p role="alert" className="mt-4 flex gap-2 rounded-xl bg-amber-bg p-3 t-small text-amber"><Icon.Alert size={18} className="mt-0.5 shrink-0" />{error}</p>}

      <button type="button" disabled={!ready} onClick={start} className="btn btn-primary mt-6 w-full">
        {busy ? "Uploading…" : "Start reading"}
      </button>
      <p className="mt-3 flex items-center justify-center gap-2 t-small text-muted-foreground"><Icon.Lock size={16} />Your file stays private</p>
    </AppShell>
  );
}
