import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { EASE, gsapLoaded, loadGsapNear } from '@/animations/gsap'
import { prefersReducedMotion } from '@/lib/motion'

/**
 * Scroll-triggered reveal for a section.
 *
 * Children opt in with a class:
 *   .r-line — masked line, rises from 110%
 *   .r-word — SplitText: so'zma-so'z ko'tariladi (S-019). Qatorni qo'lda
 *             `<span class="line-mask">` ga o'rashning keragi yo'q va
 *             qator uzilishi kenglikka qarab o'zi to'g'rilanadi
 *   .r-fade — fades and lifts
 *   .r-clip — clip-path wipe (frame opens)
 *   .r-zoom — counter-scale, use on the <img> inside a .r-clip frame
 *
 * CSS holds the same initial state so nothing flashes before JS runs.
 *
 * ⚠ ELEMENT KECH KELISHI MUMKIN (S-026 da topildi). API'ga bog'liq
 *   bo'lim avval `null` qaytaradi va DOM'ga faqat javob kelgach
 *   chiqadi. Oddiy `useRef` bunda ishlamaydi: effekt mount paytida
 *   BIR MARTA ishlaydi, o'shanda `ref.current` hali bo'sh — natijada
 *   `data-reveal` "in" ga o'tmay qoladi va CSS butun bo'limni
 *   ko'rinmas holda ushlab turadi. Ya'ni bo'lim BOR, lekin odam
 *   bo'sh joyga qarab turadi.
 *
 *   Shuning uchun ref — CALLBACK: element o'rnatilgan payt aniq
 *   ma'lum bo'ladi va effektlar o'shanda qayta ishlaydi.
 */
export function useReveal({ start = 'top 82%', stagger = 0.075, delay = 0 } = {}) {
  const ref = useRef(null)
  const ctxRef = useRef(null)
  // Element DOM'ga ulanganda o'zgaradi — quyidagi effektlar shunga qaraydi.
  const [node, setNode] = useState(null)
  const setRef = useCallback((el) => {
    ref.current = el
    setNode((previous) => (previous === el ? previous : el))
  }, [])

  /* FOUC QALQONI (S-018). GSAP endi asinxron keladi, ya'ni mount paytida
     u deyarli hech qachon tayyor emas. CSS esa `[data-reveal]` ostidagi
     matnni YASHIRIB turadi — agar shu holicha kutsak, birinchi ekrandagi
     sarlavha GSAP kelguncha bo'sh turardi.

     Shuning uchun: mount vaqtida EKRANDA turgan bo'lim GSAP ni umuman
     kutmaydi — darhol yakuniy holatga o'tadi. Ekrandan pastdagilar
     yashiringanicha qoladi va odam u yerga yetguncha GSAP allaqachon
     kelgan bo'ladi, ya'ni animatsiya joyida ishlaydi.

     Amalda: birinchi yuklashda yuqoridagi blok darhol ko'rinadi, sahifa
     ichida yurganda (GSAP xotirada) hamma joyda animatsiya ishlaydi. */
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const visible = el.getBoundingClientRect().top < window.innerHeight
    if (prefersReducedMotion() || (!gsapLoaded() && visible)) {
      el.setAttribute('data-reveal', 'in')
    }
  }, [node])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Yuqoridagi qalqon allaqachon ko'rsatib bo'lgan bo'lsa — ish yo'q
    if (el.getAttribute('data-reveal') === 'in') return

    const lines = el.querySelectorAll('.r-line')
    const wordy = el.querySelectorAll('.r-word')
    const fades = el.querySelectorAll('.r-fade')
    const clips = el.querySelectorAll('.r-clip')
    const zooms = el.querySelectorAll('.r-zoom')

    // Bail out if there's nothing to animate
    if (!lines.length && !wordy.length && !fades.length && !clips.length && !zooms.length) {
      el.setAttribute('data-reveal', 'in')
      return
    }

    // GSAP bo'lim ekranga yaqinlashganda so'raladi (S-018)
    const cancel = loadGsapNear(el, ({ gsap, ScrollTrigger, SplitText }) => {
      if (!ref.current) return

      /* GSAP kutilganidan kech kelgan bo'lsa va bo'lim allaqachon
         ekranda bo'lsa — animatsiya qilinmaydi: `once` trigger darhol
         ishga tushib, ko'rinib turgan matn avval yashirinib, keyin
         qaytib chiqardi. */
      if (el.getBoundingClientRect().top < window.innerHeight) {
        el.setAttribute('data-reveal', 'in')
        return
      }

      let split = null

      const ctx = gsap.context(() => {
        /* SplitText (S-019). `mask:'lines'` har bir qatorga o'zi
           `overflow:hidden` qutisi yasaydi — ya'ni `.line-mask` ni qo'lda
           yozish shart emas va qator uzilishi ekran kengligiga qarab
           o'zi to'g'ri joyda bo'ladi.
           `aria:'auto'` — bo'lingan `<span>` lar `aria-hidden`, ota
           elementga esa asl matn `aria-label` qilib qo'yiladi, shuning
           uchun ekran o'quvchi uchun hech narsa o'zgarmaydi. */
        if (wordy.length) {
          split = SplitText.create(wordy, { type: 'lines,words', mask: 'lines', aria: 'auto' })
          // CSS matnni yashirib turgan edi (GSAP kelmasligi mumkin edi);
          // endi niqoblar tayyor, yashirish ishini o'sha niqoblar bajaradi
          gsap.set(wordy, { opacity: 1 })
        }

        // Only set initial state on non-empty collections
        if (lines.length) gsap.set(lines, { y: 0, yPercent: 110 })
        if (split?.words.length) gsap.set(split.words, { yPercent: 115 })
        if (fades.length) gsap.set(fades, { autoAlpha: 0, y: 20 })
        if (clips.length) gsap.set(clips, { clipPath: 'inset(0% 0% 100% 0%)' })
        if (zooms.length) gsap.set(zooms, { scale: 1.14 })

        const tl = gsap.timeline({
          defaults: { ease: EASE },
          delay,
          scrollTrigger: { trigger: el, start, once: true },
          // `data-reveal='in'` — CSS yakuniy holati. Shu bilan birga
          // `will-change` ham o'chadi (index.css): promotsiya qilingan
          // qatlam animatsiya tugagach xotirada qolib ketmaydi.
          onComplete: () => el.setAttribute('data-reveal', 'in'),
        })

        if (clips.length) {
          tl.to(clips, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, stagger: 0.12 }, 0)
        }
        if (zooms.length) {
          tl.to(zooms, { scale: 1, duration: 1.8, stagger: 0.12 }, 0)
        }
        if (lines.length) {
          tl.to(lines, { y: 0, yPercent: 0, duration: 1.25, stagger }, clips.length ? 0.15 : 0)
        }
        if (split?.words.length) {
          tl.to(
            split.words,
            { yPercent: 0, duration: 1.15, stagger: stagger * 0.55 },
            clips.length ? 0.15 : 0,
          )
        }
        if (fades.length) {
          tl.to(
            fades,
            { autoAlpha: 1, y: 0, duration: 1.1, stagger: stagger * 0.8 },
            lines.length ? 0.25 : 0,
          )
        }
        // `ctx.revert()` tween'larni qaytaradi, lekin SplitText yasagan
        // `<span>` larni emas — ularni o'zimiz yig'ishtiramiz
        return () => split?.revert()
      }, el)

      ctxRef.current = ctx
      ScrollTrigger.refresh()
    })

    return cancel
  }, [node, start, stagger, delay])

  // Cleanup in useLayoutEffect so GSAP reverts BEFORE React removes DOM nodes
  useLayoutEffect(() => {
    return () => {
      ctxRef.current?.revert()
      ctxRef.current = null
    }
  }, [])

  return setRef
}

export default useReveal
