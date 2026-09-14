/**
 * Test ma'lumotlari (B-013).
 *
 * Ishga tushirish:  pnpm db:seed
 *
 * ⚠ Bu skript bazani TO'LIQ TOZALAB, qaytadan to'ldiradi. Shuning uchun
 *   `NODE_ENV=production` da ishga tushmaydi.
 *
 * ⚠ `account_transactions` da audit trigger bor (B-011) — oddiy DELETE
 *   ishlamaydi, shuning uchun tozalash `TRUNCATE ... CASCADE` orqali.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import { Prisma, PrismaClient } from '../generated/prisma';

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

/** Barcha seed hisoblari uchun bitta dev parol. */
const DEV_PAROL = 'Parol123!';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function tozalash() {
  // Jadval ro'yxati dinamik olinadi — yangi model qo'shilganda bu yer
  // yangilanishi kerak bo'lmaydi (unutilib qolmaydi).
  const rows = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
  `;
  const list = rows.map((r) => `"${r.table_name}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
  console.log(`🧹 ${rows.length} ta jadval tozalandi`);
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed production muhitida ishga tushmaydi!');
  }
  await tozalash();
  const hash = await bcrypt.hash(DEV_PAROL, 10);

  // ─── Filiallar (TZ 3.7, 3.7.2) ───────────────────────────────────────────
  const ish = 'Du–Sh 09:00–18:00, Yakshanba dam';
  const markaz = await prisma.branch.create({
    data: {
      type: 'CENTRAL',
      name: 'Vodiy Kafel — Markaziy ombor',
      city: "Farg'ona",
      address: "Sanoat ko'chasi 1, temir yo'l yonida",
      latitude: 40.3842,
      longitude: 71.7843,
      workingHours: ish,
      phones: ['+998730000001'],
      sortOrder: 0,
    },
  });

  const retail = await Promise.all(
    [
      {
        name: "Vodiy Kafel — Farg'ona",
        city: "Farg'ona",
        address: 'Mustaqillik 12',
        lat: 40.3864,
        lng: 71.7864,
        tel: '+998730000010',
      },
      {
        name: 'Vodiy Kafel — Andijon',
        city: 'Andijon',
        address: 'Bobur shoh 45',
        lat: 40.7821,
        lng: 72.3442,
        tel: '+998740000010',
      },
      {
        name: 'Vodiy Kafel — Namangan',
        city: 'Namangan',
        address: 'Navoiy 78',
        lat: 40.9983,
        lng: 71.6726,
        tel: '+998690000010',
      },
      {
        name: "Vodiy Kafel — Qo'qon",
        city: "Qo'qon",
        address: 'Istiqlol 3',
        lat: 40.5286,
        lng: 70.9425,
        tel: '+998730000020',
      },
    ].map((b, i) =>
      prisma.branch.create({
        data: {
          type: 'RETAIL',
          name: b.name,
          city: b.city,
          address: b.address,
          latitude: b.lat,
          longitude: b.lng,
          workingHours: ish,
          phones: [b.tel],
          telegramUrl: 'https://t.me/vodiykafel',
          instagramUrl: 'https://instagram.com/vodiykafel',
          sortOrder: i + 1,
        },
      }),
    ),
  );
  const [fargona, andijon, namangan, qoqon] = retail;
  console.log(
    `🏢 ${retail.length + 1} filial (1 CENTRAL + ${retail.length} RETAIL)`,
  );

  // ─── Xodimlar (TZ 3.7.2 rollar ierarxiyasi) ──────────────────────────────
  const boshAdmin = await prisma.user.create({
    data: {
      phone: '+998900000001',
      email: 'admin@vodiykafel.uz',
      passwordHash: hash,
      fullName: 'Bosh admin',
      role: 'SUPER_ADMIN',
      telegramUsername: 'vk_admin',
    },
  });
  const moderator = await prisma.user.create({
    data: {
      phone: '+998900000002',
      passwordHash: hash,
      fullName: 'Ombor moderatori',
      role: 'MODERATOR',
      branchId: markaz.id,
      telegramUsername: 'vk_moderator',
    },
  });

  const xodimlar: Record<
    string,
    { admin: string; menejer: string; adminPhone: string; menejerPhone: string }
  > = {};
  for (const [i, f] of retail.entries()) {
    const a = await prisma.user.create({
      data: {
        phone: `+9989001100${i + 1}`,
        passwordHash: hash,
        fullName: `${f.city} filial admini`,
        role: 'BRANCH_ADMIN',
        branchId: f.id,
      },
    });
    const m = await prisma.user.create({
      data: {
        phone: `+9989002200${i + 1}`,
        passwordHash: hash,
        fullName: `${f.city} menejeri`,
        role: 'MANAGER',
        branchId: f.id,
        telegramUsername: `vk_${f.city.toLowerCase()}`,
      },
    });
    xodimlar[f.id] = {
      admin: a.id,
      menejer: m.id,
      adminPhone: a.phone,
      menejerPhone: m.phone,
    };
  }
  console.log(
    `👤 ${2 + retail.length * 2} xodim (1 SUPER_ADMIN, 1 MODERATOR, ${retail.length}×2 filial)`,
  );

  // ─── Katalog (TZ 3.8) ────────────────────────────────────────────────────
  const zavodlar = await Promise.all(
    ['YONGXIN', 'HUA TAO', 'CROWN CERAMIC', 'Metro Ceramics'].map((n, i) =>
      prisma.factory.create({
        data: {
          name: n,
          slug: n.toLowerCase().replace(/\s+/g, '-'),
          logoUrl: `https://cdn.vodiykafel.uz/factories/${i + 1}.png`,
          description: `${n} — hamkor zavod`,
          sortOrder: i + 1,
        },
      }),
    ),
  );

  const [k60, k30] = await Promise.all([
    prisma.productSize.create({
      data: { label: '60x60', widthCm: 60, heightCm: 60, sortOrder: 1 },
    }),
    prisma.productSize.create({
      data: { label: '30x60', widthCm: 30, heightCm: 60, sortOrder: 2 },
    }),
  ]);

  const mahsulotTavsifi = [
    {
      n: 'Lyuks Granit Bej',
      z: 0,
      s: k60,
      sur: 'POL',
      c: 'bej',
      narx: 85000,
      zaxira: 250,
    },
    {
      n: 'Lyuks Granit Kulrang',
      z: 0,
      s: k60,
      sur: 'POL',
      c: 'kulrang',
      narx: 88000,
      zaxira: 180,
    },
    {
      n: 'Marmar Oq',
      z: 1,
      s: k60,
      sur: 'POL',
      c: 'oq',
      narx: 112000,
      zaxira: 95,
    },
    {
      n: 'Marmar Qora',
      z: 1,
      s: k60,
      sur: 'POL',
      c: 'qora',
      narx: 118000,
      zaxira: 0,
    },
    {
      n: 'Devor Klassik Bej',
      z: 1,
      s: k30,
      sur: 'DEVOR',
      c: 'bej',
      narx: 64000,
      zaxira: 400,
    },
    {
      n: 'Devor Klassik Oq',
      z: 2,
      s: k30,
      sur: 'DEVOR',
      c: 'oq',
      narx: 62000,
      zaxira: 12,
    },
    {
      n: 'Crown Premium Pol',
      z: 2,
      s: k60,
      sur: 'POL',
      c: "to'q jigarrang",
      narx: 134000,
      zaxira: 60,
    },
    {
      n: 'Crown Mozaika',
      z: 2,
      s: k30,
      sur: 'DEVOR',
      c: "ko'k",
      narx: 79000,
      zaxira: 0,
    },
    {
      n: 'Metro Loft',
      z: 3,
      s: k60,
      sur: 'POL',
      c: 'beton',
      narx: 97000,
      zaxira: 140,
    },
    {
      n: 'Metro Vintage',
      z: 3,
      s: k30,
      sur: 'DEVOR',
      c: 'terrakota',
      narx: 71000,
      zaxira: 8,
    },
  ] as const;

  // Filialga xos narx koeffitsienti (TZ 3.7.1: bir xil kafel turli filialda
  // turli narx. Markaziy ombor — ta'minot narxi, arzonroq).
  const koef: { id: string; k: number }[] = [
    { id: markaz.id, k: 0.85 },
    { id: fargona.id, k: 1.0 },
    { id: andijon.id, k: 1.082 },
    { id: namangan.id, k: 1.05 },
    { id: qoqon.id, k: 1.03 },
  ];

  const mahsulotlar: { id: string; factoryId: string; narx: number }[] = [];
  for (const [i, p] of mahsulotTavsifi.entries()) {
    const sqm = p.s.label === '60x60' ? '1.4400' : '1.0800';
    const kg = p.s.label === '60x60' ? '32.500' : '24.000';
    const m = await prisma.product.create({
      data: {
        name: p.n,
        slug: p.n
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
        factoryId: zavodlar[p.z].id,
        sizeId: p.s.id,
        surface: p.sur,
        color: p.c,
        description: `${p.n} — ${p.s.label}, ${p.sur === 'POL' ? 'pol' : 'devor'} uchun`,
        sqmPerPallet: sqm,
        weightPerPallet: kg,
        viewCount: (i + 1) * 37,
        // Zaxira — FAQAT markaziy omborda, mahsulotga bitta son (TZ 3.2, 3.7.1)
        stock: { create: { stockPallets: p.zaxira, lowStockThreshold: 20 } },
        media: {
          create: [
            { url: `https://cdn.vodiykafel.uz/p/${i + 1}-1.jpg`, sortOrder: 1 },
            {
              url: `https://cdn.vodiykafel.uz/p/${i + 1}-360`,
              type: 'IMAGE_360',
              sortOrder: 2,
            },
          ],
        },
        branchProducts: {
          create: koef.map((c) => ({
            branchId: c.id,
            pricePerSqm: D(p.narx).mul(c.k).toDecimalPlaces(2),
          })),
        },
      },
    });
    mahsulotlar.push({ id: m.id, factoryId: zavodlar[p.z].id, narx: p.narx });
  }
  // O'xshash mahsulotlar (TZ 3.1)
  await prisma.productSimilar.createMany({
    data: [
      {
        productId: mahsulotlar[0].id,
        similarProductId: mahsulotlar[1].id,
        sortOrder: 1,
      },
      {
        productId: mahsulotlar[1].id,
        similarProductId: mahsulotlar[0].id,
        sortOrder: 1,
      },
      {
        productId: mahsulotlar[2].id,
        similarProductId: mahsulotlar[3].id,
        sortOrder: 1,
      },
    ],
  });
  await prisma.galleryItem.createMany({
    data: [
      {
        imageUrl: 'https://cdn.vodiykafel.uz/g/1.jpg',
        title: "Farg'onadagi loyiha",
        productId: mahsulotlar[0].id,
        sortOrder: 1,
      },
      {
        imageUrl: 'https://cdn.vodiykafel.uz/g/2.jpg',
        title: 'Andijon villa',
        productId: mahsulotlar[2].id,
        sortOrder: 2,
      },
      {
        imageUrl: 'https://cdn.vodiykafel.uz/g/3.jpg',
        title: 'Ofis interyeri',
        sortOrder: 3,
      },
    ],
  });
  console.log(
    `🧱 ${zavodlar.length} zavod, 2 o'lcham, ${mahsulotlar.length} mahsulot` +
      ` (${mahsulotTavsifi.filter((p) => p.zaxira === 0).length} tasi zaxirada yo'q)`,
  );

  await prisma.partner.createMany({
    data: [
      {
        name: 'Yuksalish Group',
        logoUrl: 'https://cdn.vodiykafel.uz/pt/1.png',
        sortOrder: 1,
      },
      {
        name: 'Belissimo',
        logoUrl: 'https://cdn.vodiykafel.uz/pt/2.png',
        sortOrder: 2,
      },
      {
        name: 'Ansor',
        logoUrl: 'https://cdn.vodiykafel.uz/pt/3.png',
        websiteUrl: 'https://ansor.uz',
        sortOrder: 3,
      },
    ],
  });

  // ─── Transport va yo'l kira matritsasi (TZ 3.13, 3.14) ───────────────────
  const [fura, vagon] = await Promise.all([
    prisma.transportType.create({
      data: { name: 'Fura', capacityPallets: 20, sortOrder: 1 },
    }),
    prisma.transportType.create({
      data: { name: 'Vagon', capacityPallets: 60, sortOrder: 2 },
    }),
  ]);
  const viloyatlar = await Promise.all(
    [
      ["Farg'ona", 1],
      ['Andijon', 1.1],
      ['Namangan', 1.15],
      ['Toshkent shahri', 2.6],
      ['Navoiy', 3.2],
    ].map(([n], i) =>
      prisma.region.create({
        data: { name: n as string, sortOrder: i + 1 },
      }),
    ),
  );
  const masofa = [1, 1.1, 1.15, 2.6, 3.2];

  const tariflar: Prisma.BranchRegionTariffCreateManyInput[] = [];
  for (const b of [markaz, ...retail]) {
    for (const [i, v] of viloyatlar.entries()) {
      tariflar.push(
        {
          branchId: b.id,
          regionId: v.id,
          transportTypeId: fura.id,
          price: D(4_000_000).mul(masofa[i]).toDecimalPlaces(2),
        },
        {
          branchId: b.id,
          regionId: v.id,
          transportTypeId: vagon.id,
          price: D(9_000_000).mul(masofa[i]).toDecimalPlaces(2),
        },
      );
    }
  }
  await prisma.branchRegionTariff.createMany({ data: tariflar });
  console.log(
    `🚚 2 transport turi, ${viloyatlar.length} viloyat, ${tariflar.length} tarif`,
  );

  // ─── Optom mijozlar (TZ 3.5) ─────────────────────────────────────────────
  const mijozlar: {
    id: string;
    branchId: string;
    nom: string;
    login: string;
  }[] = [];
  for (const [i, f] of retail.entries()) {
    const login = `${f.city.toLowerCase().replace(/[^a-z]/g, '')}-optom`;
    const c = await prisma.customer.create({
      data: {
        login,
        passwordHash: hash,
        mustChangePassword: true,
        companyName: `${f.city} Qurilish MChJ`,
        inn: `30${1000000 + i}`,
        contactName: `${f.city} rahbari`,
        phone: `+9989033300${i + 1}`,
        branchId: f.id,
        managerId: xodimlar[f.id].menejer,
        createdByUserId: xodimlar[f.id].admin,
        account: { create: {} },
      },
    });
    mijozlar.push({ id: c.id, branchId: f.id, nom: c.companyName, login });
  }
  // Markazga biriktirilgan agent (TZ 3.7.2)
  const agent = await prisma.customer.create({
    data: {
      login: 'navoiy-agent',
      passwordHash: hash,
      mustChangePassword: true,
      companyName: 'Navoiy Agent MChJ',
      inn: '301999999',
      contactName: 'Agent',
      phone: '+998933999999',
      branchId: markaz.id,
      createdByUserId: moderator.id,
      account: { create: {} },
    },
  });
  console.log(`🤝 ${mijozlar.length} optom mijoz + 1 markaz agenti`);

  // ─── Individual narx qoidalari (TZ 3.3.1) ────────────────────────────────
  await prisma.pricingRule.createMany({
    data: [
      // Andijon mijoziga hammasida -10%
      {
        customerId: mijozlar[1].id,
        domain: 'PRODUCT',
        scope: 'ALL',
        type: 'PERCENT',
        value: '-10',
        createdByUserId: boshAdmin.id,
        createdByRole: 'SUPER_ADMIN',
      },
      // Farg'ona mijoziga aynan 1-mahsulot 78 000 (1-daraja, eng kuchli)
      {
        customerId: mijozlar[0].id,
        domain: 'PRODUCT',
        scope: 'PRODUCT',
        productId: mahsulotlar[0].id,
        type: 'FIXED',
        value: '78000.00',
        createdByUserId: boshAdmin.id,
        createdByRole: 'SUPER_ADMIN',
      },
      // Farg'ona mijoziga YONGXIN mahsulotlarida -5% (2-daraja)
      {
        customerId: mijozlar[0].id,
        domain: 'PRODUCT',
        scope: 'FACTORY',
        factoryId: zavodlar[0].id,
        type: 'PERCENT',
        value: '-5',
        createdByUserId: boshAdmin.id,
        createdByRole: 'SUPER_ADMIN',
      },
      // Namangan mijoziga filial admini -3% qo'shgan (maxfiylik testi uchun)
      {
        customerId: mijozlar[2].id,
        domain: 'PRODUCT',
        scope: 'ALL',
        type: 'PERCENT',
        value: '-3',
        createdByUserId: xodimlar[namangan.id].admin,
        createdByRole: 'BRANCH_ADMIN',
      },
      // Transport: Andijon mijoziga yo'l kirada -7% (TZ 3.14)
      {
        customerId: mijozlar[1].id,
        domain: 'TRANSPORT',
        scope: 'ALL',
        type: 'PERCENT',
        value: '-7',
        createdByUserId: boshAdmin.id,
        createdByRole: 'SUPER_ADMIN',
      },
    ],
  });
  console.log('🏷️  5 narx qoidasi (mahsulot va transport, 3 darajali zanjir)');

  // ─── Namunaviy buyurtma + balans (TZ 3.4, 3.11) ──────────────────────────
  const mijoz0 = mijozlar[0];
  // Farg'ona mijozida 1-mahsulotga FIXED 78 000 qoidasi bor (bazaviy 85 000
  // o'rniga) — narx zanjiri ishlaganini ko'rsatish uchun aynan shuni olamiz.
  const narx = D('78000.00');
  const paddon = 30;
  const sqm = D('1.4400').mul(paddon);
  const kg = D('32.500').mul(paddon);
  const itemsTotal = sqm.mul(narx).toDecimalPlaces(2);
  const mashina = Math.ceil(paddon / fura.capacityPallets);
  const tarif = (await prisma.branchRegionTariff.findFirst({
    where: {
      branchId: mijoz0.branchId,
      regionId: viloyatlar[0].id,
      transportTypeId: fura.id,
    },
  }))!;
  const deliveryTotal = tarif.price.mul(mashina).toDecimalPlaces(2);
  const grandTotal = itemsTotal.add(deliveryTotal);

  const buyurtma = await prisma.order.create({
    data: {
      orderNumber: 'VK-2026-000001',
      orderingType: 'CUSTOMER',
      customerId: mijoz0.id,
      source: 'WEBSITE',
      status: 'SEARCHING_TRANSPORT',
      branchId: mijoz0.branchId,
      managerId: xodimlar[mijoz0.branchId].menejer,
      itemsTotal,
      deliveryTotal,
      grandTotal,
      regionId: viloyatlar[0].id,
      transportTypeId: fura.id,
      transportCount: mashina,
      totalSqm: sqm,
      totalWeightKg: kg,
      totalPallets: paddon,
      note: 'Seed namunasi',
      items: {
        create: {
          productId: mahsulotlar[0].id,
          pallets: paddon,
          sqm,
          weightKg: kg,
          pricePerSqmSnapshot: narx,
          lineTotal: itemsTotal,
        },
      },
      statusHistory: {
        create: [
          { status: 'NEW', changedByUserId: xodimlar[mijoz0.branchId].menejer },
          {
            status: 'SEARCHING_TRANSPORT',
            changedByUserId: xodimlar[mijoz0.branchId].menejer,
          },
        ],
      },
    },
  });

  // Qismli to'lov: qarz musbat qolishi kerak, aks holda balans mantiqsiz
  // bo'ladi (oldindan to'lov alohida holat, seedda ko'zda tutilmagan).
  const tolangan = D('8000000.00');
  const tolov = await prisma.payment.create({
    data: {
      orderId: buyurtma.id,
      method: 'BANK_TRANSFER',
      amount: tolangan,
      status: 'PAID',
      paidAt: new Date(),
      idempotencyKey: 'seed-payment-001',
      providerRef: 'seed-ref-001',
    },
  });

  await prisma.$transaction([
    prisma.accountTransaction.create({
      data: {
        customerId: mijoz0.id,
        type: 'DEBT',
        amount: grandTotal,
        orderId: buyurtma.id,
        note: `${buyurtma.orderNumber} buyurtmasi`,
      },
    }),
    prisma.accountTransaction.create({
      data: {
        customerId: mijoz0.id,
        type: 'PAYMENT',
        amount: tolangan.neg(),
        orderId: buyurtma.id,
        paymentId: tolov.id,
        createdByUserId: xodimlar[mijoz0.branchId].admin,
        note: "Bank o'tkazmasi",
      },
    }),
    prisma.customerAccount.update({
      where: { customerId: mijoz0.id },
      data: { totalPurchased: grandTotal, totalPaid: tolangan },
    }),
  ]);
  const qarz = grandTotal.sub(tolangan);
  if (qarz.lte(0))
    throw new Error(
      `Seed mantiqi buzilgan: qarz ${qarz.toString()} (musbat bo'lishi kerak)`,
    );
  console.log(
    `📦 1 buyurtma ${buyurtma.orderNumber}: ${grandTotal.toString()} so'm` +
      ` | to'langan ${tolangan.toString()} | qarz ${qarz.toString()}`,
  );

  // ─── Bildirishnoma va sozlamalar ─────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        customerId: mijoz0.id,
        type: 'ORDER_CREATED',
        title: 'Buyurtma qabul qilindi',
        body: `${buyurtma.orderNumber} raqamli buyurtmangiz qabul qilindi`,
        payload: { orderId: buyurtma.id },
      },
      {
        customerId: mijoz0.id,
        type: 'PAYMENT_RECEIVED',
        title: "To'landi",
        body: `${tolangan.toString()} so'm to'lovingiz qabul qilindi`,
        payload: { orderId: buyurtma.id },
      },
      {
        userId: xodimlar[mijoz0.branchId].menejer,
        type: 'ORDER_CREATED',
        title: 'Yangi buyurtma',
        body: `${mijoz0.nom} — ${buyurtma.orderNumber}`,
        payload: { orderId: buyurtma.id },
      },
    ],
  });
  await prisma.setting.createMany({
    data: [
      {
        key: 'stock.lowThresholdPallets',
        value: 20,
        description: '"Kam qoldi" chegarasi (paddon)',
      },
      {
        key: 'payment.requisites',
        isPublic: true,
        value: {
          bank: 'Hamkorbank',
          mfo: '00873',
          account: '20208000900123456789',
          inn: '301234567',
          name: 'Vodiy Kafel Savdo MChJ',
        },
        description: 'Bank rekvizitlari (perechislenie uchun)',
      },
      {
        key: 'pricing.branchAdminMaxDiscountPercent',
        value: 20,
        description: 'Filial admini bera oladigan maksimal chegirma (%)',
      },
    ],
  });

  // ─── Xulosa ──────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────');
  console.log(`  TEST HISOBLARI (parol: ${DEV_PAROL})`);
  console.log('─────────────────────────────────────────────');
  console.log('  Xodimlar (telefon bilan kiradi):');
  console.log('    +998900000001  SUPER_ADMIN');
  console.log('    +998900000002  MODERATOR (markaziy ombor)');
  // ⚠ Raqamlar YOZILGAN yozuvdan olinadi, qo'lda yozilmaydi: ilgari bu
  //   ikki qator qattiq kodlangan edi va bitta ortiqcha nol bilan
  //   (+998900110001) chiqardi — bazada esa +99890011001 yaratilardi.
  const birinchiFilial = retail[0];
  console.log(
    `    ${xodimlar[birinchiFilial.id].adminPhone}   BRANCH_ADMIN  — ${birinchiFilial.city}`,
  );
  console.log(
    `    ${xodimlar[birinchiFilial.id].menejerPhone}   MANAGER       — ${birinchiFilial.city}`,
  );
  console.log('  Optom mijozlar (login bilan kiradi):');
  for (const m of mijozlar) console.log(`    ${m.login.padEnd(16)} ${m.nom}`);
  console.log(
    `    ${agent.login.padEnd(16)} ${agent.companyName} (markaz agenti)`,
  );
  console.log('─────────────────────────────────────────────');
  console.log('  ⚠ Barcha mijozlarda mustChangePassword = true');
  console.log('─────────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed xatosi:', e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
