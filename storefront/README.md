# Vodiy Kafel

Public ceramic-material gallery built with React, JavaScript, Vite, Tailwind CSS, React Router, GSAP, Lenis and React Three Fiber.

## Local development

```sh
pnpm install
pnpm dev
```

Visit `/?intro=1` to review the entrance. Normal visits skip it after the user has entered during the same session.

## Checks

```sh
pnpm build
pnpm lint
node --test tests/sound.test.js
```

## Content and assets

- `src/data/`: local concept catalogue and business information.
- `public/images/materials/`: optimized material and interior reference images.
- `public/models/ceramic-vase.glb`: CC0 ceramic model.
- `public/fonts/`: locally hosted Manrope and its OFL license.
- `src/lib/sound.js`: opt-in Web Audio.
- `ASSETS.md`: exact sources, attribution and reference-photo rights status.
- `DESIGN.md`: current visual direction.

Everything remains frontend-only. The contact form is a local demonstration.
Production hosting must rewrite application routes to index.html. Review the manufacturer-reference image rights in ASSETS.md before public commercial deployment.
