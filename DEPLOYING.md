# Deploying

This repo has no build step. **Netlify's GitHub app serves the default branch**,
so a push to `main` *is* the publish action. There is no `netlify.toml` and no
workflow file — the wiring lives in the Netlify dashboard, which is why nothing
in this tree describes it and why this file exists.

## `[skip ci]` on a merge subject suppresses the deploy

**Netlify honours `[skip ci]`.** It was never a GitHub-Actions-only marker.

The merge tooling used here stamps `[skip ci]` onto a squash-merge subject when
the base branch has no Actions jobs that need to run, so a private repo does not
pay for a redundant run. On a repo whose deploy *is* the GitHub app, that same
marker switches off publishing — so the merge succeeds, the content genuinely
reaches `main`, the post-merge verification genuinely passes, and the site
silently does not change.

It happened twice before anyone noticed:

| merge | landed on `main` | reached the live site |
|---|---|---|
| `c8cd346` — restore the ECG morphology claim | yes | **no** |
| `2f6a96a` — orchestration case study through round 28 | yes | **no** |

Both carried the marker. The post-merge check verified the files were on `main`
and was right to; that check ranges over the merge, and the deploy is downstream
of it. **A check narrower than the claim it gets read as supporting** — which is
the subject of [the orchestration case study](orchestration/) in this repo,
committed against that case study's own publication.

## Naming the marker also trips it

The commit that first documented all this was titled *"Document the [skip ci]
trap that has kept two merges off the live site"*. It was landed with the
suppression flag, so the tooling correctly did **not** append a marker — and
Netlify skipped the build anyway, because **the subject contains the token it is
about.**

Anything that scans a commit subject for a literal token fires on prose *about*
that token. Write it as "the CI-skip marker" in any subject line that has to
mention it.

## The rule

**Land a PR here with the marker suppressed.** The merge tooling has a flag for
it, and on this repo that flag is the truthful one: the base branch *does* have
something that must run on merge.

## Verifying a deploy, rather than assuming one

A merge check proves the content reached `main`. Nothing proves it reached the
public until you ask the public URL:

```bash
curl -s https://mike-giardina.netlify.app/<path>/ | grep -c "<a string only the new version has>"
```

A `0` there means the deploy did not run, however clean the merge was. Pick a
string that exists *only* in the new version — grepping for something both
versions contain returns 1 either way and proves nothing.

## Recovering when it has already happened

The merge cannot be re-run. Any later commit to `main` without the marker
rebuilds the whole site, so the stale commits publish along with it — which is
how the two rows above were recovered.
