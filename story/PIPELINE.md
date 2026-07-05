# Clinical Story Mode — Production Pipeline

A repeatable method for turning a finished clinical teaching article into an interactive, scroll-driven case that plays out on a live patient monitor.

This document is the map. [`_template.html`](./_template.html) is the starting point. The three shipped pieces are the worked examples:

| # | Piece | Slug | Signature move |
|---|-------|------|----------------|
| 1 | Bay 4 Is Bleeding (Acute GI hemorrhage) | [`gi-bleed/`](./gi-bleed/) | Vitals slide into Class III/IV shock; 4-channel monitor |
| 2 | At the Threshold (Hyperkalemia) | [`hyperkalemia/`](./hyperkalemia/) | The ECG **morphs with serum K⁺** (peaked-T → wide-QRS → sine) |
| 3 | Sink or Swim (Your first code blue) | [`first-code-blue/`](./first-code-blue/) | The monitor tracks **the provider**, not the patient |

---

## 1. The idea

A scholarly article teaches you *what to know*. It cannot show you what it feels like to recognize it at the bedside — the vitals moving, the waveform bending, the decisions landing in sequence under time pressure. Story Mode closes that gap.

The whole design rests on **two registers on one screen**:

- **The monitor** — cold, technical, mono type, a live canvas ECG and numeric vitals. The machine's view.
- **The chart paper** — warm, human, serif prose in a cream panel. The bedside story.

As the reader scrolls the case, the monitor *responds*: heart rate climbs, pressure drops, the waveform changes, the bezel flashes red on a crash. The didactic content surfaces in "decode" cards exactly at the story moment it bites — and **nothing is softened**; every clinical fact is lifted straight from the source article. The article is not rewritten. It is *staged*.

---

## 2. Design system

Self-contained in every file — no external fonts, scripts, or assets (works offline, drops on any static host, and can't break from a CDN change).

**Palette** (CSS custom properties, top of every file):

- Shared, keep constant: monitor black `#0B1014`, bezel `#141C22`, hairline `#26333B`, chart paper `#F2ECE1`, ink `#1A1714`, slate `#8A9BA5`.
- Semantic states, keep constant: stable `--green #35E08A`, caution `--amber #F5B544`, critical `--crimson #E23B4E`.
- **`--accent` — pick ONE per topic.** This is the only palette decision per piece. It keeps the series coherent while giving each entry its own identity. GI bleed = crimson (blood). Hyperkalemia = electric blue `#38BDF8`. Code blue = teal `#43D9C4` (breath/parasympathetic) + amber for reverence.

**Type** — the pairing *is* the concept: a **monospace** stack for the machine (vitals, timestamps, labels — uppercase, letter-spaced) and a **Georgia/Palatino serif** stack for the human (narrative, headings). System-font stacks only; no webfonts.

**Sound the accent in one place; keep everything around it quiet.** Spend boldness on the signature interaction, not on decoration.

---

## 3. Anatomy of a piece

```
<head>            full skeleton + OG/Twitter meta (so the shared link unfurls)
<div .monitor>    sticky bar: canvas ECG + 3 vital tiles + clock/status
<header .hero>    eyebrow · title-with-emphasis · one-line hook · byline
<main>
  <section .beat> ×6–9   the story, told in moments
<div .outro>      the closing thesis + what this format adds
<footer>          understated credit + plain educational disclaimer
```

**The beat is the unit of the whole thing.** Each `<section class="beat">` carries the patient's numbers *at that moment* as `data-*` attributes:

```html
<section class="beat" data-a="118" data-b="92/70" data-c="94" data-state="critical" data-clock="00:12">
```

Scrolling a beat to mid-viewport (via `IntersectionObserver`) sets those as the monitor's targets; a `requestAnimationFrame` loop **lerps** the displayed numbers toward them so the monitor eases rather than jumps. `data-state="critical"` flashes the bezel and any tile marked `.critical` (real monitors flash — IEC 60601-1-8).

Inside a beat: a `.story` cream panel (narrative prose; first beat gets a `.drop` drop-cap), then usually a `.decode` card (the clinical content) and/or one interactive module.

---

## 4. The reusable engine

Everything above the "interactive modules" line in [`_template.html`](./_template.html) is fixed infrastructure you shouldn't need to touch:

- **Vitals model** — `IntersectionObserver` (`rootMargin: -45% 0 -45%`) → per-beat targets → rAF lerp. Numeric tiles ease; string tiles (like `"92/70"`) show verbatim.
- **Canvas ECG** — a scrolling PQRST buffer whose beat spacing is driven by the live HR. One `ecgAt(phase)` function returns the waveform; the trace recolors green/amber/crimson by state.
- **Reduced motion** — honored throughout; the trace renders one static frame, alarms don't flash.

### Morphing the waveform (advanced)

The hyperkalemia piece's signature move: make the ECG *shape* a function of a clinical value, not just its rate. Define morphological archetypes as functions of cycle phase and crossfade between them by the value:

```js
// anchors: value -> waveform archetype
var anchors = [ {k:5.2,f:wNormal}, {k:6.2,f:wPeaked}, {k:7.6,f:wWide}, {k:8.8,f:wSine} ];
function ecgAt(p, k) {                     // p = phase 0..1, k = the clinical value
  if (k <= anchors[0].k) return anchors[0].f(p);
  if (k >= anchors[anchors.length-1].k) return anchors[anchors.length-1].f(p);
  for (var i=0; i<anchors.length-1; i++) {
    var a=anchors[i], b=anchors[i+1];
    if (k>=a.k && k<=b.k) { var t=(k-a.k)/(b.k-a.k); return a.f(p)*(1-t)+b.f(p)*t; }
  }
}
```

Drive `k` from a per-beat `data-*` and/or a user slider. Full implementation: [`hyperkalemia/index.html`](./hyperkalemia/index.html).

---

## 5. Interactive modules

Pick one or two per piece — enough to make the reader *do* something at the moment it matters, not so many it becomes a gadget reel. Each has a reference implementation in a shipped page you can copy from:

| Module | What it does | Reference |
|--------|--------------|-----------|
| **Decode card** | Surfaces the clinical content at the story beat | every page |
| **Decision fork** | Two choices, teaching payoff on *both* — the reader commits before the answer | `gi-bleed`, `hyperkalemia` |
| **Parameter slider** | Reader drags a clinical value; a diagram (often the morphing ECG) responds live | `hyperkalemia` (K⁺ → ECG) |
| **Classifier** | Tap items to sort them into the correct buckets (mental model made physical) | `hyperkalemia` (protect / shift / remove) |
| **Breathing pacer** | A 4-4-4 box-breathing guide that eases the *provider's* HR down on screen | `first-code-blue` |
| **Role picker** | Tap to expand one of N roles / options | `first-code-blue` (pit-crew roles) |
| **Closed-loop / sequence** | Reveals a call-and-response or ordered protocol step by step | `first-code-blue` (closed-loop comms) |

Design rule for a fork or classifier: **the wrong answer must teach too.** The payoff explains why the reflex is wrong, not just that it is.

---

## 6. Two variants of the monitor

- **Patient monitor** (default) — the vitals are the patient's. Used for clinical-management cases (GI bleed, hyperkalemia).
- **Provider monitor** — the vitals are *the reader's own*. Used for reflective / experiential pieces where the lesson is about the clinician's state, not the patient's management (the code-blue piece: "the first pulse you check is your own"). The breathing pacer pairs with this variant to literally settle the on-screen heart rate.

Choose the variant from what the article is actually about. If it teaches management, track the patient. If it teaches experience, track the provider.

---

## 7. Editorial & fidelity rules

These are non-negotiable — they're what make it education rather than theatre:

1. **Nothing clinical is softened.** Every dose, threshold, score, and sequence traces to the source article.
2. **Operational realism.** Get the care-team roles and the patient's baseline right — who writes orders vs. who performs them; a chronic dialysis patient already has access; etc. Reviewed for this, not just for drug facts.
3. **No unearned claims.** The articles are **self-published / open-access**, *built from* peer-reviewed literature — never described as "peer-reviewed" themselves.
4. **Understated voice.** Substance over flash in the copy; the interaction carries the drama, the prose stays honest.
5. **Fictional patients.** Every case carries a plain educational disclaimer; patients are fictional.

---

## 8. Build → verify → deploy

1. **Copy** `_template.html` → `story/<slug>/index.html`. Pick the `--accent`, name the vital tiles, write the beats from the source article.
2. **Add** one or two interactive modules from § 5.
3. **Verify in a real browser** — not just a glance. Serve the folder (`python -m http.server`) and check: no console errors, the monitor tracks across every beat, the alarm fires on the crash beat, each interactive works, and it reflows on mobile.
4. **Commit** and push. The site auto-deploys (Netlify) at `/(story)/<slug>/`.
5. **Surface it** — add a launch link to the "Clinical Story Mode" card on the portfolio landing page, and (optionally) redirect any older path.

### New-piece checklist

- [ ] `--accent` chosen; distinct from siblings
- [ ] Title with one emphasized word; one-line hook; byline
- [ ] 6–9 beats; numbers change across them; a `critical` crash beat
- [ ] Monitor variant chosen (patient vs. provider) to match the article
- [ ] 1–2 interactive modules; wrong answers teach
- [ ] Every clinical fact traced to the source article
- [ ] OG/Twitter meta filled; link-preview checked
- [ ] Browser-verified: no console errors, tracks on scroll, alarm fires, mobile reflows
- [ ] Educational disclaimer present; patient fictional

---

*Clinical Story Mode is a presentation format for clinical education content. It consumes finished, evidence-cited articles and re-stages them; it is independent of any specific content-generation tooling.*
