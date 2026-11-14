# Heartwise Finding

Build "Genome Intelligence for Heart Health" — a mobile-first React app that reads a DNA file or a lab report and shows a few heart-health findings the user can challenge.

Build the WHOLE app in this one go: every page, the design system, the Supabase wiring and the n8n calls. Do not stop to ask questions — follow this spec exactly and make sensible choices for anything not stated.

=====================================================
1. CRITICAL BACKEND RULE — READ FIRST
=====================================================
Do NOT enable Lovable's own database/Supabase integration. Do NOT create a new Supabase project. Do NOT create any tables, edge functions or migrations. The backend already exists and is already filled with data.

Install `@supabase/supabase-js` and create ONE client in `src/lib/supabase.ts` with these exact hardcoded values:

  const SUPABASE_URL = "https://mnbafonstnhdybonknap.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Ac-nl9N2mV6mA0l2ZfayOg_aKgbEP-3";

This key is safe in the browser; row-level security is already configured so each signed-in user can only ever read their own rows.

Two n8n webhooks already exist and already allow browser calls:
  INTAKE  = "https://genomeai.app.n8n.cloud/webhook/genome-upload"    POST {"upload_id":"<uuid>"}
  ANALYSE = "https://genomeai.app.n8n.cloud/webhook/genome-analyse"   POST {"upload_id":"<uuid>"}

IMPORTANT: these webhooks take 20–60 seconds to respond. NEVER await/block the UI on their response. Fire the POST, attach `.catch(() => {})`, and immediately start polling the Supabase `uploads` row for its `status`. The status column is the single source of truth.

=====================================================
2. THE DATABASE (already exists — only read/write these)
=====================================================
uploads: id uuid, user_id uuid, filename text, storage_path text, detected_type text, path char(1) ('A'=raw DNA file, 'B'=lab report, 'R'=refused), status text ('received'|'processing'|'awaiting_confirmation'|'done'|'refused'), refusal_reason text, created_at timestamptz
observations: id, upload_id, source ('dna_file'|'lab_report'), gene, rsid, genotype, hgvs_c, hgvs_p, zygosity, lab_classification, genome_build, user_confirmed boolean, created_at
findings: id, upload_id, observation_id, label ('strong'|'contested'|'weak'|'refused'), headline text, supports text, disputes text, evidence_age text, population text, source_urls jsonb (array of url strings), rule_trace text, lookup_status text, sort_order int, created_at
rejections: id, finding_id, reason text, created_at
panel_variants: id, gene, rsid, chrom, pos, ref, alt, genome_build, why_in_panel, frozen_at  (public, read-only)
Storage bucket: "dna-uploads" (private, 60 MB limit)

=====================================================
3. AUTH
=====================================================
Supabase Auth, email + password only. No Google/social login. Protect every page except the landing page; unauthenticated visitors land on /. After login go to /reports. Persist the session. Show a clear error if sign-in fails. If signup returns a "confirm your email" state, show a friendly "Check your inbox to confirm, then log in" message.

=====================================================
4. ROUTES
=====================================================
/              Landing (public)
/auth          Sign up / Log in (one page, two tabs)
/reports       My reports (home after login)
/upload        Upload a file
/reading/:id   Reading your file (progress)
/confirm/:id   Check what we read (lab reports only)
/findings/:id  Your findings (list of cards)
/finding/:id   One finding in full
/refused/:id   We didn't read this file
/account       Account and privacy

=====================================================
5. THE FLOW (build exactly this)
=====================================================
UPLOAD (/upload)
 a. Drop zone + "Choose a file". Accept .txt .csv .vcf .pdf .jpg .png, max 60 MB. One shared upload box for every kind of file — the user NEVER picks a path; the backend decides from the file's bytes.
 b. Three checkboxes, all three must be ticked before "Start reading" is enabled: "I am 18 or older." / "I understand this is for learning, not medical advice." / "This is my own DNA, or I have permission to upload it."
 c. On submit:
    const path = `${user.id}/${Date.now()}_${file.name}`;
    await supabase.storage.from('dna-uploads').upload(path, file);
    const { data } = await supabase.from('uploads').insert({ filename: file.name, storage_path: path, user_id: user.id, status: 'received' }).select().single();
    fetch(INTAKE, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ upload_id: data.id }) }).catch(() => {});
    navigate(`/reading/${data.id}`);

READING (/reading/:id)
 Poll `uploads` every 2 seconds. Show an animated 5-step checklist that advances as time passes (purely visual, ~1.4s per step), a counting-up number, and a letter grid where most letters fade out and 3 stay highlighted (described in section 7).
 The 5 steps: "Opened your file" / "Kept 3 spots, set aside the rest" / "Checked what labs say" / "Checked South Asian data" / "Wrote your findings".
 When uploads.status becomes:
   'done'                   -> navigate to /findings/:id
   'awaiting_confirmation'  -> navigate to /confirm/:id
   'refused'                -> navigate to /refused/:id
 If 3 minutes pass with no change, show "This is taking longer than usual" and a Try again button.

CONFIRM (/confirm/:id) — lab reports only. THIS GATE IS THE MOST IMPORTANT SCREEN IN THE APP.
 Headline: "Does this match your report?" Sub-line: "An AI read the table in your report. Check each row against your paper copy. Nothing is looked up until you confirm."
 Load observations for this upload. Show each as a card: gene (big), hgvs_c, "One copy" when zygosity is heterozygous, and "Your lab says <lab_classification>". Translate the classification in plain words next to it: Pathogenic -> "it causes disease", Likely pathogenic -> "it probably causes disease", Risk factor -> "it may raise risk", Uncertain significance -> "nobody knows yet", Benign -> "harmless".
 Each card has a "Confirm" button that toggles to a green "Matches". Show a running "X of Y confirmed" count.
 The big bottom button "Everything matches — continue" is DISABLED until every row is confirmed. On click:
    await supabase.from('observations').update({ user_confirmed: true }).eq('upload_id', id);
    fetch(ANALYSE, {...same shape...}).catch(() => {});
    navigate(`/reading/${id}`);   // it polls again until status is 'done'
 Also show a small amber note: "One wrong letter would give you someone else's evidence."

FINDINGS (/findings/:id)
 Load findings for the upload, ordered by sort_order. Show three small stat tiles at the top: total rows of DNA read (if unknown just show the filename and date), the number of findings, and the APOE type if any headline contains "APOE type is <value>" (extract it with a regex; hide the tile if absent).
 Render one card per finding: the coloured label chip, the marker (extract the gene + rs number from the headline), the headline, and a row of 4 small bars showing how many evidence checks pass (derive from rule_trace — see section 6). A collapsible "What the labels mean" panel sits above the cards.
 Bottom note in a blue box: "If high cholesterol or early heart attacks run in your family, talk to a doctor — whatever these cards say."
 Tapping a card opens /finding/:id.

ONE FINDING (/finding/:id)
 Full card: label chip, marker, headline (big), then two sections — "What supports it" (green dot) showing `supports`, and "What argues against it" (amber dot) showing `disputes`. Then `evidence_age`, then an "In South Asians" block with the 100-dot picture (section 7) built from `population`, then "Check it yourself" — one button per URL in source_urls, opening in a new tab, labelled "ClinVar — what labs say" for ncbi.nlm.nih.gov links, "gnomAD — who has it" for gnomad links, and "The study" for anything else. A collapsed "How we chose this label" panel shows rule_trace in small grey text with the sentence: "Fixed rules picked this label. AI only helped write the sentences above, and they were checked against the facts."
 Bottom bar: "All findings" (secondary) and "I don't believe this" (outlined, strong).

"I DON'T BELIEVE THIS" — a bottom sheet on mobile, centred modal on desktop.
 Title: "Why don't you believe this?" Sub: "Your answer helps us test if this tool is honest. It won't change the finding."
 Five radio options: "The evidence looks too thin" / "It doesn't match what my doctor told me" / "The label seems wrong" / "I don't understand it" / "Something else".
 Optional textarea "Anything else?" placeholder "What made you doubt it?".
 Send -> supabase.from('rejections').insert({ finding_id, reason }) where reason is the chosen option plus the free text if given. Then close and show a toast "Thanks — we saved that."

REFUSED (/refused/:id)
 Big calm heading "We didn't read this file", the filename, and a grey box titled WHY showing uploads.refusal_reason verbatim. Then "What we can read": raw DNA files (.txt .csv .vcf) and lab reports (.pdf .jpg .png). Buttons: "Upload another file" and "Back to reports". This is NOT an error page — make it look deliberate and calm, never red or alarming.

REPORTS (/reports)
 Big "Upload a file" card at the top. Then a list of this user's uploads, newest first: filename, a plain-words type ("Raw DNA file" / "Lab report" / "Not read"), the date, and a status pill — "3 findings" (green) when done, "Check needed" (amber) when awaiting_confirmation, "Reading…" when processing/received, "Not read" (grey) when refused. Tapping a row goes to the right screen for its status.

ACCOUNT (/account)
 Name/email, counts of files uploaded, findings saved and findings questioned, a short "About" paragraph, Log out, and a "Delete my account and all data" button that asks for confirmation then deletes the user's uploads (cascade removes the rest) and signs out.

=====================================================
6. DERIVING THE 4 EVIDENCE CHECKS
=====================================================
rule_trace looks like: "review=criteria provided, multiple submitters, no conflicts; submissions=3; year=2025; age=1y; variant_copies=1; gnomAD v4 sas checked"
Parse it in a small helper and return four booleans:
  1 "Labs agree"              -> true unless rule_trace contains "conflicting"
  2 "Checked in the last 5 years" -> true if it contains "age=" with a number <= 5, or year >= 2021
  3 "<N> lab reports"         -> true if submissions=N and N >= 2 (label shows the real N)
  4 "South Asian data"        -> true if it contains "sas checked"
Show a tick (green) or cross (amber) per check, and "X of 4 evidence checks pass". If rule_trace is missing or the label is 'refused', hide the checks entirely.

=====================================================
7. THE SIGNATURE VISUALS (keep these — they are the personality)
=====================================================
All animation is plain CSS. Do NOT install three.js, particles.js, framer-motion, lottie, GSAP or any animation/3D library. Wrap everything in `@media (prefers-reduced-motion: reduce) { *{ animation:none !important; transition:none !important } }`.

A. DNA LETTER STRIP (landing + reading): rows of A/C/G/T in a monospace-ish grid. Rows drift sideways with a CSS keyframe translating from 0 to -50% on a doubled string (alternate rows reverse direction, 30–52s). 3 letters are highlighted in a blue rounded box with a soft pulsing glow. A 2px vertical blue line sweeps left to right across the strip every 5s.

B. THE WAVE — paste this EXACT SVG, do not invent your own and do not use a canvas/particle effect. It sits at the bottom of the landing hero, absolutely positioned, pointer-events none, behind the text (z-index 0, content z-index 1), and is hidden below 768px. The whole SVG slides with `transform: translateX(-50%)` over 48s linear infinite (70s for the white one):

<svg width="2880" height="240" viewBox="0 0 2880 240">
  <g fill="none" stroke="#1E4FBF" stroke-linecap="round">
    <path d="M-636 125 Q-456 35 -276 125 T84 125 T444 125 T804 125 T1164 125 T1524 125 T1884 125 T2244 125 T2604 125 T2964 125 T3324 125" stroke-opacity="0.05" stroke-width="18"></path>
  </g>
  <g fill="none" stroke="#1E4FBF" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="0 9">
    <path d="M-720 110 Q-540 50 -360 110 T0 110 T360 110 T720 110 T1080 110 T1440 110 T1800 110 T2160 110 T2520 110 T2880 110 T3240 110" stroke-opacity="0.14"></path>
    <path d="M-692 115 Q-512 45 -332 115 T28 115 T388 115 T748 115 T1108 115 T1468 115 T1828 115 T2188 115 T2548 115 T2908 115 T3268 115" stroke-opacity="0.22"></path>
    <path d="M-664 120 Q-484 40 -304 120 T56 120 T416 120 T776 120 T1136 120 T1496 120 T1856 120 T2216 120 T2576 120 T2936 120 T3296 120" stroke-opacity="0.32"></path>
    <path d="M-636 125 Q-456 35 -276 125 T84 125 T444 125 T804 125 T1164 125 T1524 125 T1884 125 T2244 125 T2604 125 T2964 125 T3324 125" stroke-opacity="0.4"></path>
    <path d="M-608 130 Q-428 30 -248 130 T112 130 T472 130 T832 130 T1192 130 T1552 130 T1912 130 T2272 130 T2632 130 T2992 130 T3352 130" stroke-opacity="0.32"></path>
    <path d="M-580 135 Q-400 25 -220 135 T140 135 T500 135 T860 135 T1220 135 T1580 135 T1940 135 T2300 135 T2660 135 T3020 135 T3380 135" stroke-opacity="0.22"></path>
    <path d="M-552 140 Q-372 20 -192 140 T168 140 T528 140 T888 140 T1248 140 T1608 140 T1968 140 T2328 140 T2688 140 T3048 140 T3408 140" stroke-opacity="0.14"></path>
  </g>
</svg>

Use the same SVG again inside the blue "Check my DNA" call-to-action band at the bottom of the landing page, but with stroke="#FFFFFF" and opacities 0.18/0.28/0.36/0.28/0.18 (drop to 5 paths, no halo path).

C. 100-DOT PICTURE (finding detail): a 20x5 grid of small circles. Read the first percentage in the `population` text with /(\d+(?:\.\d+)?)\s*%/ and fill round(pct) dots in blue (#1E4FBF); the rest are #DCE2EB. Each filled dot pops in with a 0.45s scale animation, staggered 0.06s. Caption underneath in plain words: "About N in every 100 copies of this gene in South Asians have this change." If no percentage is found, hide the grid and just show the `population` text.

D. Numbers count up from 0 over 1.8s with an ease-out curve. Content fades up 16px on mount, staggered 0.1s. Cards lift 3px on hover. Buttons lift 2px with a soft shadow on hover.

=====================================================
8. DESIGN SYSTEM — follow precisely
=====================================================
Light, calm, clinical. Never dark mode.
Colours:
  page #F5F7FA | card #FFFFFF | borders #E3E8EF | ink #0B1B33 | body text #33415C | muted #4A5872
  primary blue #1E4FBF (buttons, links, highlights) | tint #EAF0FD | tint border #C9D7F7
  Strong evidence: text #0E6B45, chip bg #E4F4EB, icon tile #0E8A5A
  Experts disagree: text #9A4A07, chip bg #FDF1E3, icon tile #C2610C
  Weak evidence: text #3730A3, chip bg #EEF0FD, icon tile #4F46E5
  Can't say: text #3F4A5C, white bg, 1px DASHED #8C96A8 border
Fonts (Google Fonts): Manrope 600/700/800 for all headings, big numbers and card titles; Inter 400/500/600 for everything else. Put `font-variant-numeric: tabular-nums` on numbers.
Type scale — desktop / mobile:
  hero 56/32 (Manrope 800, line-height 1.08, letter-spacing -0.025em)
  page title 36/28 (Manrope 800)
  section 24/20 (Manrope 700)
  card title 18/18 (Manrope 700)
  body 16-18/16 (Inter 400, line-height 1.6)
  small 14/14 (Inter 500)  <- NEVER go below 14px anywhere
Radii: cards 18-24px, buttons 12-14px, chips 999px. Shadows: very soft, e.g. 0 1px 2px rgba(11,27,51,.05) at rest.
Tap targets at least 44px tall. Mobile-first: everything must work at 390px wide with a 20px side gutter and no sideways scrolling. Desktop max content width 1240px.
Accessibility: real <button>, <a>, <input>+<label>; aria-label on icon-only buttons; every label is distinguished by WORD + ICON + COLOUR, never colour alone. Icons: inline stroke SVG only, NEVER emoji.

Label display names (use these exact words everywhere, never the raw database value):
  strong -> "Strong evidence" (tick icon)
  contested -> "Experts disagree" (two chevrons facing out: M8 7l-5 5 5 5 / M16 7l5 5-5 5)
  weak -> "Weak evidence" (minus icon)
  refused -> "Can't say" (circle with a slash)

=====================================================
9. LANDING PAGE COPY (use verbatim)
=====================================================
Logo mark: a rounded blue square with a white DNA double-helix stroke icon. Wordmark "Genome Intelligence" with "for heart health" underneath.
Pill above headline: "Made with South Asian DNA in mind" with a small pulsing blue dot.
Headline: "Fewer answers." then on a new line in blue: "More honest ones."
Sub: "Upload your DNA file or a lab report. We look at a few heart-health spots, show you what supports and what argues against each one — and say "we can't tell" when the evidence is thin."
Buttons: "Check my DNA" (primary) and "See how it works" (secondary).
Three ticks: "Not a diagnosis" / "Every claim links to its source" / "Your file stays private".
Section "HOW IT WORKS" / "Three steps. No jargon." with three numbered cards, each ending with a blue-tinted 48px icon tile:
  1 "Upload one file" — "A raw DNA file from 23andMe, AncestryDNA or MyHeritage — or a PDF or photo of your lab report." (file-with-up-arrow icon)
  2 "We check only what we can back up" — "From thousands of spots, we keep the few on a list we fixed in advance. We ignore the rest on purpose." (checklist icon)
  3 "You decide what to believe" — "Each finding shows the evidence for and against it. If it doesn't convince you, tap "I don't believe this"." (sliders icon)
Section "THE FOUR LABELS" / "Every finding tells you how sure we are." / "Fixed rules choose the label. AI never does." Four cards, each with a SOLID coloured 44px icon tile (white icon inside) and a soft shadow:
  "Strong evidence" — "Several labs agree, and they checked in the last five years."
  "Experts disagree" — "Labs looked at it and came to different answers."
  "Weak evidence" — "Only one lab looked, or the check is old."
  "Can't say" — "Not enough evidence, so we make no claim at all." (dashed border card)
Blue CTA band: "See what your DNA can — and can't — tell you." / "It takes about a minute. You can delete everything any time." / button "Check my DNA". White wave inside it.
Footer: "For understanding, not diagnosis. It doesn't replace a doctor." and "Evidence from ClinVar and gnomAD · A 100xEngineers capstone".

=====================================================
10. TONE OF EVERY WORD IN THE UI
=====================================================
Write for someone with no science background. Short sentences. Never use the words "variant", "allele", "zygosity", "pathogenic" or "heterozygous" in your own UI text (text coming out of the database is shown as-is). Say "a small spelling difference in your DNA", "you got it from one parent", "it causes disease". Keep each screen light — no long paragraphs, no filler, no invented statistics. Do not add any content that is not in this spec.

Build it all now.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://heartwise-finding.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b91947da-ef87-4cde-8c77-0e16bc01c7c2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
