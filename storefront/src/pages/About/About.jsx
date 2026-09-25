import { Link } from 'react-router-dom'

import PageHeader from '@/components/ui/PageHeader'
import PartnerLogo from '@/components/ui/PartnerLogo'
import SmartImage from '@/components/ui/SmartImage'
import { company } from '@/data/company'
import { INTERIOR, MARBLE, TRAVERTINE } from '@/data/images'
import { useParallax } from '@/hooks/useParallax'
import { useReveal } from '@/hooks/useReveal'
import { partnerModel, useMainBranch, usePartners } from '@/shared/api'
import Seo from '@/components/ui/Seo'

export default function About() {
  const oneRef = useReveal({ start: 'top 82%' })
  const twoRef = useReveal({ start: 'top 82%' })
  const threeRef = useReveal({ start: 'top 82%' })
  const fourRef = useReveal({ start: 'top 82%' })
  const plateRef = useParallax(140)
  const { data: branch } = useMainBranch()

  return (
    <>
      <Seo
        title="Biz haqimizda"
        description="20 yildan ortiq vaqtdan beri Farg‘ona vodiysiga keramika olib kelamiz — zavod bilan to‘g‘ridan-to‘g‘ri, vositachisiz."
      />

      <PageHeader
        index="05"
        eyebrow="Biz haqimizda"
        title={['Biz', 'haqimizda']}
        meta={`${company.markets.import.join(' / ')} → O‘zbekiston`}
        lede={company.intro}
      />

      {/* statement + first number */}
      <section ref={oneRef} data-reveal="" className="relative z-10 edge">
        <div className="hairline grid gap-8 pt-8 text-charcoal md:grid-cols-12">
          <p className="type-editorial md:col-span-7">{company.story[0]}</p>
          <div className="md:col-span-4 md:col-start-9">
            <div className="line-mask">
              <span className="r-line type-display block">20+</span>
            </div>
            <div className="r-fade mt-3 type-label text-clay">Yil tajriba</div>
          </div>
        </div>

        {/* large plate with a slow parallax — the "texture transition" */}
        <div className="mt-[clamp(4rem,10vw,9rem)] overflow-hidden">
          <div ref={plateRef} className="-my-[8%]">
            <SmartImage
              id={INTERIOR[4]}
              alt="Zamonaviy interyerda keramik yuzalar"
              ratio="21 / 9"
              sizes="92vw"
              width={2400}
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* story + second number */}
      <section
        ref={twoRef}
        data-reveal=""
        className="relative z-10 edge py-[clamp(5rem,12vw,10rem)]"
      >
        <div className="grid gap-y-12 md:grid-cols-12 md:gap-x-8">
          <div className="md:col-span-4">
            <div className="line-mask">
              <span className="r-line type-display block">50K+</span>
            </div>
            <div className="r-fade mt-3 type-label text-clay">Mijozlar</div>
          </div>

          <div className="md:col-span-6 md:col-start-7">
            {/* Qator uzunligi 75 belgidan oshmasin (S-006) — cheklovsiz
                6 ustunda 1920px da ≈106-108 belgi/qator chiqardi. */}
            <p className="r-fade max-w-[54ch]">{company.story[1]}</p>
            <p className="r-fade mt-6 max-w-[54ch] text-clay">{company.story[2]}</p>
          </div>
        </div>

        {/* material pair */}
        <div className="mt-[clamp(4rem,10vw,9rem)] grid gap-6 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <SmartImage
              id={MARBLE[3]}
              alt="Marmar effekt yuzasi"
              ratio="3 / 4"
              sizes="(max-width: 767px) 92vw, 40vw"
              className="w-full"
            />
            <div className="mt-3 type-label text-clay">01 — Marmar effekt</div>
          </div>
          <div className="md:col-span-6 md:col-start-7 md:mt-[8vw]">
            <SmartImage
              id={TRAVERTINE[0]}
              alt="Travertin yuzasi"
              ratio="4 / 3"
              sizes="(max-width: 767px) 92vw, 48vw"
              className="w-full"
            />
            <div className="mt-3 type-label text-clay">02 — Tosh effekt</div>
          </div>
        </div>
      </section>

      {/* markets */}
      <section ref={threeRef} data-reveal="" className="relative z-10 bg-ink text-bone">
        <div className="edge py-[clamp(5rem,12vw,10rem)]">
          <span className="r-fade type-label text-clay">Geografiya</span>

          <h2 className="mt-8 type-head">
            <span className="line-mask">
              <span className="r-line">Zavoddan</span>
            </span>
            <span className="line-mask">
              <span className="r-line">vodiygacha.</span>
            </span>
          </h2>

          <div className="mt-[clamp(3rem,8vw,6rem)] grid gap-10 md:grid-cols-3">
            {[
              { label: 'Import', items: company.markets.import },
              { label: 'Baza', items: ["O‘zbekiston", "Farg‘ona vodiysi"] },
              { label: 'Eksport', items: company.markets.export },
            ].map((block) => (
              <div key={block.label} className="r-fade border-t border-bone/15 pt-5">
                <div className="type-label text-clay">{block.label}</div>
                <ul className="mt-4 flex flex-col gap-2">
                  {block.items.map((item) => (
                    <li key={item} className="text-[clamp(1.05rem,1.8vw,1.5rem)]">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="r-fade mt-[clamp(3rem,8vw,6rem)] grid gap-8 border-t border-bone/15 pt-8 md:grid-cols-12">
            <div className="type-label text-clay md:col-span-3">
              {company.guarantee.title}
            </div>
            <p className="type-editorial md:col-span-8">{company.guarantee.body}</p>
          </div>
        </div>
      </section>

      <Partners />

      {/* showroom + CTA */}
      <section
        ref={fourRef}
        data-reveal=""
        className="relative z-10 edge py-[clamp(5rem,12vw,10rem)]"
      >
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-6">
            <SmartImage
              id={TRAVERTINE[5]}
              alt=""
              ratio="4 / 3"
              sizes="(max-width: 767px) 92vw, 48vw"
              className="w-full"
            />
          </div>

          <div className="md:col-span-5 md:col-start-8 md:self-end">
            <span className="r-fade type-label text-clay">
              {branch ? `${branch.city.toUpperCase()} SHOWROOM` : 'SHOWROOM'}
            </span>
            <h2 className="mt-6 type-sub">
              <span className="line-mask">
                <span className="r-line">Kelib ko‘ring.</span>
              </span>
            </h2>
            {/* Manzil API'dan (S-025) — ro'yxatdagi birinchi do'kon.
                Kelmasa blok chiqmaydi, "Aloqa sahifasi" havolasi esa
                joyida qoladi: u yerda hamma do'kon ro'yxati bor. */}
            {branch && (
              <address className="r-fade mt-6 not-italic leading-relaxed text-clay">
                {branch.city} shahri
                <br />
                {branch.address}
                <br />
                {branch.workingHours}
              </address>
            )}
            <Link
              to="/contact"
              className="group relative mt-8 inline-flex items-center gap-3 type-label before:absolute before:-inset-4 before:content-['']"
            >
              Aloqa sahifasi
              <span className="block h-px w-10 origin-left bg-charcoal transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[2.0]" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

/**
 * Hamkorlar (S-026) — `GET /partners`.
 *
 * Yuqoridagi statistikada "120+ Hamkorlar" deb yozilgan; bu blok
 * o'shaning yuzi. Ro'yxat bo'sh bo'lsa (yoki backend javob bermasa)
 * bo'lim UMUMAN chiqmaydi: bo'sh "Hamkorlar" sarlavhasi 120+ raqamiga
 * zid bo'lib turardi.
 */
function Partners() {
  const ref = useReveal({ start: 'top 85%' })
  const { data } = usePartners()
  const partners = (data ?? []).map(partnerModel)

  if (!partners.length) return null

  return (
    <section
      ref={ref}
      data-reveal=""
      className="relative z-10 edge py-[clamp(5rem,12vw,9rem)]"
    >
      <div className="hairline flex items-baseline justify-between pt-4">
        <span className="type-label text-clay">Hamkorlar</span>
        <span className="type-label text-clay">Biz bilan ishlaydiganlar</span>
      </div>

      {/* Logotiplar o'lchami har xil — `items-center` ularni bitta
          ko'rinmas chiziqqa tizadi, ya'ni keng va tik belgilar yonma-yon
          turganda qator qiyshaymaydi. */}
      <div className="mt-[clamp(2.5rem,6vw,4rem)] grid grid-cols-2 items-center gap-x-8 gap-y-[clamp(2rem,4vw,3rem)] md:grid-cols-3 lg:grid-cols-4">
        {partners.map((partner) => (
          <div key={partner.id} className="r-fade">
            <PartnerLogo partner={partner} />
          </div>
        ))}
      </div>
    </section>
  )
}
