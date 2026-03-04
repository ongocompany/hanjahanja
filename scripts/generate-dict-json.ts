/**
 * hanja_words → 급수별 JSON 사전 파일 생성
 * 사용법: pnpm --filter scripts generate-dict
 * 출력: apps/extension/public/dict/level-{급수값}.json (개별 파일)
 * 동음이의어: 같은 한글에 여러 한자 → 배열로 모두 보존
 *
 * 데이터 소스: 로컬 CSV(scripts/data/hanja-words-extracted.csv)
 *            + hanja_characters(Supabase, 6K행만 조회)
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ .env.local에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const LEVELS = [
  { value: 8, label: '8급' },
  { value: 7.5, label: '준7급' },
  { value: 7, label: '7급' },
  { value: 6.5, label: '준6급' },
  { value: 6, label: '6급' },
  { value: 5.5, label: '준5급' },
  { value: 5, label: '5급' },
  { value: 4.5, label: '준4급' },
  { value: 4, label: '4급' },
  { value: 3.5, label: '준3급' },
  { value: 3, label: '3급' },
  { value: 2.5, label: '준2급' },
  { value: 2, label: '2급' },
  { value: 1.5, label: '준1급' },
  { value: 1, label: '1급' },
  { value: 0.5, label: '준특급' },
  { value: 0, label: '특급' },
] as const;

const CSV_PATH = join(__dirname, 'data/hanja-words-extracted.csv');
const OUTPUT_DIR = resolve(__dirname, '../apps/extension/public/dict');

interface CharInfo {
  character: string;
  reading: string;
  meaning: string;
  level: number;
}

interface CharDetail {
  char: string;
  meaning: string;
  reading: string;
  level: number;
}

interface DictEntry {
  hanja: string;
  reading: string;
  meaning: string;
  level: number;
  source: string;
  chars: CharDetail[];
}

async function loadCharacterCache(): Promise<Map<string, CharInfo>> {
  console.log('📥 hanja_characters 로드 중...');
  const cache = new Map<string, CharInfo>();
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('hanja_characters')
      .select('character, reading, meaning, level')
      .range(offset, offset + pageSize - 1);

    if (error) { console.error('❌ 로드 실패:', error.message); break; }
    if (!data || data.length === 0) break;
    for (const row of data) cache.set(row.character, row);
    offset += pageSize;
    if (data.length < pageSize) break;
  }

  console.log(`  ✅ ${cache.size.toLocaleString()}개 한자 로드 완료\n`);
  return cache;
}

function calculateWordLevel(
  hanja: string,
  charCache: Map<string, CharInfo>
): { level: number; details: CharDetail[] } | null {
  const chars = [...hanja];
  const details: CharDetail[] = [];
  let hardestLevel = 8;

  for (const char of chars) {
    const info = charCache.get(char);
    if (!info) return null;
    details.push({ char: info.character, reading: info.reading, meaning: info.meaning, level: info.level });
    hardestLevel = Math.min(hardestLevel, info.level);
  }

  return { level: hardestLevel, details };
}

function loadCsvWords(): Array<{ korean: string; hanja: string; meaning: string; source: string }> {
  console.log('📥 CSV 파일 읽는 중...');
  const raw = readFileSync(CSV_PATH, 'utf-8');
  const records = parse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true });
  console.log(`  ✅ ${records.length.toLocaleString()}개 행 로드 완료`);

  // stdict(표준국어대사전) 우선 정렬 — opendict(우리말샘)은 뒤로
  const sorted = records.sort((a: Record<string, string>, b: Record<string, string>) => {
    if (a.source === 'stdict' && b.source !== 'stdict') return -1;
    if (a.source !== 'stdict' && b.source === 'stdict') return 1;
    return 0;
  });

  const stCount = sorted.filter((r: Record<string, string>) => r.source === 'stdict').length;
  console.log(`  📊 stdict: ${stCount.toLocaleString()}개 / opendict: ${(sorted.length - stCount).toLocaleString()}개\n`);

  return sorted.map((r: Record<string, string>) => ({
    korean: r.korean,
    hanja: r.hanja,
    meaning: r.meaning || '',
    source: r.source,
  }));
}

function buildLevelDicts(
  csvWords: Array<{ korean: string; hanja: string; meaning: string; source: string }>,
  charCache: Map<string, CharInfo>
): Map<number, Record<string, DictEntry[]>> {
  const levelDicts = new Map<number, Record<string, DictEntry[]>>();
  for (const level of LEVELS) {
    levelDicts.set(level.value, {});
  }

  let skippedNoChar = 0;
  let totalEntries = 0;

  for (const word of csvWords) {
    const levelInfo = calculateWordLevel(word.hanja, charCache);
    if (!levelInfo) { skippedNoChar++; continue; }

    const dict = levelDicts.get(levelInfo.level);
    if (!dict) { skippedNoChar++; continue; }

    const entry: DictEntry = {
      hanja: word.hanja,
      reading: word.korean,
      meaning: word.meaning,
      level: levelInfo.level,
      source: word.source,
      chars: levelInfo.details,
    };

    if (!dict[word.korean]) {
      dict[word.korean] = [];
    }
    dict[word.korean].push(entry);
    totalEntries++;
  }

  let homonymCount = 0;
  for (const dict of levelDicts.values()) {
    for (const entries of Object.values(dict)) {
      if (entries.length > 1) homonymCount++;
    }
  }

  console.log(`  📊 총 ${totalEntries.toLocaleString()}개 엔트리`);
  console.log(`  🔀 동음이의어 있는 단어: ${homonymCount.toLocaleString()}개`);
  if (skippedNoChar > 0) {
    console.log(`  ⏭️  급수 매칭 불가 스킵: ${skippedNoChar.toLocaleString()}개`);
  }

  return levelDicts;
}

function writeDictFiles(levelDicts: Map<number, Record<string, DictEntry[]>>): void {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 디렉토리 생성: ${OUTPUT_DIR}\n`);
  }

  console.log('💾 급수별 JSON 파일 생성:\n');

  const manifest: Array<{
    level: number;
    label: string;
    fileName: string;
    wordCount: number;
    fileSizeKB: number;
  }> = [];

  let totalWords = 0;

  for (const levelDef of LEVELS) {
    const dict = levelDicts.get(levelDef.value);
    if (!dict) continue;

    const wordCount = Object.keys(dict).length;
    if (wordCount === 0) {
      console.log(`  ${levelDef.label}: 0개 (스킵)`);
      continue;
    }

    const fileName = `level-${levelDef.value}.json`;
    const filePath = join(OUTPUT_DIR, fileName);

    const jsonStr = JSON.stringify(dict);
    writeFileSync(filePath, jsonStr, 'utf-8');

    const fileSizeKB = Math.round(jsonStr.length / 1024);
    const fileSizeMB = (jsonStr.length / (1024 * 1024)).toFixed(1);
    totalWords += wordCount;

    manifest.push({ level: levelDef.value, label: levelDef.label, fileName, wordCount, fileSizeKB });

    const sizeStr = fileSizeKB >= 1024 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`;
    console.log(`  ✅ ${levelDef.label.padEnd(4)} → ${fileName.padEnd(16)} (${wordCount.toLocaleString()}개, ${sizeStr})`);
  }

  const manifestData = {
    generatedAt: new Date().toISOString(),
    totalWords,
    levels: manifest,
  };
  writeFileSync(join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifestData, null, 2), 'utf-8');
  console.log(`\n  📋 manifest.json 생성 완료`);
}

async function main() {
  console.log('');
  console.log('═'.repeat(50));
  console.log('  한자한자 급수별 JSON 사전 생성기');
  console.log('═'.repeat(50));
  console.log('');

  const charCache = await loadCharacterCache();
  const csvWords = loadCsvWords();

  console.log('🔄 급수별 분류 중...\n');
  const levelDicts = buildLevelDicts(csvWords, charCache);

  console.log('');
  writeDictFiles(levelDicts);

  console.log('');
  console.log('═'.repeat(50));
  console.log('  생성 완료!');
  console.log('═'.repeat(50));
  console.log(`  📂 출력: ${OUTPUT_DIR}`);

  let totalWords = 0;
  for (const dict of levelDicts.values()) {
    totalWords += Object.keys(dict).length;
  }
  console.log(`  📊 총 단어: ${totalWords.toLocaleString()}개`);
  console.log(`  📁 파일 수: ${LEVELS.length}개 + manifest.json`);
  console.log('');
}

main().catch((err) => {
  console.error('❌ 오류 발생:', err);
  process.exit(1);
});
