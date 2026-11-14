# Heartwise — Genome Intelligence for Heart Health

Reads a raw DNA file or a lab report and returns **two to five heart-health findings you can argue with**, instead of a long report you have to believe.

**Live:** <https://heartwise-finding.lovable.app> · **Demo video:** `<add link>` · **Write-up:** `<add link>`

> This is not a diagnosis and does not replace a doctor. It is built for understanding.

---

## The problem this is answering

A consumer DNA file holds millions of variants. The public databases that say what those variants mean often disagree with each other. A large share of ClinVar's records are filed as "uncertain significance", and many more carry submissions from different labs that contradict each other. Rather than quote a figure that will be out of date by the time you read this, here is the query — [count them yourself](https://www.ncbi.nlm.nih.gov/clinvar/?term=%22uncertain+significance%22%5BCLIN%5D). Most of the research behind risk scores was also done on people of European ancestry, so it fits a South Asian user less well.

A ranked list of fifty findings hides all of that and makes it look settled.

This tool does the opposite. It narrows millions of variants down to a handful it can defend, labels each one honestly, and says **"we can't tell you"** for the rest.

### The four labels

| Label | Means |
|---|---|
| **Strong** | Well replicated, multiple independent submitters, no serious contradiction |
| **Experts disagree** | Submitting labs contradict each other. Shown as a finding anyway, with both sides |
| **Weak** | Thin evidence, or the effect direction is not agreed on |
| **Can't say** | The tool cannot check this. Shown deliberately, not hidden |

Every card shows what supports it, what disputes it, how old the evidence is, which population it was measured in, and links to the original sources.

---

## The one it refuses on purpose

The **MYBPC3 25bp deletion** is the single variant a South Asian user would most want checked. A screen of 6,273 individuals across 107 Indian populations found 287 carriers — **4.6%**, ranging from about 2% to 8% depending on the population — and carriers were markedly over-represented among cardiomyopathy cases (10.1% of 800 cases vs 1.7% of 699 controls).<sup>[1]</sup>

It is not in this tool's panel and cannot be. It is a 25-base-pair deletion in intron 32 of MYBPC3, on chromosome 11, and consumer genotyping arrays do not report that class of variant at all.

So the tool shows a standing **Can't say** card and states that plainly, rather than quietly omitting it. The most useful thing this tool does for its intended user is tell them what it cannot do.

<sub>[1] Dhandapany PS et al. *A common MYBPC3 (cardiac myosin binding protein C) variant associated with cardiomyopathies in South Asia.* Nature Genetics 41, 187–191 (2009). [PMC2697598](https://pmc.ncbi.nlm.nih.gov/articles/PMC2697598/)</sub>

---

## Architecture

```
Browser (React + TanStack Router)
      │  publishable key — RLS enforced
      ▼
Supabase ──────────────────────────────┐
  Postgres · Auth · Storage            │ service_role
  6 tables, RLS on every one           │ bypasses RLS
      ▲                                ▼
      └──────────────────────  n8n workflows
                                 1. Intake   — read file, detect type, route A/B/R
                                 2. Analyse  — ClinVar + gnomAD lookup, build cards
                                 3. Recheck  — nightly, flags findings that drifted
                                 0. Harness  — regression tests (disabled)
```

**Why the panel is frozen.** The variants this tool looks at were chosen and committed to the database *before any real file was analysed*, each with a written `why_in_panel` justification. The scope cannot be quietly widened to fit a nice-looking result. One variant (LDLR rs6511720) was included specifically because it is weak — published sources disagree on which allele is protective — so the "weak" label has something real to attach to.

**Why findings are read-only to the browser.** Only n8n writes to `findings`. The RLS policies give the browser `select` and nothing else. A user cannot talk themselves into a better result.

**Why there is a confirmation step.** Lab-report uploads go through an extraction the user must confirm or correct before anything is looked up. The tool shows what it thinks it read and asks. Nothing downstream runs until `user_confirmed` is true.

---

## Repo layout

```
src/                         React app (routes, components, Supabase client)
supabase/schema.sql          Full schema — tables, RLS, trigger, storage, panel seed
n8n/                         Workflow exports (JSON)
docs/original-build-prompt.md  The single prompt that produced the first build
```

---

## Running it

```bash
bun install
bun run dev
```

The backend is a hosted Supabase project; the client config is in `src/lib/supabase.ts`. To stand up your own, run `supabase/schema.sql` against a fresh project, then import the workflows in `n8n/` and point them at your project URL.

---

## Is it reproducible?

The same lab report was run **three times, across twelve days, under three separate accounts**.

All three produced identical labels *and* identical evidence counts — 42, 2, 26, 19. The output is a function of the input and the databases, not of when you happened to run it or who you were logged in as.

---

## A note on the webhook URLs

`src/lib/supabase.ts` contains the n8n webhook addresses, and the publishable
Supabase key. Both are visible to anyone who opens the deployed app and looks at the
network tab — a browser cannot call an endpoint whose address it does not hold. They
are in this repository for the same reason they are in the shipped JavaScript, not by
oversight.

What that exposure is worth to an attacker:

- **The data is not reachable.** The intake webhook takes an `upload_id` and looks it
  up. Without a real one — a UUID nobody can guess — the run fails before any file is
  fetched. Row-level security governs every table independently of this.
- **The publishable key is meant to be public.** It is scoped by RLS. The service
  role key, which is not, lives in n8n's credential store and is not in this
  repository.
- **The real cost is quota.** Someone could send junk requests and consume n8n
  executions. Annoying, not dangerous.

Closing this properly means moving the webhook call behind a server the browser
cannot speak for — an edge function holding a secret the client never sees. That is a
backend this project does not have, and adding one to say so would be a worse trade
than writing it down.

---

## Known limits

- **The hosted link sleeps.** Supabase free tier pauses a project after about a week idle. A nightly workflow was added partly to prevent this and demonstrably did not — the schedule fired successfully for six consecutive nights and the project still paused. If the live link is dead, message me and I'll wake it.
- **Ancestry.** Allele frequencies are reported per population where gnomAD has them. Where there is no South Asian cohort, the tool says so instead of substituting the European figure.
- **Panel size.** Three variants. Deliberately. Three findings that can be defended are worth more than fifty that cannot.
- **Evidence drift.** A finding is not a permanent snapshot. The recheck workflow re-queries ClinVar nightly and flags a finding as stale, keeping the previous classification, if the database has changed its mind.

---

## Measurement

The thing being measured is not accuracy. It is **how many findings a real user pushes back on** — tracked in the `rejections` table, written whenever someone taps *"I don't believe this."*

A user who challenges a finding has understood it. That is the goal.

---

Built for the 100xEngineers Cohort 7 capstone.
