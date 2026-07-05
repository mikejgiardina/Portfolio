# Clinical Story Mode

Interactive, scroll-driven clinical cases. Each one takes a finished clinical teaching article and re-stages it as a real-time patient case that plays out on a live monitor — heart rate climbs, the ECG bends with the pathology, the bezel flashes on a crash — with the clinical reasoning surfacing exactly when the case reaches it.

The premise: a scholarly article teaches you *what to know*; this shows you what it feels like to know it at the bedside. Every clinical fact is lifted straight from the source article — nothing softened, only staged.

## The pieces

| Piece | Case | What's distinct |
|-------|------|-----------------|
| [**Bay 4 Is Bleeding**](./gi-bleed/) | Acute GI hemorrhage → shock → endoscopy | Vitals slide into hemorrhagic shock in real time |
| [**At the Threshold**](./hyperkalemia/) | Hyperkalemia in a dialysis patient | The ECG **morphs with the potassium** — peaked-T → wide-QRS → sine wave |
| [**Sink or Swim**](./first-code-blue/) | Your first code blue | The monitor tracks **you**, not the patient — with a breathing pacer that settles your heart rate |

## Building another

- **Method:** [`PIPELINE.md`](./PIPELINE.md) — the full production pipeline: design system, the beat structure, the reusable monitor engine, the interactive-module catalog, editorial/fidelity rules, and the build-verify-deploy workflow.
- **Start here:** [`_template.html`](./_template.html) — a working scaffold. Copy it to `story/<slug>/index.html` and fill in the marked sections.

## How they're built

Each piece is a single self-contained `index.html` — no frameworks, no external fonts or scripts, no build step. All CSS, JavaScript, and the canvas monitor are inline, so a file works offline and drops onto any static host. Verified in-browser before every deploy.
