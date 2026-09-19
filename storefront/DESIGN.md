# Vodiy Kafel — material gallery

## September 2026 revision

The public frontend is a curated architectural material gallery. It uses local mock data, without backend, API, authentication, admin or payment integration.

- Palette: warm paper #EEECE5, stone #D8D3C8, charcoal #232321, near-black #0B0B0A.
- Entry: warm-paper material study using the same Manrope and stone/olive palette as Home. Five local marble/travertine swatches form an architectural fan with rounded arch tops. A finite GSAP transform sequence opens the samples and reveals the wordmark; entry gathers the samples and lifts the curtain. No simulated loading percentage, mandatory wait, looping animation, new font, or entry WebGL. The entry button is usable immediately; Enter/Escape skip the sequence, and reduced motion shows the finished layout without animation. Research references: Floema (2026 CCP Digital Gold) and House of Honey (CSSDA WOTD, 21 June 2026); original composition, not a recreation of their loaders.
- Typography: locally served Manrope; generous line heights, legible labels, large but mobile-safe display text.
- Secondary text: #71685E on light surfaces; #C2B9AC on dark surfaces. Floating controls have their own solid surface.
- Hero: left-aligned editorial copy, a photograph of a greeting man to the right (`public/images/uzbek-greeter.webp`) with a speech bubble, a material swatch and collection CTA.
- No WebGL anywhere: the 3D vase scene and the whole `src/three/` subsystem were removed in S-001. The hero is photography plus CSS/GSAP only.
- Material section: oversized travertine sample on a dark ground with dedicated copy space.
- Catalogue: 16 local concept products across eight categories; material and room photographs have an intentional relationship.
- Photography and model sources / rights: see ASSETS.md.
- Animation: short entry reveal, GSAP scroll reveals, existing horizontal categories and fullscreen menu. Respect reduced motion.
- Audio: consent-based ambient layer and interface tones; AudioContext resume is awaited before playing.

## Routes

Home, Catalog, Categories, Category Detail, Product Detail, About, Contact and 404 remain React Router pages. Contact submission remains a clearly indicated local demo.

## Contrast va o'qilish auditi (S-006, 2026-09-19)

Barcha sahifalar (Home, Catalog, Categories, Category Detail, Product Detail,
About, Contact, 404, Menu overlay) brauzerda WCAG nisbatlari bo'yicha
tekshirildi: har bir matn elementining `color` qiymati, orqasidagi haqiqiy
fon (ota elementlar zanjiri bo'ylab) va shrift o'lchami/qalinligi asosida
(≥24px yoki ≥18.66px+bold — "katta matn", bosqichi 3.0:1; qolgani 4.5:1).

### Palitra juftliklari

| Matn rangi | Fon | Nisbat | AA (oddiy 4.5) | AA (katta 3.0) |
|---|---|---|---|---|
| `clay` `#71685e` | `bone` `#eeece5` | 4.62:1 | ✅ | ✅ |
| `clay` `#71685e` | `stone` `#d8d3c8` | 3.66:1 | ❌ | ✅ |
| `clay-dark` `#c2b9ac` | `charcoal` `#232321` | 8.12:1 | ✅ | ✅ |
| `clay-dark` `#c2b9ac` | `ink` `#0b0b0a` | 10.15:1 | ✅ | ✅ |
| `ink`/`charcoal` (asosiy matn) | `bone` | 13.3–16.7:1 | ✅ | ✅ |
| `hero-description` `#625d54` | `bone` | 5.53:1 | ✅ | ✅ |
| `hero-object-label` `#665e53` | `bone` | 5.40:1 | ✅ | ✅ |

**Topilma 1 — `clay` / `stone` juftligi (task tavsiflagan holat).** Hozir
`.bg-stone` sinfi faqat `SmartImage` ramkasida (rasm yuklanayotgan/xato holati)
ishlatiladi va u yerda matn YO'Q — shuning uchun bu juftlik hozircha
EKRANDA ko'rinmaydi. Ammo `index.css`dagi qoida `.bg-stone` ni `.bg-bone` bilan
bitta guruhga qo'shib, ikkalasiga ham och `clay` (`#71685e`, stone ustida
3.66:1 — AA dan past) berardi — bu "mina" edi: kimdir ertaga `.bg-stone`
ustiga `text-clay` yozsa, avtomatik ravishda AA dan pastga tushardi.
**Tuzatildi:** `.bg-stone` uchun alohida, quyuqroq token qo'shildi —
`#5a534b` (stone ustida 5.07:1, bone ustida 6.4:1) — `src/styles/index.css`.

**Topilma 2 — xiralashtirilgan holat (opacity) matnni AA dan pastga
tushirardi.** Ikki joyda "faol elementni ajratib ko'rsatish, qolganini
xiralashtirish" effekti butun havolaga (sarlavha + kichik yorliqlar birga)
qo'llangan edi — natijada kichik matn deyarli o'qib bo'lmas darajaga tushardi:

| Joy | Eski holat | Muammo | Tuzatish |
|---|---|---|---|
| `Menu.jsx` — nofaol menyu bandi (`bone` matn, `ink` fon) | `opacity: .34` butun havolaga | Sarlavha 2.74:1 (kerak ≥3.0), kichik yorliqlar (`text-clay`) 2.10:1 (kerak ≥4.5) | Xiralashtirish FAQAT sarlavhaga (`.42` → 3.61:1); kichik yorliqlar endi doim to'liq ko'rinadi |
| `Categories.jsx` — nofaol kategoriya qatori (`ink` matn, `bone` fon) | `opacity: .3` butun havolaga | Sarlavha 2.0:1 (kerak ≥3.0), tagline/`clay` 1.46:1 (kerak ≥4.5) | Xiralashtirish FAQAT sarlavhaga (`.5` → 3.56:1); tagline/indeks/`nameEn` endi doim to'liq ko'rinadi |

Ikkala holatda ham dizayn niyati (sichqoncha turgan band ajralib turishi)
saqlanib qoldi — faqat katta sarlavha xiralashadi (u 3:1 chegarasiga
chidaydi), kichik matn esa `clay` o'zi ham to'liq holatda AA chegarasiga
yaqin (4.62:1) bo'lgani uchun xiralashtirilganda chidamaydi.

### Rasm ustidagi matn

Katalog/kategoriya kartalarida (`ProductGrid.jsx`) matn rasmning OSTIDA
joylashadi (qattiq `bone` fonda), rasm USTIGA yozilmaydi — shuning uchun
gradient/qoplama talab qiluvchi holat yo'q. `Menu.jsx`dagi fon surati esa
`bg-gradient-to-r from-ink via-ink/70 to-transparent` bilan qoplangan va
matn doim qoplamaning ENG QUYUQ (`from-ink`, to'liq xira) tomonida turadi —
tekshirildi, muammo topilmadi.

### Fokus ko'rinishi

`:focus-visible { outline: 2px solid currentColor; outline-offset: 6px }` —
`currentColor` fokuslangan elementning O'Z matn rangi, ya'ni yuqoridagi
audit qaysi matn AA dan o'tgan bo'lsa, o'sha elementning fokus halqasi ham
xuddi shu nisbatda ko'rinadi (masalan `hero-link` da tekshirildi — bone
fonda to'q rangli to'rtburchak aniq ko'rinadi). Yagona ehtiyot chorasi:
interaktiv element to'g'ridan-to'g'ri fotosurat USTIGA (qattiq fon rangisiz)
joylashtirilmasin — hozir bunday holat yo'q (kartalar butun rasmni o'z ichiga
olsa ham, halqa `outline-offset:6px` tufayli kartadan tashqarida, oddiy
sahifa foni ustida chiqadi).

### Qator uzunligi (≤ 75 belgi)

Aksariyat ikkinchi darajali paragraflar S-005 da allaqachon `max-w-[Nch]`
(30–46ch) bilan cheklangan edi. Auditda ustun-kenglikka (`md:col-span-N`)
tayanib, belgi-cheklovisiz qolgan UCH ta asosiy matn paragrafi topildi —
1920px ekranda haqiqiy (so'z-o'rash simulyatsiyasi bilan o'lchangan) eng
uzun qatorlari 75 dan oshgan:

| Joy | Eski holat (1920px) | Tuzatish |
|---|---|---|
| `CategoryDetail.jsx` — `category.description` | eng uzun qator ~90 belgi | `max-w-[48ch]` → eng uzun qator 62 belgi |
| `About.jsx` — `company.story[1]` | eng uzun qator ~108 belgi | `max-w-[54ch]` → eng uzun qator 69 belgi |
| `About.jsx` — `company.story[2]` | eng uzun qator ~106 belgi | `max-w-[54ch]` → eng uzun qator 73 belgi |

`type-editorial` (katta, klamp qilingan) shrift bilan chiqadigan paragraflar
(`CompanySection.jsx`, `IntroSection.jsx`, `ProductDetail.jsx`) tekshirildi —
shrift kattaligi o'zi qatorni 45–52 belgigacha qisqartiradi, muammo yo'q.

## Verification

Use `pnpm run build`, `pnpm run lint` and `node --test tests/sound.test.js`.
Open `/?intro=1` to review the entrance again even after entering during the current session.
Contrast audit method (S-006): in a running dev server, walk `document.querySelectorAll('body *')`,
resolve each leaf text node's effective background by compositing the `background-color` of every
ancestor, compute WCAG relative luminance, and flag anything under the size-appropriate threshold.
For opacity-based dimming, composite the element's own color against its background at the applied
alpha before computing luminance. For line length, simulate the browser's own greedy word-wrap with
a canvas `measureText` pass at the real column width, rather than trusting `ch` as a literal
character count (real prose fits ~20–35% more characters into an `Nch`-wide box than `N` suggests).
