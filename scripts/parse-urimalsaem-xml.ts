/**
 * 국립국어원 사전 XML → 한자어 추출 + hanja_words 테이블 임포트
 *
 * 사용법: pnpm --filter scripts parse-urimalsaem
 *
 * SAX 스트리밍 파서로 메모리 효율적 처리
 * opendict(우리말샘) + stdict(표준국어대사전) XML → 한자어 추출 → DB 임포트
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import sax from 'sax';
import { createReadStream, readdirSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface HanjaWordEntry {
  korean_word: string;
  hanja: string;
  meaning: string;
  pos: string;
  source: string;
}

// CJK Unified Ideographs + Extension A + Compatibility + Extension B
function isHanjaChar(ch: string): boolean {
  const code = ch.codePointAt(0) || 0;
  return (
    (code >= 0x4E00 && code <= 0x9FFF) ||
    (code >= 0x3400 && code <= 0x4DBF) ||
    (code >= 0xF900 && code <= 0xFAFF) ||
    (code >= 0x20000 && code <= 0x2A6DF)
  );
}

function isPureHanja(str: string): boolean {
  if (!str || str.length === 0) return false;
  return [...str].every(isHanjaChar);
}

// "가03" → "가", "경제-적" → "경제적"
function cleanKoreanWord(word: string): string {
  return word.replace(/\d+$/, '').replace(/[-^]/g, '').trim();
}

function extractPureHanja(original: string): string {
  return [...original].filter(isHanjaChar).join('');
}

function isValidHanjaWord(cleaned: string, hanjaChars: string): boolean {
  return (
    cleaned.length > 0 &&
    hanjaChars.length >= 2 &&
    isPureHanja(hanjaChars) &&
    Math.abs(cleaned.length - hanjaChars.length) <= 2
  );
}

// ============================================================
// SAX 스트리밍 파서 — opendict (우리말샘)
// <item> > <wordInfo> > word, word_type, <original_language_info>
// <item> > <senseInfo> > definition, pos
// ============================================================

function parseOpendictStream(filePath: string): Promise<HanjaWordEntry[]> {
  return new Promise((res, rej) => {
    const entries: HanjaWordEntry[] = [];
    const parser = sax.createStream(true, { trim: true });

    let inItem = false;
    let inWordInfo = false;
    let inSenseInfo = false;
    let inOrigLangInfo = false;
    let textBuffer = '';

    let word = '';
    let wordType = '';
    let hanjaChars = '';
    let currentLangType = '';
    let currentOrigLang = '';
    let meaning = '';
    let pos = '';

    parser.on('opentag', (node) => {
      textBuffer = '';
      if (node.name === 'item') {
        inItem = true; word = ''; wordType = ''; hanjaChars = ''; meaning = ''; pos = '';
      } else if (node.name === 'wordInfo') {
        inWordInfo = true;
      } else if (node.name === 'senseInfo') {
        inSenseInfo = true;
      } else if (node.name === 'original_language_info') {
        inOrigLangInfo = true; currentLangType = ''; currentOrigLang = '';
      }
    });

    parser.on('text', (t) => { textBuffer += t; });
    parser.on('cdata', (c) => { textBuffer += c; });

    parser.on('closetag', (name) => {
      if (name === 'item') {
        if (wordType === '한자어') {
          const cleaned = cleanKoreanWord(word);
          if (isValidHanjaWord(cleaned, hanjaChars)) {
            entries.push({ korean_word: cleaned, hanja: hanjaChars, meaning, pos, source: 'opendict' });
          }
        }
        inItem = false; inWordInfo = false; inSenseInfo = false;
      } else if (name === 'wordInfo') {
        inWordInfo = false;
      } else if (name === 'senseInfo') {
        inSenseInfo = false;
      } else if (name === 'original_language_info') {
        if (currentLangType === '한자') hanjaChars += extractPureHanja(currentOrigLang);
        inOrigLangInfo = false;
      }

      if (inItem && inWordInfo) {
        if (name === 'word' && !inOrigLangInfo) word = textBuffer;
        if (name === 'word_type') wordType = textBuffer;
        if (inOrigLangInfo) {
          if (name === 'language_type') currentLangType = textBuffer;
          if (name === 'original_language') currentOrigLang = textBuffer;
        }
      }
      if (inItem && inSenseInfo) {
        if (name === 'definition' && !meaning) meaning = textBuffer;
        if (name === 'pos' && !pos) pos = textBuffer;
      }

      textBuffer = '';
    });

    parser.on('end', () => res(entries));
    parser.on('error', (err) => {
      // XML 오류 복구 — 파싱 계속 진행
      (parser as any)._parser.error = null;
      (parser as any)._parser.resume();
    });

    createReadStream(filePath, { encoding: 'utf-8' }).pipe(parser);
  });
}

// ============================================================
// SAX 스트리밍 파서 — stdict (표준국어대사전)
// 구조 차이: <word_info>, pos_info > comm_pattern_info > sense_info
// ============================================================

function parseStdictStream(filePath: string): Promise<HanjaWordEntry[]> {
  return new Promise((res, rej) => {
    const entries: HanjaWordEntry[] = [];
    const parser = sax.createStream(true, { trim: true });

    let inItem = false;
    let inWordInfo = false;
    let inOrigLangInfo = false;
    let inSenseInfo = false;
    let wordCaptured = false;
    let wordTypeCaptured = false;
    let textBuffer = '';

    let word = '';
    let wordType = '';
    let hanjaChars = '';
    let currentLangType = '';
    let currentOrigLang = '';
    let meaning = '';
    let pos = '';

    parser.on('opentag', (node) => {
      textBuffer = '';
      if (node.name === 'item') {
        inItem = true; word = ''; wordType = ''; hanjaChars = ''; meaning = ''; pos = '';
        wordCaptured = false; wordTypeCaptured = false;
      } else if (node.name === 'word_info') {
        inWordInfo = true;
      } else if (node.name === 'original_language_info') {
        inOrigLangInfo = true; currentLangType = ''; currentOrigLang = '';
      } else if (node.name === 'sense_info') {
        inSenseInfo = true;
      }
    });

    parser.on('text', (t) => { textBuffer += t; });
    parser.on('cdata', (c) => { textBuffer += c; });

    parser.on('closetag', (name) => {
      if (name === 'item') {
        if (wordType === '한자어') {
          const cleaned = cleanKoreanWord(word);
          if (isValidHanjaWord(cleaned, hanjaChars)) {
            entries.push({ korean_word: cleaned, hanja: hanjaChars, meaning, pos, source: 'stdict' });
          }
        }
        inItem = false; inWordInfo = false; inSenseInfo = false;
      } else if (name === 'word_info') {
        inWordInfo = false;
      } else if (name === 'original_language_info') {
        if (currentLangType === '한자') hanjaChars += extractPureHanja(currentOrigLang);
        inOrigLangInfo = false;
      } else if (name === 'sense_info') {
        inSenseInfo = false;
      }

      // stdict는 <word_info> 안에 relation_info, lexical_info 등 중첩 <word> 존재
      // 첫 번째 <word>, <word_type>만 캡처하고 이후 무시
      if (inItem && inWordInfo) {
        if (name === 'word' && !inOrigLangInfo && !wordCaptured) {
          word = textBuffer; wordCaptured = true;
        }
        if (name === 'word_type' && !wordTypeCaptured) {
          wordType = textBuffer; wordTypeCaptured = true;
        }
        if (inOrigLangInfo) {
          if (name === 'language_type') currentLangType = textBuffer;
          if (name === 'original_language') currentOrigLang = textBuffer;
        }
      }
      if (inItem && inWordInfo && name === 'pos' && !pos) pos = textBuffer;
      if (inItem && inSenseInfo && name === 'definition' && !meaning) meaning = textBuffer;

      textBuffer = '';
    });

    parser.on('end', () => res(entries));
    parser.on('error', () => {
      (parser as any)._parser.error = null;
      (parser as any)._parser.resume();
    });

    createReadStream(filePath, { encoding: 'utf-8' }).pipe(parser);
  });
}

// ============================================================
// hanja_characters 캐시 (Supabase 페이징 로드)
// ============================================================

interface CharInfo {
  character: string;
  reading: string;
  meaning: string;
  level: number;
  level_label: string;
}

async function loadCharacterCache(): Promise<Map<string, CharInfo>> {
  console.log('📥 hanja_characters 테이블 로드 중...');
  const cache = new Map<string, CharInfo>();
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('hanja_characters')
      .select('character, reading, meaning, level, level_label')
      .range(offset, offset + pageSize - 1);

    if (error) { console.error('❌ 로드 실패:', error.message); break; }
    if (!data || data.length === 0) break;
    for (const row of data) cache.set(row.character, row);
    offset += pageSize;
    if (data.length < pageSize) break;
  }

  console.log(`✅ ${cache.size}개 한자 캐시 로드 완료\n`);
  return cache;
}

function calculateWordLevel(
  hanja: string,
  charCache: Map<string, CharInfo>
): { level: number; label: string; details: any[] } | null {
  const chars = [...hanja];
  const details: any[] = [];
  let hardestLevel = 8;

  for (const char of chars) {
    const info = charCache.get(char);
    if (!info) return null;
    details.push({ char: info.character, reading: info.reading, meaning: info.meaning, level: info.level });
    hardestLevel = Math.min(hardestLevel, info.level);
  }

  const labelMap: Record<number, string> = {
    8: '8급', 7.5: '준7급', 7: '7급', 6.5: '준6급',
    6: '6급', 5.5: '준5급', 5: '5급', 4.5: '준4급',
    4: '4급', 3.5: '준3급', 3: '3급', 2.5: '준2급',
    2: '2급', 1.5: '준1급', 1: '1급', 0.5: '준특급', 0: '특급',
  };

  return { level: hardestLevel, label: labelMap[hardestLevel] || `${hardestLevel}급`, details };
}

// ============================================================
// 메인
// ============================================================

async function main() {
  console.log('🚀 국립국어원 사전 XML → 한자어 추출 시작 (SAX 스트리밍)\n');

  const dictRoot = resolve(__dirname, '../korean-dict-nikl');
  const uniqueMap = new Map<string, HanjaWordEntry>();

  // --- opendict ---
  const opendictDir = join(dictRoot, 'opendict');
  const opendictFiles = readdirSync(opendictDir).filter(f => f.endsWith('.xml')).sort();
  console.log(`📂 opendict(우리말샘): ${opendictFiles.length}개 XML 파일`);

  for (const file of opendictFiles) {
    const entries = await parseOpendictStream(join(opendictDir, file));
    for (const e of entries) {
      const key = `${e.korean_word}|${e.hanja}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, e);
    }
    process.stdout.write(`  ✅ ${file}: ${entries.length}개 한자어\n`);
  }

  const afterOpendict = uniqueMap.size;
  console.log(`  → opendict 고유: ${afterOpendict}개\n`);

  // --- stdict (표준국어대사전 우선 → 덮어쓰기) ---
  const stdictDir = join(dictRoot, 'stdict');
  const stdictFiles = readdirSync(stdictDir).filter(f => f.endsWith('.xml')).sort();
  console.log(`📂 stdict(표준국어대사전): ${stdictFiles.length}개 XML 파일`);

  for (const file of stdictFiles) {
    const entries = await parseStdictStream(join(stdictDir, file));
    for (const e of entries) uniqueMap.set(`${e.korean_word}|${e.hanja}`, e);
    process.stdout.write(`  ✅ ${file}: ${entries.length}개 한자어\n`);
  }

  console.log(`  → 총 고유 한자어: ${uniqueMap.size}개 (stdict 추가: ${uniqueMap.size - afterOpendict}개)\n`);

  const uniqueEntries = Array.from(uniqueMap.values());

  // CSV 백업
  const csvPath = join(__dirname, 'data/hanja-words-extracted.csv');
  const csvHeader = 'korean,hanja,meaning,pos,source';
  const csvRows = uniqueEntries.map(e =>
    `${e.korean_word},${e.hanja},"${(e.meaning || '').replace(/"/g, '""')}",${e.pos || ''},${e.source}`
  );
  writeFileSync(csvPath, [csvHeader, ...csvRows].join('\n'), 'utf-8');
  console.log(`💾 CSV 백업: ${csvPath}\n`);

  // hanja_characters 캐시 로드
  const charCache = await loadCharacterCache();

  // DB 임포트
  console.log('📤 hanja_words 임포트 시작...\n');
  let imported = 0;
  let skippedNoChar = 0;
  let errorCount = 0;
  const batchSize = 200;

  for (let i = 0; i < uniqueEntries.length; i += batchSize) {
    const batch = uniqueEntries.slice(i, i + batchSize);
    const insertData: any[] = [];

    for (const entry of batch) {
      const levelInfo = calculateWordLevel(entry.hanja, charCache);
      if (!levelInfo) { skippedNoChar++; continue; }

      insertData.push({
        korean_word: entry.korean_word,
        hanja: entry.hanja,
        reading: entry.korean_word,
        meaning: entry.meaning || null,
        word_level: levelInfo.level,
        word_level_label: levelInfo.label,
        char_details: levelInfo.details,
        source: entry.source,
        is_verified: true,
        frequency: 0,
      });
    }

    if (insertData.length === 0) continue;

    const { error } = await supabase.from('hanja_words').insert(insertData);

    if (error) {
      console.error(`  ❌ 배치 ${Math.ceil(i / batchSize) + 1} 실패: ${error.message}`);
      errorCount++;
    } else {
      imported += insertData.length;
    }

    if (Math.ceil(i / batchSize) % 20 === 0 || i + batchSize >= uniqueEntries.length) {
      const pct = Math.min(100, Math.round((i + batchSize) / uniqueEntries.length * 100));
      console.log(`  📦 ${pct}% (${imported}개 임포트 / ${skippedNoChar}개 스킵)`);
    }
  }

  // 결과 요약
  console.log('\n' + '='.repeat(50));
  console.log('📋 한자어 데이터 구축 완료!');
  console.log('='.repeat(50));
  console.log(`  고유 한자어:      ${uniqueEntries.length}개`);
  console.log(`  DB 임포트:       ${imported}개`);
  console.log(`  급수 매칭 불가:   ${skippedNoChar}개`);
  console.log(`  오류:            ${errorCount}개`);

  const { count } = await supabase.from('hanja_words').select('*', { count: 'exact', head: true });
  console.log(`\n  🗄️  hanja_words 총: ${count}개`);

  console.log('\n📊 급수별 분포:');
  const { data: allWords } = await supabase
    .from('hanja_words')
    .select('word_level_label, word_level')
    .order('word_level', { ascending: false });

  if (allWords) {
    const dist: Record<string, number> = {};
    for (const row of allWords) dist[row.word_level_label || '미분류'] = (dist[row.word_level_label || '미분류'] || 0) + 1;

    for (const label of ['8급','준7급','7급','준6급','6급','준5급','5급','준4급','4급','준3급','3급','준2급','2급','준1급','1급','준특급','특급']) {
      if (dist[label]) console.log(`  ${label}: ${dist[label]}개`);
    }
  }
}

main().catch((err) => {
  console.error('❌ 오류 발생:', err);
  process.exit(1);
});
