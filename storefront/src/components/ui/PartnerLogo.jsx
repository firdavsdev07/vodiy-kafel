import { useEffect, useRef, useState } from 'react'

/**
 * Bitta hamkor belgisi (S-026).
 *
 * ⚠ `SmartImage` bu yerda ATAYLAB ishlatilmadi. U material suratlari
 *   uchun: `object-cover` bilan ramkani to'ldiradi va yuklanmasa tosh
 *   rangli to'rtburchak qoldiradi. Logotip boshqacha — nisbati har xil
 *   (keng, kvadrat, tik), kesilsa buziladi va "bo'sh kulrang quti"
 *   saytni singan ko'rsatadi.
 *
 * ── NOM — ZAXIRA EMAS, ASOS ──
 *
 * Boshlang'ich holat — hamkor NOMI. Logotip faqat HAQIQATAN
 * yuklangandan keyin uning ustiga chiqadi.
 *
 * Teskarisi ("avval surat, xato bo'lsa nom") YAROQSIZ ekan: brauzerda
 * tekshirilganda logotip manzili javob bermay OSILIB qoldi —
 * `onError` umuman ishlamadi (`complete: false`), ya'ni odam bo'sh
 * joyga qarab turardi. Yuklanish MUVAFFAQIYATI hodisasi esa aniq:
 * kelsa — ko'rinadi, kelmasa — nom joyida qoladi. Taymer ham,
 * xato ushlash ham kerak emas.
 *
 * ⚠ FAQAT `onLoad` YETARLI EMAS. Surat React tinglovchini ulgurmasidan
 *   yuklanib bo'lishi mumkin — masalan keshdan darhol kelsa. O'shanda
 *   `load` hodisasi O'TIB KETADI va logotip bor bo'la turib hech
 *   qachon ko'rinmaydi. Bu React'da ma'lum tuzoq, shuning uchun mount
 *   paytida surat allaqachon tayyormi — qo'lda ham tekshiriladi.
 *
 * Kirish imkoni: surat BEZAK (`alt=""`, `aria-hidden`), o'qiladigan
 * nom esa har doim DOM'da — ekran o'quvchi hamkor nomini bir marta,
 * logotip bor-yo'qligidan qat'i nazar aytadi.
 *
 * Rang: logotiplar rang-barang bo'ladi, sayt esa bir ohangda. Shuning
 * uchun ular sokin holatda kulrang va biroz shaffof, sichqoncha
 * tekkanda o'z rangiga qaytadi.
 */
export default function PartnerLogo({ partner }) {
  /* Bayroq emas, MANZIL saqlanadi: hamkor almashsa "yuklangan" holat
     o'zi bekor bo'ladi va uni alohida tozalash kerak emas. */
  const [loadedSrc, setLoadedSrc] = useState(null)
  const imgRef = useRef(null)
  const loaded = Boolean(partner.logo) && loadedSrc === partner.logo

  useEffect(() => {
    const img = imgRef.current
    // `naturalWidth > 0` — "tugadi" degani "muvaffaqiyatli" degani emas:
    // yiqilgan surat ham `complete: true` bo'ladi, lekin kengligi nol.
    if (img?.complete && img.naturalWidth > 0) setLoadedSrc(partner.logo)
  }, [partner.logo])

  const inner = (
    <div className="relative flex h-[clamp(3.5rem,7vw,5.5rem)] w-full items-center justify-center">
      <span
        className={`text-center text-[clamp(1rem,1.6vw,1.35rem)] font-semibold leading-tight tracking-[-0.02em] transition-opacity duration-500 ${
          loaded ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {partner.name}
      </span>

      {partner.logo && (
        <img
          ref={imgRef}
          src={partner.logo}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onLoad={() => setLoadedSrc(partner.logo)}
          className={`absolute inset-0 m-auto max-h-full max-w-full object-contain grayscale transition-[opacity,filter] duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:grayscale-0 ${
            loaded ? 'opacity-70 group-hover:opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  )

  const box = 'group block w-full'

  // Sayti bor hamkor — havola; yo'q bo'lsa bosiladigan narsa ham yo'q.
  if (!partner.websiteUrl) {
    return <div className={box}>{inner}</div>
  }

  return (
    <a
      href={partner.websiteUrl}
      target="_blank"
      rel="noreferrer"
      // Ochiluvchi havola ekanini ekran o'quvchi ham bilsin.
      aria-label={`${partner.name} — sayti (yangi oynada ochiladi)`}
      className={`${box} transition-colors hover:text-clay`}
    >
      {inner}
    </a>
  )
}
