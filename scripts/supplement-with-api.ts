/**
 * 국립국어원/우리말샘 API → 한자어 수집
 *
 * 사용법:
 *   pnpm --filter scripts supplement-api           # 국립국어원 API 만
 *   pnpm --filter scripts supplement-api --urimal  # 우리말샘 API 만
 *   pnpm --filter scripts supplement-api --both    # 둘 다
 *
 * API 에서 한자어 데이터를 수집하여 hanja_words 테이블에 저장합니다.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const niklApiKey = process.env.NIKL_API_KEY;
const urimalsaemApiKey = process.env.URIMALSAEM_API_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// 자주 쓰는 한자어 목록 (MVP 용 - 8 급~4 급 범위)
const FREQUENT_WORDS = [
  '경제', '사회', '문화', '정치', '교육', '과학', '기술', '환경',
  '인간', '관계', '발전', '성장', '변화', '혁신', '창조', '자유',
  '민주', '공화', '법률', '제도', '정책', '행정', '관리', '운영',
  '생산', '소비', '투자', '무역', '산업', '기업', '노동', '임금',
  '국제', '외교', '협력', '평화', '전쟁', '군대', '국방', '안전',
  '건강', '의료', '질병', '치료', '예방', '운동', '체육', '경기',
  '예술', '문학', '음악', '미술', '영화', '연극', '공연', '전시',
  '종교', '철학', '윤리', '도덕', '신앙', '기도', '예배', '사원',
  '학교', '학생', '교사', '수업', '시험', '학습', '연구', '학문',
  '가족', '부모', '자녀', '형제', '친구', '이웃', '결혼', '가정',
];

interface HanjaWord {
  korean_word: string;
  hanja: string;
  reading: string;
  meaning?: string;
  char_details?: Array<{
    char: string;
    reading: string;
    meaning: string;
    level: number;
  }>;
}

/**
 * 국립국어원 오픈 API 호출
 * https://opendict.korean.go.kr/service/openApiInfo
 */
async function searchNiklAPI(word: string): Promise<HanjaWord | null> {
  const url = `https://opendict.korean.go.kr/api/search?key=${niklApiKey}&q=${encodeURIComponent(word)}&method=exact&type1=word`;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    // XML 파싱 (간단하게 정규식으로 추출)
    const hanjaMatch = text.match(/<original_language>([^<]+)<\/original_language>/);
    const meaningMatch = text.match(/<definition>([^<]+)<\/definition>/);
    
    if (hanjaMatch) {
      return {
        korean_word: word,
        hanja: hanjaMatch[1],
        reading: word,
        meaning: meaningMatch ? meaningMatch[1].replace(/<[^>]*>/g, '') : undefined,
      };
    }
  } catch (error) {
    console.warn(`⚠️ ${word} API 호출 실패:`, error);
  }
  
  return null;
}

/**
 * 우리말샘 API 호출
 * https://opendict.korean.go.kr/service/openApiInfo
 */
async function searchUrimalsaemAPI(word: string): Promise<HanjaWord | null> {
  const url = `https://opendict.korean.go.kr/api/search?key=${urimalsaemApiKey}&q=${encodeURIComponent(word)}&method=exact&req_type=xml`;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    const hanjaMatch = text.match(/<word>([^<]+)<\/word>[\s\S]*?<original_language>([^<]+)<\/original_language>/);
    const meaningMatch = text.match(/<definition>([^<]+)<\/definition>/);
    
    if (hanjaMatch && hanjaMatch[2]) {
      return {
        korean_word: hanjaMatch[1] || word,
        hanja: hanjaMatch[2],
        reading: word,
        meaning: meaningMatch ? meaningMatch[1].replace(/<[^>]*>/g, '') : undefined,
      };
    }
  } catch (error) {
    console.warn(`⚠️ ${word} 우리말샘 API 호출 실패:`, error);
  }
  
  return null;
}

/**
 * 한자 개별 정보 DB 에서 조회
 */
async function getCharDetails(hanja: string): Promise<Array<{ char: string; reading: string; meaning: string; level: number }> | null> {
  const chars = hanja.split('');
  const details = [];
  
  for (const char of chars) {
    const { data, error } = await supabase
      .from('hanja_characters')
      .select('character, reading, meaning, level')
      .eq('character', char)
      .single();
    
    if (error || !data) {
      // DB 에 없는 한자는 스킵
      return null;
    }
    
    details.push({
      char: data.character,
      reading: data.reading,
      meaning: data.meaning,
      level: data.level,
    });
  }
  
  return details;
}

/**
 * 단어 급수 계산 (구성 한자 중 가장 어려운 급수)
 */
function calculateWordLevel(charDetails: Array<{ level: number }>): number {
  return Math.min(...charDetails.map(c => c.level));
}

async function main() {
  console.log('📚 API 한자어 수집을 시작합니다...\n');
  
  const args = process.argv.slice(2);
  const useUrimal = args.includes('--urimal') || args.includes('--both');
  const useNikl = args.includes('--both') || !args.includes('--urimal');
  
  console.log(`사용할 API: ${useNikl ? '국립국어원' : ''}${useNikl && useUrimal ? ' + ' : ''}${useUrimal ? '우리말샘' : ''}\n`);
  
  let collected = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const word of FREQUENT_WORDS) {
    process.stdout.write(`🔍 ${word}... `);
    
    // API 호출 (국립국어원 우선)
    let result: HanjaWord | null = null;
    if (useNikl) {
      result = await searchNiklAPI(word);
    }
    if (!result && useUrimal) {
      result = await searchUrimalsaemAPI(word);
    }
    
    if (!result) {
      console.log('❌ 없음');
      skipped++;
      continue;
    }
    
    // 한자 개별 정보 조회
    const charDetails = await getCharDetails(result.hanja);
    if (!charDetails) {
      console.log(`⚠️ 한자 정보 없음 (${result.hanja})`);
      skipped++;
      continue;
    }
    
    // 단어 급수 계산
    const wordLevel = calculateWordLevel(charDetails);
    const wordLevelLabel = getLevelLabel(wordLevel);
    
    // DB 에 저장
    const { error } = await supabase
      .from('hanja_words')
      .upsert({
        korean_word: result.korean_word,
        hanja: result.hanja,
        reading: result.reading,
        meaning: result.meaning,
        word_level: wordLevel,
        word_level_label: wordLevelLabel,
        char_details: charDetails,
        source: useNikl ? 'nikl_api' : 'urimalsaem_api',
        is_verified: true,
      }, { onConflict: 'korean_word,hanja' });
    
    if (error) {
      console.log(`❌ 저장 실패: ${error.message}`);
      errors++;
    } else {
      console.log(`✅ ${result.hanja} (${wordLevelLabel})`);
      collected++;
    }
    
    // API rate limiting (100ms 대기)
    await sleep(100);
  }
  
  console.log('\n📋 수집 완료!');
  console.log(`   수집: ${collected}개, 스킵: ${skipped}개, 오류: ${errors}개`);
  
  // 검증
  const { count } = await supabase
    .from('hanja_words')
    .select('*', { count: 'exact', head: true });
  
  console.log(`   현재 DB 에 ${count}개의 한자어가 있습니다.`);
}

function getLevelLabel(level: number): string {
  if (level === 0) return '특급';
  if (level >= 8) return '8 급';
  if (level >= 7.5) return '준 7 급';
  if (level >= 7) return '7 급';
  if (level >= 6.5) return '준 6 급';
  if (level >= 6) return '6 급';
  if (level >= 5.5) return '준 5 급';
  if (level >= 5) return '5 급';
  if (level >= 4.5) return '준 4 급';
  if (level >= 4) return '4 급';
  return '특급';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error('❌ 오류 발생:', err);
  process.exit(1);
});
