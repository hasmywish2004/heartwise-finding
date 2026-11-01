import { createFileRoute, Link } from "@tanstack/react-router";
import { DnaStrip, FadeUp, Icon, LabelTile, Logo, Wave } from "@/components/kit";
import type { LabelKey } from "@/lib/genome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Genome Intelligence — Fewer answers. More honest ones." },
      { name: "description", content: "Upload your DNA file or a lab report. See what supports and what argues against a few heart-health findings." },
      { property: "og:title", content: "Genome Intelligence for Heart Health" },
      { property: "og:description", content: "Fewer answers. More honest ones. Heart-health findings with the evidence for and against." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  { t: "Upload one file", d: "A raw DNA file from 23andMe, AncestryDNA or MyHeritage — or a PDF or photo of your lab report.", I: Icon.FileUp },
  { t: "We check only what we can back up", d: "From thousands of spots, we keep the few on a list we fixed in advance. We ignore the rest on purpose.", I: Icon.Checklist },
  { t: "You decide what to believe", d: "Each finding shows the evidence for and against it. If it doesn't convince you, tap \u201cI don't believe this\u201d.", I: Icon.Sliders },
];

const LABELS: { k: LabelKey; t: string; d: string }[] = [
  { k: "strong", t: "Strong evidence", d: "Several labs agree, and they checked in the last five years." },
  { k: "contested", t: "Experts disagree", d: "Labs looked at it and came to different answers." },
  { k: "weak", t: "Weak evidence", d: "Only one lab looked, or the check is old." },
  { k: "refused", t: "Can't say", d: "Not enough evidence, so we make no claim at all." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="container-app flex h-20 items-center justify-between">
        <Logo />
        <Link to="/auth" className="btn btn-ghost">Log in</Link>
      </header>

      <section className="relative overflow-hidden pb-16 md:pb-56">
        <div className="container-app relative z-[1] grid items-center gap-10 pt-6 md:grid-cols-[1.1fr_1fr] md:pt-14">
          <div>
            <FadeUp>
              <span className="chip chip-blue"><span className="pulse-dot" />Made with South Asian DNA in mind</span>
            </FadeUp>
            <FadeUp i={1}>
              <h1 className="t-hero mt-5">Fewer answers.<br /><span className="text-primary">More honest ones.</span></h1>
            </FadeUp>
            <FadeUp i={2}>
              <p className="mt-5 max-w-xl text-[17px] md:text-lg">
                Upload your DNA file or a lab report. We look at a few heart-health spots, show you what supports and what argues against each one — and say "we can't tell" when the evidence is thin.
              </p>
            </FadeUp>
            <FadeUp i={3} className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/auth" className="btn btn-primary">Check my DNA <Icon.Arrow size={18} /></Link>
              <a href="#how" className="btn btn-secondary">See how it works</a>
            </FadeUp>
            <FadeUp i={4}>
              <ul className="mt-7 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-5">
                {["Not a diagnosis", "Every claim links to its source", "Your file stays private"].map((t) => (
                  <li key={t} className="flex items-center gap-2 t-small text-ink">
                    <span className="text-strong-tile"><Icon.Tick size={18} strokeWidth={2.6} /></span>{t}
                  </li>
                ))}
              </ul>
            </FadeUp>
          </div>
          <FadeUp i={2} className="card overflow-hidden p-5 md:p-7">
            <DnaStrip rows={7} />
          </FadeUp>
        </div>
        <Wave />
      </section>

      <section id="how" className="container-app py-16 md:py-20">
        <p className="t-eyebrow">How it works</p>
        <h2 className="t-title mt-2">Three steps. No jargon.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <FadeUp key={s.t} i={i} className="card card-lift flex flex-col p-6">
              <span className="num text-[15px] font-bold text-primary">0{i + 1}</span>
              <h3 className="t-card mt-2">{s.t}</h3>
              <p className="mt-2 flex-1">{s.d}</p>
              <span className="mt-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-tint text-primary"><s.I size={24} /></span>
            </FadeUp>
          ))}
        </div>
      </section>

      <section className="container-app pb-16 md:pb-24">
        <p className="t-eyebrow">The four labels</p>
        <h2 className="t-title mt-2">Every finding tells you how sure we are.</h2>
        <p className="mt-2 text-muted-foreground">Fixed rules choose the label. AI never does.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LABELS.map((l, i) => (
            <FadeUp key={l.k} i={i} className={`card card-lift p-6 ${l.k === "refused" ? "border-dashed border-cantsay-border" : ""}`}>
              <LabelTile label={l.k} />
              <h3 className="t-card mt-4">{l.t}</h3>
              <p className="mt-1">{l.d}</p>
            </FadeUp>
          ))}
        </div>
      </section>

      <section className="container-app pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-primary-foreground md:px-14 md:py-20">
          <div className="relative z-[1] max-w-xl">
            <h2 className="t-title !text-primary-foreground">See what your DNA can — and can't — tell you.</h2>
            <p className="mt-3 opacity-90">It takes about a minute. You can delete everything any time.</p>
            <Link to="/auth" className="btn btn-white mt-7">Check my DNA <Icon.Arrow size={18} /></Link>
          </div>
          <Wave white />
        </div>
      </section>

      <footer className="container-app border-t py-8 t-small text-muted-foreground">
        <p>For understanding, not diagnosis. It doesn't replace a doctor.</p>
        <p className="mt-1">Evidence from ClinVar and gnomAD · A 100xEngineers capstone</p>
      </footer>
    </div>
  );
}
