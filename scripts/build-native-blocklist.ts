#!/usr/bin/env tsx
/**
 * 고유어 블록리스트 생성 스크립트
 *
 * 1. 표준국어대사전(stdict) XML에서 고유어/한자어 분류 추출
 * 2. 한자 사전(dict JSON)에서 동일 reading이 있는지 확인
 * 3. 조건:
 *    - stdict에 고유어 항목이 있고
 *    - stdict에 한자어 항목이 없고 (한자어로도 쓰이면 차단하면 안 됨)
 *    - 한자 사전의 해당 항목이 모두 3급 이하(level ≤ 3)인 경우만 블록리스트에 추가
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const stdictDir = join(__dirname, '..', 'korean-dict-nikl', 'stdict');
const dictDir = join(__dirname, '..', 'apps', 'extension', 'public', 'dict');

// ─── 1. stdict XML에서 고유어 + 한자어 분류 추출 ───

function extractWordTypes(): { nativeOnly: Set<string>; alsoHanja: Set<string> } {
  const nativeWords = new Set<string>();
  const hanjaWords = new Set<string>();

  const files = readdirSync(stdictDir).filter(f => f.endsWith('.xml'));
  console.log(`stdict XML 파일 ${files.length}개 파싱 중...`);

  for (const file of files) {
    const xml = readFileSync(join(stdictDir, file), 'utf-8');

    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];

      const wordTypeMatch = itemXml.match(/<word_type>(.*?)<\/word_type>/);
      if (!wordTypeMatch) continue;

      const wordMatch = itemXml.match(/<word><!\[CDATA\[(.*?)\]\]><\/word>/);
      if (!wordMatch) continue;

      const rawWord = wordMatch[1].replace(/\d+$/, '').trim();
      if (rawWord.length < 2) continue;

      const wordType = wordTypeMatch[1];
      if (wordType === '고유어') {
        nativeWords.add(rawWord);
      } else if (wordType === '한자어') {
        hanjaWords.add(rawWord);
      }
    }
  }

  // 고유어이면서 한자어 항목이 없는 단어만
  const nativeOnly = new Set<string>();
  const alsoHanja = new Set<string>();

  for (const word of nativeWords) {
    if (hanjaWords.has(word)) {
      alsoHanja.add(word);
    } else {
      nativeOnly.add(word);
    }
  }

  console.log(`고유어 단어: ${nativeWords.size}개`);
  console.log(`  - 순수 고유어 (한자어 항목 없음): ${nativeOnly.size}개`);
  console.log(`  - 고유어+한자어 모두 있음 (제외): ${alsoHanja.size}개`);

  return { nativeOnly, alsoHanja };
}

// ─── 2. 한자 사전 로드 ───

interface DictEntry {
  hanja: string;
  reading: string;
  meaning: string;
  level: number;
  source: string;
  chars: Array<{ char: string; reading: string; meaning: string; level: number }>;
}

type HanjaDict = Record<string, DictEntry[]>;

function loadHanjaDict(): HanjaDict {
  const manifest = JSON.parse(readFileSync(join(dictDir, 'manifest.json'), 'utf-8'));
  const allDict: HanjaDict = {};

  for (const levelInfo of manifest.levels) {
    const filePath = join(dictDir, levelInfo.fileName);
    const data: HanjaDict = JSON.parse(readFileSync(filePath, 'utf-8'));

    for (const [word, entries] of Object.entries(data)) {
      if (!allDict[word]) allDict[word] = [];
      allDict[word].push(...entries);
    }
  }

  console.log(`한자 사전 로드 완료: ${Object.keys(allDict).length}개 단어`);
  return allDict;
}

// ─── 3. 교차 비교 + 3급 필터링 ───

function buildBlocklist(nativeOnly: Set<string>, hanjaDict: HanjaDict): string[] {
  const candidates: Array<{ word: string; maxLevel: number; entries: string[] }> = [];

  for (const word of nativeOnly) {
    const entries = hanjaDict[word];
    if (!entries || entries.length === 0) continue;

    const maxLevel = Math.max(...entries.map(e => e.level));

    // 4급 이상이면 흔한 한자어일 수 있으므로 제외
    if (maxLevel >= 4) continue;

    candidates.push({
      word,
      maxLevel,
      entries: entries.map(e => `${e.hanja}(${e.level}급)`),
    });
  }

  candidates.sort((a, b) => a.word.localeCompare(b.word, 'ko'));

  console.log(`\n=== 순수 고유어 중 3급 이하 한자 동음이의어: ${candidates.length}개 ===\n`);

  for (const c of candidates) {
    console.log(`  ${c.word} → ${c.entries.join(', ')} (최고 ${c.maxLevel}급)`);
  }

  return candidates.map(c => c.word);
}

// ─── 실행 ───

const { nativeOnly, alsoHanja } = extractWordTypes();
const hanjaDict = loadHanjaDict();
const blocklist = buildBlocklist(nativeOnly, hanjaDict);

const outputPath = join(__dirname, 'native-korean-blocklist.json');
writeFileSync(outputPath, JSON.stringify(blocklist, null, 2), 'utf-8');
console.log(`\n블록리스트 저장: ${outputPath} (${blocklist.length}개 단어)`);

// 기존 블록리스트와 비교
const existingBlocklist = [
  '우리', '너희', '여기', '거기', '어디', '이리', '저리',
  '서로', '다시', '미리', '모두',
  '아버지', '어머니', '오빠', '언니', '누나', '동생',
  '아기', '아우', '사위',
  '머리', '허리', '이마',
  '바다', '바람', '노을', '서리', '이슬',
  '여우', '오리', '개미', '모기', '거미', '하마',
  '고추', '감자', '배추', '가지', '열매', '보리', '가루', '고기', '무우',
  '가위', '호미', '수저', '비누', '마루', '시루', '고리',
  '하나', '마리',
  '사이', '여보', '나라', '아이', '소리', '나이',
  '자리', '무리', '누리', '노래', '이루', '어리',
  '가리', '도리', '수리', '구리', '부리',
];

const newWords = blocklist.filter(w => !existingBlocklist.includes(w));
const missingFromNew = existingBlocklist.filter(w => !blocklist.includes(w));

console.log(`\n=== 기존 블록리스트(${existingBlocklist.length}개)와 비교 ===`);
console.log(`새로 추가될 단어: ${newWords.length}개`);
if (newWords.length <= 100) {
  for (const w of newWords) console.log(`  + ${w}`);
}
console.log(`기존에만 있는 단어 (자동 필터에서 빠짐): ${missingFromNew.length}개`);
if (missingFromNew.length > 0) {
  console.log(`  ${missingFromNew.join(', ')}`);
}

// 제외된 고유어+한자어 단어 중 주요한 것들 확인
const excludedButInDict = [...alsoHanja].filter(w => hanjaDict[w]);
console.log(`\n=== 참고: 고유어+한자어 모두 있어서 제외된 단어 중 사전에 있는 것: ${excludedButInDict.length}개 ===`);
const examples = excludedButInDict.slice(0, 20);
for (const w of examples) {
  const entries = hanjaDict[w];
  if (entries) {
    console.log(`  ${w} → ${entries.map(e => `${e.hanja}(${e.level}급)`).join(', ')}`);
  }
}
console.log(`  ... (${excludedButInDict.length - examples.length}개 더)`);
