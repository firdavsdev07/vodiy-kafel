# Assets and research — September 2026

## Ceramic model — REMOVED (S-001, 2026-09-17)

The 3D subsystem (`src/three/*`, React Three Fiber, drei, three) and the
Poly Haven **Ceramic Vase 01** files under `public/models/` were deleted:
nothing imported them any more — the hero now shows a photograph of a
greeting man (`public/images/uzbek-greeter.webp`), not a WebGL scene.

The model was CC0 ([Poly Haven](https://polyhaven.com/a/ceramic_vase_01),
author James Ray Cock), so nothing is owed for having used it. If 3D is
ever wanted again, the files are recoverable from git history (commit
before S-001) — but the npm packages must be reinstalled deliberately.

## Logo / favicon

- Source file: `logo.png`, supplied by the project owner on **2026-09-17** (1254×1254 PNG, transparent background). A render of six ceramic tiles — Calacatta, travertine, olive, blue, grey stone and black marble — arranged as a diamond.
- Committed as `storefront/public/images/logo.png` (trimmed and squared, 1211×1211) and as favicons in **both** frontends (`storefront/` and `dashboard/`):
  - `favicon.ico` — 16/32/48 in one file
  - `favicon-32.png`, `favicon-192.png`, `apple-touch-icon.png` (180)
- Replaces the previous icons: the storefront was still shipping the **stock Vite purple bolt**; the dashboard had a hand-made "VK" monogram SVG (kept in git history).

⚠️ **Rights status: NOT ESTABLISHED.** The origin of `logo.png` is unknown to this repository — it was handed over as a file, with no stated author, licence or generation method. Before any commercial launch it must be recorded here whether it is (a) commissioned/owned artwork, (b) AI-generated, or (c) taken from a manufacturer or stock source. Case (c) carries the same problem as the Marazzi photography below and would block launch under **G7**. This is a question for the owner, not something that can be resolved from the file itself.

⚠️ **Legibility:** this is a photographic mark with six separate tiles and fine veining. At 32 px it is readable; at **16 px** (the normal browser-tab size) it degrades to a coloured smudge. A simplified flat-shape SVG version of the same diamond would stay crisp at every size — see S-033 / the open question below.

## Material photography

The user's requested local visual mock uses manufacturer reference images from:

- [Marazzi Marbleplay](https://www.marazzi.it/collezioni/marbleplay/).
- [Marazzi Mystone Travertino](https://www.marazzi.it/collezioni/mystone-travertino/).

43 successful source images were resized to at most 1400 pixels and encoded as WebP, totaling about 3.5 MiB. Exact original URL → local-file mappings are in `src/data/image-assets.json` and `public/images/materials/sources.json`. Failed source URLs resolve to an available image from the same material family.

**Rights status:** copyright remains with Marazzi / the respective image owners. These images are reference material for this local demo; no CC0, stock-photo license or commercial redistribution permission is claimed. Before publishing a commercial site, obtain permission or replace with owned/licensed product photography. They do not depict verified Vodiy Kafel inventory or its actual showroom. Product names/specifications are local concept data.

Preparation was done by a `scripts/prepare-assets.mjs` that is **not in this repository** (it predates it); the images in `public/images/materials/` are the committed output. Runtime does not call these external sources.

## Research direction

- [Atlas Concorde 2026 Outdoor catalogue](https://gruppoconcorde-cdn.thron.com/static/OFDZ9U_AtlasConcorde_OutdoorCatalogue_2026_M209XD.pdf): natural stone, limestone/travertine and indoor/outdoor continuity.
- [Atlas Concorde](https://www.atlasconcorde.com/en): current large-format and material-led presentation.
- Marazzi Marbleplay / Mystone Travertino: warm natural surfaces and architectural application photographs.
- [Unseen](https://unseen.co): original interaction reference. Browser navigation timed out during this revision; its text page was accessible. No claim of a completed live interaction audit.

This is a curated direction informed by collections available in 2026, not an objective ranking of the year's best tiles.

## Typography and audio

- **Manrope**, 400/500/600/700, served locally from `public/fonts/` as **subset WOFF2** (S-003).
- Source: Google Fonts; copyright Manrope Project Authors. **SIL OFL 1.1**, full license in `public/fonts/OFL.txt`.
- The four full TTFs (384 KB total) were replaced by four subset WOFF2 files (**61.7 KB total, −84%**). The original TTFs are **not** kept in the repo — re-download Manrope from Google Fonts and run `scripts/subset-fonts.sh` to regenerate.
- Subset keeps: Basic Latin + Latin-1, Latin Extended-A (foreign brand names), general punctuation (curly quotes, dashes, ellipsis), `№ ™ € × ² ° § ® ©` and arrows. **Cyrillic was dropped** (104 glyphs) — the site is `lang="uz"` in Latin script. If a Cyrillic version is ever needed, regenerate with that range added.
- ⚠ **Manrope has no `U+02BB` (ʻ) or `U+02BC` (ʼ)** — the typographically correct Uzbek characters for `oʻ`/`gʻ` and the tutuq belgisi. The site therefore uses `U+2018` (‘), which Manrope does contain and which renders correctly. If API content ever arrives using `U+02BB`, that one character will fall back to a system font mid-word. Verified against the source TTF, not assumed.
- OFL 1.1 permits subsetting and redistribution; the licence file travels with the fonts, and the Reserved Font Name is unchanged.
- Original Web Audio sine/triangle tones and quiet ambient chord, synthesized in `src/lib/sound.js`. No downloaded music.
- Audio starts only after opting in. Both entry choices and the persistent sound control are available on mobile.
- Lucide icons: ISC license, installed npm package.

## Business content

Company information remains local in `src/data/company.js`. The original reference was kafel-web.vercel.app; business facts have not been independently reverified in this visual revision.
