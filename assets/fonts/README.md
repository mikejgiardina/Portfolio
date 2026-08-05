# Fonts

Self-hosted so the site has no CDN dependency and no third-party request on
page load. Both are variable fonts covering the full weight range the site
uses, so there are two files rather than seven.

| File | Family | Weights | Size |
|---|---|---|---|
| `ibm-plex-sans-var-latin.woff2` | IBM Plex Sans | 300–600 | 45 KB |
| `jetbrains-mono-var-latin.woff2` | JetBrains Mono | 400–700 | 31 KB |

Latin subset only — the site has no non-Latin content, and the full subset set
would multiply the payload for characters that never render.

## Licences

Both are licensed under the SIL Open Font License 1.1, which requires the
copyright notice and licence to travel with the font files. Full text:

- [`IBM-Plex-Sans-OFL.txt`](IBM-Plex-Sans-OFL.txt) — Copyright © 2017 IBM Corp.
- [`JetBrains-Mono-OFL.txt`](JetBrains-Mono-OFL.txt) — Copyright 2020 The JetBrains Mono Project Authors

## Replacing or updating

The `@font-face` rules live at the top of [`../site.css`](../site.css). The
files came from the Google Fonts API's variable-range endpoint:

```
https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300..600&family=JetBrains+Mono:wght@400..700&display=swap
```

Request that URL with a modern browser User-Agent to get woff2 (an older UA
gets ttf), then download the `latin` block's `src` URL from each `@font-face`.
Keep the weight ranges in `site.css` matching whatever range you request — a
static weight served against a `font-weight: 300 600` declaration will render
every weight identically.
