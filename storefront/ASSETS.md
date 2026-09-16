# Assets and research — September 2026

## Ceramic model

- **Ceramic Vase 01** — [Poly Haven](https://polyhaven.com/a/ceramic_vase_01).
- Author: **James Ray Cock**, according to Poly Haven asset metadata.
- License: **CC0**; [Poly Haven license](https://polyhaven.com/license).
- Official 1K glTF, geometry and three texture maps are preserved in `public/models/vase/`.
- Runtime: `public/models/ceramic-vase.glb`, about 408 KiB. The official glTF and images are packed into one GLB without changing the model.
- Used by `src/three/Stage.jsx`. No external model, environment or texture requests at runtime.
- Studio light panels and pedestal are procedural. The old procedural sculpture and shader files are retained but no longer imported by the active scene.

## Material photography

The user's requested local visual mock uses manufacturer reference images from:

- [Marazzi Marbleplay](https://www.marazzi.it/collezioni/marbleplay/).
- [Marazzi Mystone Travertino](https://www.marazzi.it/collezioni/mystone-travertino/).

43 successful source images were resized to at most 1400 pixels and encoded as WebP, totaling about 3.5 MiB. Exact original URL → local-file mappings are in `src/data/image-assets.json` and `public/images/materials/sources.json`. Failed source URLs resolve to an available image from the same material family.

**Rights status:** copyright remains with Marazzi / the respective image owners. These images are reference material for this local demo; no CC0, stock-photo license or commercial redistribution permission is claimed. Before publishing a commercial site, obtain permission or replace with owned/licensed product photography. They do not depict verified Vodiy Kafel inventory or its actual showroom. Product names/specifications are local concept data.

Preparation: `node scripts/prepare-assets.mjs` (requires network, curl and ImageMagick). Runtime does not call these external sources.

## Research direction

- [Atlas Concorde 2026 Outdoor catalogue](https://gruppoconcorde-cdn.thron.com/static/OFDZ9U_AtlasConcorde_OutdoorCatalogue_2026_M209XD.pdf): natural stone, limestone/travertine and indoor/outdoor continuity.
- [Atlas Concorde](https://www.atlasconcorde.com/en): current large-format and material-led presentation.
- Marazzi Marbleplay / Mystone Travertino: warm natural surfaces and architectural application photographs.
- [Unseen](https://unseen.co): original interaction reference. Browser navigation timed out during this revision; its text page was accessible. No claim of a completed live interaction audit.

This is a curated direction informed by collections available in 2026, not an objective ranking of the year's best tiles.

## Typography and audio

- **Manrope**, 400/500/600/700, served locally from `public/fonts/`.
- Source: Google Fonts; copyright Manrope Project Authors. **SIL OFL 1.1**, full license in `public/fonts/OFL.txt`.
- Original Web Audio sine/triangle tones and quiet ambient chord, synthesized in `src/lib/sound.js`. No downloaded music.
- Audio starts only after opting in. Both entry choices and the persistent sound control are available on mobile.
- Lucide icons: ISC license, installed npm package.

## Business content

Company information remains local in `src/data/company.js`. The original reference was kafel-web.vercel.app; business facts have not been independently reverified in this visual revision.
