/**
 * 한자어 매핑 데이터 구축 (수동 큐레이션 CSV)
 *
 * 사용법: pnpm --filter scripts build-words
 *
 * scripts/data/hanja-words-manual.csv 파일을 읽어서
 * hanja_words 테이블에 임포트합니다.
 * 각 한자어의 급수는 hanja_characters 테이블에서 자동 계산됩니다.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const csvPath = join(__dirname, 'data/hanja-words-manual.csv');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * 급수 라벨을 숫자로 변환
 */
function levelLabelToNumber(label: string): number {
  const map: Record<string, number> = {
    '8 급': 8,
    '준 7 급': 7.5,
    '7 급': 7,
    '준 6 급': 6.5,
    '6 급': 6,
    '준 5 급': 5.5,
    '5 급': 5,
    '준 4 급': 4.5,
    '4 급': 4,
    '특급': 0,
  };
  return map[label] || 8;
}

/**
 * 단어 급수 계산 (구성 한자 중 가장 어려운 급수)
 */
async function calculateWordLevel(hanja: string): Promise<{ level: number; label: string; details: any[] } | null> {
  const chars = hanja.split('');
  const details = [];
  let hardestLevel = 8;
  
  for (const char of chars) {
    const { data, error } = await supabase
      .from('hanja_characters')
      .select('character, reading, meaning, level')
      .eq('character', char)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    details.push({
      char: data.character,
      reading: data.reading,
      meaning: data.meaning,
      level: data.level,
    });
    
    hardestLevel = Math.min(hardestLevel, data.level);
  }
  
  const labelMap: Record<number, string> = {
    8: '8 급',
    7.5: '준 7 급',
    7: '7 급',
    6.5: '준 6 급',
    6: '6 급',
    5.5: '준 5 급',
    5: '5 급',
    4.5: '준 4 급',
    4: '4 급',
    0: '특급',
  };
  
  return {
    level: hardestLevel,
    label: labelMap[hardestLevel] || '8 급',
    details,
  };
}

async function main() {
  console.log('📚 한자어 매핑 데이터 구축을 시작합니다...\n');
  console.log(`📂 CSV 파일: ${csvPath}`);
  
  const csvContent = readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  
  console.log(`📊 총 ${records.length}개의 한자어를 찾았습니다.\n`);
  
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  const batchSize = 50;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const insertData = [];
    
    for (const row of batch) {
      const levelInfo = await calculateWordLevel(row.hanja);
      
      if (!levelInfo) {
        console.log(`⚠️ 한자 정보 없음: ${row.korean} (${row.hanja})`);
        skipped++;
        continue;
      }
      
      insertData.push({
        korean_word: row.korean,
        hanja: row.hanja,
        reading: row.korean,
        meaning: row.meaning,
        word_level: levelInfo.level,
        word_level_label: levelInfo.label,
        char_details: levelInfo.details,
        source: 'manual_curated',
        is_verified: true,
        frequency: 100 - (levelInfo.level * 10),
      });
    }
    
    if (insertData.length > 0) {
      const { error } = await supabase
        .from('hanja_words')
        .upsert(insertData, { onConflict: 'korean_word,hanja' });
      
      if (error) {
        console.log(`❌ 배치 ${Math.ceil((i + batchSize) / batchSize)} 실패: ${error.message}`);
        errors++;
      } else {
        console.log(`✅ 배치 ${Math.ceil((i + batchSize) / batchSize)}: ${insertData.length}개 삽입`);
        inserted += insertData.length;
      }
    }
  }
  
  console.log('\n📋 구축 완료!');
  console.log(`   삽입: ${inserted}개, 스킵: ${skipped}개, 오류: ${errors}개`);
  
  const { count } = await supabase
    .from('hanja_words')
    .select('*', { count: 'exact', head: true });
  
  console.log(`   현재 DB 에 ${count}개의 한자어가 있습니다.`);
  
  console.log('\n📊 급수별 분포:');
  const { data: levelStats } = await supabase
    .from('hanja_words')
    .select('word_level_label')
    .order('word_level', { ascending: true });
  
  if (levelStats) {
    const distribution: Record<string, number> = {};
    for (const row of levelStats) {
      distribution[row.word_level_label] = (distribution[row.word_level_label] || 0) + 1;
    }
    for (const [level, count] of Object.entries(distribution)) {
      console.log(`   ${level}: ${count}개`);
    }
  }
}

main().catch((err) => {
  console.error('❌ 오류 발생:', err);
  process.exit(1);
});
