#!/usr/bin/env python3
"""Generate the social cards every page needs, from one template.

Before this, exactly one page on the site had an `og:image`. Every link shared
anywhere else rendered as a bare card. These are deliberately one family --
same palette, same geometry, same typography -- so a run of them in a feed reads
as one site rather than a pile of unrelated posters.

`orchestration/` is excluded on purpose: it has a bespoke card (the squadron)
that this template should not overwrite.

Run:  python tools/make_og_cards.py          # write assets/og/*.png
      python tools/make_og_cards.py --check  # verify every card exists, exit 1 if not
"""
from __future__ import annotations

import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "og"
FONTS = Path("C:/Windows/Fonts")

W, H = 1200, 627
INK, MUT, DIM = "#F2F7FC", "#93A2B4", "#5E6C7E"
CY, GR, AM, RD = "#5BD8EA", "#7CE0A0", "#FFB03A", "#FF4D57"

# page dir -> (accent, kicker, title, line)
CARDS = {
    ".":               (CY, "PORTFOLIO", "Michael Giardina",
                        "Emergency nurse building clinical simulation and AI tooling."),
    "case-studies":    (CY, "ENGINEERING PRACTICE", "Five write-ups on the layer around the code",
                        "Automation, enforcement, disclosure control, orchestration, clinical evaluation."),
    "automation":      (GR, "01 · AUTOMATION", "The hook layer",
                        "Making the safe path the default one, on every machine."),
    "enforcement":     (GR, "02 · ENFORCEMENT", "Narrated → Enforced",
                        "Conventions that outlive whoever remembers them."),
    "publishing":      (AM, "03 · DISCLOSURE", "Publishing out of a patent-pending codebase",
                        "A staged pipeline between a draft and a public file."),
    "clinical-review": (RD, "04 · CLINICAL EVALUATION", "Two reviewers agreed. That was the problem.",
                        "Agreement is only evidence when the failure modes are independent."),
    "trauma-tracker":  (RD, "CLINICAL PRODUCT", "Trauma Tracker",
                        "A real-time ED trauma registrar. Synthetic data only, no PHI."),
    "story/gi-bleed":       (RD, "CLINICAL STORY MODE", "Bay 4 Is Bleeding",
                             "A GI hemorrhage in real time, with a live monitor."),
    "story/hyperkalemia":   (AM, "CLINICAL STORY MODE", "The Potassium Is 7.9",
                             "Hyperkalemia in real time, with a live monitor."),
    "story/first-code-blue": (CY, "CLINICAL STORY MODE", "Your First Code Blue",
                              "A cardiac arrest in real time, with a live monitor."),
}


def font(size, bold=False, mono=False):
    name = "consola.ttf" if mono else ("segoeuib.ttf" if bold else "segoeui.ttf")
    return ImageFont.truetype(str(FONTS / name), size)


def wrap(draw, text, fnt, maxw):
    words, lines, cur = text.split(), [], ""
    for w_ in words:
        t = (cur + " " + w_).strip()
        if draw.textbbox((0, 0), t, font=fnt)[2] <= maxw:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w_
    if cur:
        lines.append(cur)
    return lines


def card(accent, kicker, title, line, url):
    im = Image.new("RGB", (W, H), "#05070A")
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(int(5 + 16 * (1 - t)), int(7 + 22 * (1 - t)), int(10 + 34 * (1 - t))))

    # one motif for the whole family: a small chevron anchored bottom-right,
    # echoing the squadron card so the set reads as siblings. An earlier version
    # drew it oversized across the whole card -- it fought the type and washed
    # the background. Restraint is the point: this is a tint, not a subject.
    glow = Image.new("RGB", (W, H), "black")
    gd = ImageDraw.Draw(glow)
    cx, cy, s_ = W - 96, H - 132, 86
    pts = [(cx, cy), (cx - 2.0 * s_, cy - 1.05 * s_), (cx - 1.35 * s_, cy), (cx - 2.0 * s_, cy + 1.05 * s_)]
    gd.polygon(pts, fill=accent)
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    im = ImageChops.add(im, glow, scale=5.0)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(layer).polygon(pts, fill=tuple(int(accent[i:i+2], 16) for i in (1, 3, 5)) + (70,))
    im = Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")
    d = ImageDraw.Draw(im)

    L, maxw = 72, 760
    d.text((L, 92), "  ".join(kicker), font=font(16, mono=True), fill=accent)

    size = 62
    while size > 34:
        tf = font(size, bold=True)
        lines = wrap(d, title, tf, maxw)
        if len(lines) <= 2:
            break
        size -= 4
    tf = font(size, bold=True)
    lines = wrap(d, title, tf, maxw)
    y = 148
    for ln in lines:
        d.text((L, y), ln, font=tf, fill=INK)
        y += int(size * 1.16)

    y += 14
    lf = font(24)
    for ln in wrap(d, line, lf, maxw)[:2]:
        d.text((L, y), ln, font=lf, fill=MUT)
        y += 34

    d.line([(L, H - 96), (W - 340, H - 96)], fill="#1E2733", width=2)
    d.text((L, H - 70), url, font=font(19, mono=True), fill=INK)
    return im


def paths():
    for key, (a, k, t, l) in CARDS.items():
        slug = "home" if key == "." else key.replace("/", "-")
        url = "mike-giardina.netlify.app" + ("/" if key == "." else f"/{key}/")
        yield key, OUT / f"{slug}.png", (a, k, t, l, url)


def main() -> int:
    if "--check" in sys.argv:
        missing = [p.name for _, p, _ in paths() if not p.is_file()]
        if missing:
            print("MISSING social cards: " + ", ".join(missing))
            return 1
        print(f"all {len(CARDS)} generated cards present (plus the bespoke orchestration card)")
        return 0
    OUT.mkdir(parents=True, exist_ok=True)
    for key, path, args in paths():
        card(*args).save(path, "PNG")
        print(f"  {path.relative_to(ROOT)}")
    print(f"{len(CARDS)} cards written")
    return 0


if __name__ == "__main__":
    sys.exit(main())
