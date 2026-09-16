# Vodiy Kafel — material gallery

## September 2026 revision

The public frontend is a curated architectural material gallery. It uses local mock data, without backend, API, authentication, admin or payment integration.

- Palette: warm paper #EEECE5, stone #D8D3C8, charcoal #232321, near-black #0B0B0A.
- Entry: warm-paper material study using the same Manrope and stone/olive palette as Home. Five local marble/travertine swatches form an architectural fan with rounded arch tops. A finite GSAP transform sequence opens the samples and reveals the wordmark; entry gathers the samples and lifts the curtain. No simulated loading percentage, mandatory wait, looping animation, new font, or entry WebGL. The entry button is usable immediately; Enter/Escape skip the sequence, and reduced motion shows the finished layout without animation. Research references: Floema (2026 CCP Digital Gold) and House of Honey (CSSDA WOTD, 21 June 2026); original composition, not a recreation of their loaders.
- Typography: locally served Manrope; generous line heights, legible labels, large but mobile-safe display text.
- Secondary text: #71685E on light surfaces; #C2B9AC on dark surfaces. Floating controls have their own solid surface.
- Hero: left-aligned editorial copy, a real CC0 ceramic GLB to the right, a material swatch and collection CTA. On small screens the sculpture sits below the copy.
- Model: drag rotation, restrained idle rotation, a stone plinth, studio reflections and contact shadow. A single lazy-loaded canvas renders only while visible; reduced-motion and failed WebGL use a material photograph.
- Material section: oversized travertine sample on a dark ground with dedicated copy space.
- Catalogue: 16 local concept products across eight categories; material and room photographs have an intentional relationship.
- Photography and model sources / rights: see ASSETS.md.
- Animation: short entry reveal, GSAP scroll reveals, existing horizontal categories and fullscreen menu. Respect reduced motion.
- Audio: consent-based ambient layer and interface tones; AudioContext resume is awaited before playing.

## Routes

Home, Catalog, Categories, Category Detail, Product Detail, About, Contact and 404 remain React Router pages. Contact submission remains a clearly indicated local demo.

## Verification

Use `pnpm run build`, `pnpm run lint` and `node --test tests/sound.test.js`.
Open `/?intro=1` to review the entrance again even after entering during the current session.
