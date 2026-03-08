#!/usr/bin/env tsx
/**
 * 동음이의어 빈도 데이터 생성
 *
 * 데이터 소스:
 * 1. stdict (표준국어대사전) — 뜻풀이/예문 수 기반 가중치
 * 2. 국회 속기록 크롤링 — 실제 사용 빈도
 *
 * 출력: apps/extension/public/dict/homonym-freq.json
 * 형식: { [reading: string]: { [hanja: string]: number } }
 *   → 숫자가 높을수록 해당 한자가 더 흔함
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const stdictDir = join(__dirname, '..', 'korean-dict-nikl', 'stdict');
const dictDir = join(__dirname, '..', 'apps', 'extension', 'public', 'dict');
const historyPairsPath = join(__dirname, 'history-hanja-pairs.json');
const outputPath = join(dictDir, 'homonym-freq.json');

// ─── 1. 한자 사전 로드 (동음이의어 목록 파악) ───

interface DictEntry {
  hanja: string;
  reading: string;
  level: number;
}

function loadHomonyms(): Map<string, string[]> {
  const manifest = JSON.parse(readFileSync(join(dictDir, 'manifest.json'), 'utf-8'));
  const wordToHanja = new Map<string, Set<string>>();

  for (const levelInfo of manifest.levels) {
    const data = JSON.parse(readFileSync(join(dictDir, levelInfo.fileName), 'utf-8'));
    for (const [reading, entries] of Object.entries(data)) {
      if (!wordToHanja.has(reading)) wordToHanja.set(reading, new Set());
      for (const entry of entries as DictEntry[]) {
        wordToHanja.get(reading)!.add(entry.hanja);
      }
    }
  }

  // 동음이의어만 필터 (2개 이상)
  const homonyms = new Map<string, string[]>();
  for (const [reading, hanjaSet] of wordToHanja) {
    if (hanjaSet.size >= 2) {
      homonyms.set(reading, [...hanjaSet]);
    }
  }

  console.log(`동음이의어: ${homonyms.size}개 (전체 ${wordToHanja.size}개 중)`);
  return homonyms;
}

// ─── 2. stdict 빈도 추출 ───

function extractStdictFreq(): Map<string, Map<string, number>> {
  const freq = new Map<string, Map<string, number>>();

  const files = readdirSync(stdictDir).filter(f => f.endsWith('.xml'));
  console.log(`stdict XML ${files.length}개 파싱 중...`);

  for (const file of files) {
    const xml = readFileSync(join(stdictDir, file), 'utf-8');
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const item = match[1];

      // 한자어만
      const wtMatch = item.match(/<word_type>(.*?)<\/word_type>/);
      if (!wtMatch || wtMatch[1] !== '한자어') continue;

      // 단어
      const wordMatch = item.match(/<word><!\[CDATA\[(.*?)\]\]><\/word>/);
      if (!wordMatch) continue;
      const rawWord = wordMatch[1].replace(/\d+$/, '').replace(/\^/g, '').replace(/-/g, '').trim();
      if (rawWord.length < 2) continue;

      // 한자 원어
      const origMatch = item.match(/<original_language><!\[CDATA\[(.*?)\]\]><\/original_language>/);
      if (!origMatch) continue;
      const hanja = origMatch[1].trim();
      if (!hanja || hanja.length < 2) continue;

      // 가중치: 뜻 수 + 예문 수
      const senseCount = (item.match(/<sense_info>/g) || []).length;
      const exampleCount = (item.match(/<example>/g) || []).length;
      const weight = senseCount + exampleCount;

      if (!freq.has(rawWord)) freq.set(rawWord, new Map());
      const hanjaMap = freq.get(rawWord)!;
      hanjaMap.set(hanja, (hanjaMap.get(hanja) ?? 0) + weight);
    }
  }

  console.log(`stdict 빈도: ${freq.size}개 단어`);
  return freq;
}

// ─── 3. 국회 속기록 빈도 로드 ───

function loadHistoryFreq(): Map<string, Map<string, number>> {
  const freq = new Map<string, Map<string, number>>();

  if (!readFileSync(historyPairsPath, 'utf-8')) {
    console.log('속기록 데이터 없음 — 스킵');
    return freq;
  }

  const data = JSON.parse(readFileSync(historyPairsPath, 'utf-8'));
  const rawFreq = data.frequency as Record<string, Record<string, number>>;

  for (const [reading, hanjaMap] of Object.entries(rawFreq)) {
    freq.set(reading, new Map(Object.entries(hanjaMap)));
  }

  console.log(`속기록 빈도: ${freq.size}개 단어`);
  return freq;
}

// ─── 4. 병합 ───

function mergeFrequencies(
  homonyms: Map<string, string[]>,
  stdictFreq: Map<string, Map<string, number>>,
  historyFreq: Map<string, Map<string, number>>,
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};

  // stdict 가중치 3배 (더 범용적), 속기록 1배 (도메인 편향)
  const STDICT_WEIGHT = 3;
  const HISTORY_WEIGHT = 1;

  for (const [reading, hanjaList] of homonyms) {
    const merged = new Map<string, number>();

    // stdict 빈도
    const stdict = stdictFreq.get(reading);
    if (stdict) {
      for (const [hanja, score] of stdict) {
        // 사전에 있는 한자어만
        if (hanjaList.includes(hanja)) {
          merged.set(hanja, (merged.get(hanja) ?? 0) + score * STDICT_WEIGHT);
        }
      }
    }

    // 속기록 빈도
    const history = historyFreq.get(reading);
    if (history) {
      for (const [hanja, count] of history) {
        if (hanjaList.includes(hanja)) {
          merged.set(hanja, (merged.get(hanja) ?? 0) + count * HISTORY_WEIGHT);
        }
      }
    }

    // 빈도 데이터가 있는 경우만 저장
    if (merged.size > 0) {
      const sorted = [...merged.entries()].sort((a, b) => b[1] - a[1]);
      result[reading] = Object.fromEntries(sorted);
    }
  }

  return result;
}

// ─── 5. 실행 ───

const homonyms = loadHomonyms();
const stdictFreq = extractStdictFreq();
const historyFreq = loadHistoryFreq();
const merged = mergeFrequencies(homonyms, stdictFreq, historyFreq);

// 통계
const totalHomonyms = homonyms.size;
const coveredHomonyms = Object.keys(merged).length;
console.log(`\n=== 결과 ===`);
console.log(`동음이의어: ${totalHomonyms}개`);
console.log(`빈도 데이터 있음: ${coveredHomonyms}개 (${(coveredHomonyms / totalHomonyms * 100).toFixed(1)}%)`);

// 문제 단어 검증
const testWords = ['전통', '공동', '관계', '교수', '분석', '남편', '부부', '경향', '상대',
  '시장', '감사', '정도', '이상', '기관', '사고', '주의', '연구', '자본'];

console.log(`\n=== 검증 (문제 단어) ===`);
for (const word of testWords) {
  const freq = merged[word];
  if (freq) {
    const entries = Object.entries(freq);
    const total = entries.reduce((sum, [, v]) => sum + v, 0);
    const topPct = ((entries[0][1] / total) * 100).toFixed(0);
    const ranking = entries.slice(0, 4).map(([h, c]) => `${h}(${c})`).join(' > ');
    const confidence = Number(topPct) > 50 ? '🟢' : '🟠';
    console.log(`  ${confidence} ${word}: ${ranking} (1순위 ${topPct}%)`);
  }
}

// 파일 크기 최적화: 스코어를 정수로 반올림
const optimized: Record<string, Record<string, number>> = {};
for (const [reading, hanjaMap] of Object.entries(merged)) {
  optimized[reading] = {};
  for (const [hanja, score] of Object.entries(hanjaMap)) {
    optimized[reading][hanja] = Math.round(score);
  }
}

writeFileSync(outputPath, JSON.stringify(optimized), 'utf-8');
const fileSizeKB = (Buffer.byteLength(JSON.stringify(optimized)) / 1024).toFixed(0);
console.log(`\n저장: ${outputPath} (${fileSizeKB}KB)`);
