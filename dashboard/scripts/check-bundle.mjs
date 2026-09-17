// Bundle hajmi tekshiruvi (D-047): `pnpm build` dan keyin `pnpm size`.
// Chegaradan oshsa — xato kodi bilan chiqadi (CI da yiqiladi).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const dir = join(import.meta.dirname, '../dist/assets');
const KB = 1024;
/** gzip hajmi chegaralari — kirish chunk'i birinchi ochilishdagi yuklamani belgilaydi */
const LIMITS = { entryGzip: 130 * KB, chunkGzip: 60 * KB, totalJsGzip: 400 * KB };

let files;
try {
  files = readdirSync(dir);
} catch {
  console.error('dist/assets yo‘q — avval `pnpm build`');
  process.exit(1);
}

const rows = files
  .filter((f) => f.endsWith('.js') || f.endsWith('.css'))
  .map((f) => {
    const buf = readFileSync(join(dir, f));
    return { file: f, raw: buf.length, gzip: gzipSync(buf).length };
  })
  .sort((a, b) => b.gzip - a.gzip);

const js = rows.filter((r) => r.file.endsWith('.js'));
const entry = js.find((r) => /^index-/.test(r.file));
const totalJsGzip = js.reduce((sum, r) => sum + r.gzip, 0);
const fmt = (n) => `${(n / KB).toFixed(1)} KB`;

console.log('Eng katta 10 fayl (gzip / xom):');
for (const r of rows.slice(0, 10)) console.log(`  ${fmt(r.gzip).padStart(9)} / ${fmt(r.raw).padStart(9)}  ${r.file}`);
console.log(`JS jami (gzip): ${fmt(totalJsGzip)} — ${js.length} chunk`);

const problems = [];
if (!entry) problems.push('kirish chunk (index-*.js) topilmadi');
else if (entry.gzip > LIMITS.entryGzip) problems.push(`kirish chunk ${fmt(entry.gzip)} > ${fmt(LIMITS.entryGzip)}`);
for (const r of js) if (r !== entry && r.gzip > LIMITS.chunkGzip) problems.push(`${r.file} ${fmt(r.gzip)} > ${fmt(LIMITS.chunkGzip)}`);
if (totalJsGzip > LIMITS.totalJsGzip) problems.push(`JS jami ${fmt(totalJsGzip)} > ${fmt(LIMITS.totalJsGzip)}`);

if (problems.length) {
  console.error('\n❌ Bundle chegarasi oshdi:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('\n✅ Bundle chegaralar ichida');
