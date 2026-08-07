#!/usr/bin/env python3
"""Assert the homepage actually reaches every case study, and that the counts it
states out loud match reality.

Both halves exist because both halves failed, on the same day, in the same file:

  * `clinical-review/` shipped, deployed, returned 200 -- and appeared ZERO times
    on index.html. It was reachable only via the case-studies hub. Every check we
    had passed, because a page that is orphaned and a page that is linked look
    identical to a link checker, a build, and an HTTP request.
  * The homepage then said "FOUR CASE STUDIES", "Four write-ups" and "ALL FOUR
    OPEN NOW" above five launch buttons. Enumerating the stale spots by reading
    found four of seven; a scripted pass found the rest.

The case-studies hub is the register of what a case study IS. Adding one there is
what makes it required on the homepage, so this check needs no hand-kept list --
which matters, because a hand-kept list is the thing that went stale.

Exit codes:  0 clean   1 violations found   2 could not check

The third state is not decoration. A checker that cannot find its inputs and
exits 0 reproduces the exact defect this repo's own case studies are about.

Run:  python tools/check_homepage_integrity.py
      python tools/check_homepage_integrity.py --self-test
"""
from __future__ import annotations

import re
import sys
import shutil
import tempfile
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HOME = ROOT / "index.html"
HUB = ROOT / "case-studies" / "index.html"

NUMBERS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
           "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12}

# Counting nouns are deliberately narrow. An earlier draft included "open now",
# which flagged the Story Mode card's "THREE CASES, OPEN NOW" -- a different and
# correct count. Loose matching on a check like this manufactures false failures,
# and a check people learn to ignore is worse than no check.
COUNT_NOUN = r"(?:case stud(?:y|ies)|write-ups?)"


def fail(msg: str) -> int:
    print(f"  VIOLATION  {msg}")
    return 1


def counts_in(text: str, expect: int, where: str) -> int:
    bad = 0
    for word, val in NUMBERS.items():
        for m in re.finditer(rf"\b{word}\b(?=[^<]{{0,60}}{COUNT_NOUN})", text, re.I):
            if val != expect:
                bad |= fail(f'{where} says "{m.group(0)}" where {expect} is correct')
    for m in re.finditer(rf"\b(\d+)\b(?=[^<]{{0,60}}{COUNT_NOUN})", text):
        if int(m.group(1)) != expect:
            bad |= fail(f"{where} states {m.group(1)} where {expect} is correct")
    return bad


def check() -> int:
    for p in (HOME, HUB):
        if not p.is_file():
            print(f"COULD NOT CHECK: missing {p.relative_to(ROOT)}")
            return 2

    home = HOME.read_text(encoding="utf-8")
    hub = HUB.read_text(encoding="utf-8")

    studies = re.findall(r'<a\s+class="study"\s+href="\.\./([^/"]+)/"', hub)
    if not studies:
        print("COULD NOT CHECK: no `a.study` links in the hub -- markup changed?")
        return 2

    n = len(studies)
    print(f"case studies registered in the hub : {n}  ({', '.join(studies)})")
    bad = 0

    # 1. every registered study is reachable from the front door
    for s in studies:
        if not (ROOT / s / "index.html").is_file():
            bad |= fail(f"hub links ../{s}/ but {s}/index.html does not exist")
            continue
        if not re.search(rf'href="{re.escape(s)}/"', home):
            bad |= fail(f"{s}/ is a case study but is NOT linked from index.html")

    # 2. counts stated in prose, the meta description and the og: description
    bad |= counts_in(home, n, "homepage")

    # 2a. the flagship badge, whose only noun is "OPEN NOW" and so is invisible
    #     to the narrow noun list above
    for m in re.finditer(r"ALL\s+([A-Za-z]+)\s+OPEN NOW", home):
        if NUMBERS.get(m.group(1).lower()) != n:
            bad |= fail(f'flagship badge says "ALL {m.group(1)} OPEN NOW" where {n} is correct')

    # 2b. Story Mode carries the identical defect shape on its own denominator
    story = ROOT / "story"
    if story.is_dir():
        cases = sorted(d.name for d in story.iterdir() if (d / "index.html").is_file())
        for m in re.finditer(r"([A-Za-z]+)\s+CASES,\s*OPEN NOW", home):
            if NUMBERS.get(m.group(1).lower()) != len(cases):
                bad |= fail(f'story badge says "{m.group(1)} CASES" but {len(cases)} exist '
                            f'({", ".join(cases)})')

    # 3. the hub's own numbering is contiguous and unique
    nums = [int(x) for x in re.findall(r'<div class="snum">\s*(\d+)', hub)]
    if nums and sorted(nums) != list(range(1, len(nums) + 1)):
        bad |= fail(f"hub card numbering is not 1..{len(nums)}: {nums}")

    print("FAILED" if bad else
          "CLEAN -- every case study is linked from the homepage and every stated count agrees")
    return 1 if bad else 0


# --------------------------------------------------------------------------
# Paired positive control. An all-pass run is indistinguishable from a run that
# never happened, so the check has to be shown breaking on each defect it claims
# to catch. This suite is the reason the story-badge rule works at all: it was
# silently dead on arrival -- a mangled escape had put a literal backspace where
# the word boundary belonged -- and reading the line could not see it.
# --------------------------------------------------------------------------
CONTROLS = [
    ("baseline, unmodified", None, 0),
    ("a case study orphaned from the homepage",
     [('href="clinical-review/"', 'href="#"')], 1),
    ("stated case-study count left stale",
     [("FIVE CASE STUDIES", "FOUR CASE STUDIES"), ("Five write-ups", "Four write-ups")], 1),
    ("flagship badge left stale",
     [("ALL FIVE OPEN NOW", "ALL FOUR OPEN NOW")], 1),
    ("story-case badge left stale",
     [("THREE CASES, OPEN NOW", "FOUR CASES, OPEN NOW")], 1),
]


def self_test() -> int:
    me = Path(__file__).name
    ok = True
    for label, muts, expect in CONTROLS:
        with tempfile.TemporaryDirectory() as td:
            t = Path(td)
            for item in ROOT.iterdir():
                if item.name in (".git", ".claude") or item.name.startswith("."):
                    continue
                (shutil.copytree if item.is_dir() else shutil.copy2)(item, t / item.name)
            if muts:
                p = t / "index.html"
                s = p.read_text(encoding="utf-8")
                for a, b in muts:
                    if a not in s:
                        print(f"  ERROR  control '{label}': anchor not found: {a!r}")
                        ok = False
                    s = s.replace(a, b)
                p.write_text(s, encoding="utf-8")
            got = subprocess.run([sys.executable, str(t / "tools" / me)],
                                 capture_output=True, text=True).returncode
            mark = "ok  " if got == expect else "FAIL"
            if got != expect:
                ok = False
            print(f"  [{mark}] expect {expect}, got {got}  --  {label}")

    # a missing input must report "could not check", never a clean pass
    with tempfile.TemporaryDirectory() as td:
        t = Path(td)
        for item in ROOT.iterdir():
            if item.name in (".git", ".claude") or item.name.startswith("."):
                continue
            (shutil.copytree if item.is_dir() else shutil.copy2)(item, t / item.name)
        (t / "case-studies" / "index.html").unlink()
        got = subprocess.run([sys.executable, str(t / "tools" / me)],
                             capture_output=True, text=True).returncode
        mark = "ok  " if got == 2 else "FAIL"
        if got != 2:
            ok = False
        print(f"  [{mark}] expect 2, got {got}  --  hub missing (could not check)")

    print("self-test PASSED" if ok else "self-test FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(self_test() if "--self-test" in sys.argv else check())
