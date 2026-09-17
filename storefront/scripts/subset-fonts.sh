#!/usr/bin/env bash
# Manrope TTF → subset WOFF2  (S-003)
#
# Nega kerak: to'liq TTF 4 ta og'irlik uchun 384 KB edi. Kirill, Yunon va
# ishlatilmaydigan belgilarni tashlab, WOFF2 (Brotli) ga o'tkazish uni
# ~62 KB ga tushiradi — 84% kam, ko'rinishi esa bir xil.
#
# Talab:  python3 -m venv .fontenv && .fontenv/bin/pip install fonttools brotli
# Ishga tushirish:  bash scripts/subset-fonts.sh <asl-ttf-papkasi>
#
# ⚠ Asl TTF fayllar repoda SAQLANMAYDI. Ularni Google Fonts dan qayta
#   yuklab olish mumkin (Manrope, SIL OFL 1.1) — ASSETS.md ga qarang.

set -euo pipefail
SRC="${1:?asl TTF papkasini ko'rsating, masalan: ~/Downloads/Manrope}"
OUT="$(dirname "$0")/../public/fonts"
PYFT="${PYFT:-pyftsubset}"

# Nimani saqlaymiz:
#   0000-00FF  asosiy lotin + Latin-1 (®, ©, °, ·, ×, ², §)
#   0100-017F  Latin Extended-A — chet el brend nomlari (ğ, ş, ı, ć …)
#   02BB-02DC  modifier harflar — o‘/g‘ ning TO'G'RI shakli uchun
#              (⚠ Manrope da yo'q — pastdagi izohga qarang)
#   2000-206F  tirnoq (‘ ’ “ ”), tire (– —), ellips (…), nbsp
#   2116       № · 2122 ™ · 20AC € · 2190-2197 strelkalar · 2212 −
RANGES='U+0000-00FF,U+0100-017F,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2116,U+2122,U+2190-2193,U+2197,U+2212'

for w in 400 500 600 700; do
  "$PYFT" "$SRC/Manrope-$w.ttf" \
    --output-file="$OUT/manrope-$w.woff2" \
    --flavor=woff2 \
    --layout-features='kern,liga,calt,ccmp,locl,rlig' \
    --unicodes="$RANGES" \
    --no-hinting --desubroutinize --drop-tables+=DSIG
  printf '  manrope-%s.woff2  %s bayt\n' "$w" "$(stat -c%s "$OUT/manrope-$w.woff2")"
done

# ⚠ MANROPE CHEKLOVI: unda U+02BB (ʻ) va U+02BC (ʼ) YO'Q. Shuning uchun
#   sayt o‘/g‘ uchun U+2018 (‘) ishlatadi — u Manrope da bor va to'g'ri
#   ko'rinadi. Agar API dan U+02BB bilan matn kelsa, o'sha bitta belgi
#   tizim shriftiga tushadi va so'z o'rtasida ko'zga tashlanadi.
