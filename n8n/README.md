# Workflows

Four n8n workflows. Import each into an n8n instance, attach a Supabase credential
and a Groq credential, and point the Supabase URLs at your own project.

Labels are decided by **rules, not by a model**. The language model writes the two
plain-English paragraphs on each card and is never allowed to set or change a label.
Remove the model and every judgement in this system is identical.

---

### `Genome - 1. Intake and Route.json` — 34 nodes

The front door. Takes an upload id, fetches the file from storage, and reads its
**first bytes** to decide what it is. The user never picks a path; a PDF renamed to
`.txt` still goes to Path B, because the bytes say `%PDF`.

- **Path A** — raw DNA file (`.txt` or `.vcf`). Loads the frozen panel from the
  database, keeps only those positions, counts how many rows were read and
  discarded, saves them as confirmed observations, then calls workflow 2.
- **Path B** — PDF or photo of a lab report. Extracts the variant table, saves it
  with `user_confirmed = false`, and **stops**. Nothing is looked up until a human
  checks the reading against the paper report.
- **Path R** — refused. Zip, gzip, or anything that is not a DNA file or a report.
  The reason is written to the database and shown to the user.

A no-call in the DNA file (`--`, `00`, or anything that is not A/C/G/T) is treated as
*missing*, never as zero copies of the variant. That distinction is the difference
between "we did not measure this" and "you do not have this."

---

### `Genome - 2. Analyse.json` — 24 nodes

Turns observations into finished cards.

1. **The gate.** Stops unless `user_confirmed` is true.
2. **Lookup.** Queries ClinVar, then picks the *one* record that is exactly this
   change — matching rsID *and* ref/alt letters, or gene *and* HGVS. Haplotype
   records covering more than one change are skipped. If nothing matches exactly,
   the finding is refused rather than approximated.
3. **Population.** Asks gnomAD v4 for the South Asian allele frequency. If gnomAD
   has no record, the card says so instead of substituting a European figure.
4. **Cache.** Every answer is stored, so a failed live lookup can serve a stale
   answer *labelled as stale* rather than guessing.
5. **Labels.** Plain arithmetic on submission count, agreement, and review date.
6. **Writing.** Groq writes two paragraphs from a fixed fact list. The output is then
   **checked for numbers that do not appear in the facts** — if the model invents a
   figure, the card falls back to rule-generated text and `rule_trace` records why.

`Clear Old Findings` runs before `Build Variant Keys`, not in parallel with it.
n8n's v1 execution order runs "parallel" branches sequentially in connection order,
so the original layout deleted findings a few hundred milliseconds *after* they were
written. Re-analysing an upload produced an empty result. The chain is serialized on
purpose; do not reorder it.

---

### `Genome - 3. Recheck Findings.json` — 9 nodes

Runs nightly. A finding is not a permanent snapshot — ClinVar changes its mind.

Re-queries each stored finding, and if the classification has moved, sets
`is_stale = true` and keeps the old value in `previous_classification` so the app can
show *"this said X when you ran it, it now says Y."* One finding at a time, rate
limited to stay inside NCBI's limits.

---

### `Genome - 0. Test Harness.json` — 5 nodes, disabled

Pushes a file straight into storage without the front end, so the pipeline can be
tested without clicking through the app. Not part of the product. Kept because the
tests are part of the work.

---

## Note on the webhook paths

The webhook paths are visible in these files, and the Intake and Analyse webhooks
accept any origin. That is only safe because the n8n instance address is **not** in
this repository and must not be added to it.
