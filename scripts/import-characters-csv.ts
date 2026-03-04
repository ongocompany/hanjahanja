/**
 * PM 보유 개별 한자 CSV → hanja_characters 테이블 임포트
 *
 * 사용법: pnpm --filter scripts import-characters
 *
 * CSV 형식:
 * character,reading,meaning,level,level_label,radical,stroke_count
 * 經,경,지날,7,7 급，糸，9
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 루트 .env.local 읽기
config({ path: resolve(__dirname, '../.env.local') });

// 환경 변수 검증
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const csvPath = process.env.CSV_PATH || join(__dirname, '../docs/reference/hanja_characters.csv');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  console.error('NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 를 확인하세요.');
  process.exit(1);
}

// Supabase 클라이언트 생성 (service_role 키 사용 - RLS 우회)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function main() {
  console.log('📚 한자 CSV 임포트를 시작합니다...\n');
  console.log(`📂 CSV 파일: ${csvPath}`);

  // CSV 파일 읽기
  const csvContent = readFileSync(csvPath, 'utf-8');
  
  // CSV 파싱
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📊 총 ${records.length}개의 한자를 찾았습니다.\n`);

  // 배치 삽입 (100 개씩)
  const batchSize = 100;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    // DB 삽입용 데이터 매핑
    const insertData = batch.map((row: any) => ({
      character: row.character,
      reading: row.reading,
      meaning: row.meaning,
      level: parseFloat(row.level),
      level_label: row.level_label,
      radical: row.radical || null,
      stroke_count: row.stroke_count ? parseInt(row.stroke_count) : null,
    }));

    // 삽입 실행
    const { data, error } = await supabase
      .from('hanja_characters')
      .upsert(insertData, { onConflict: 'character' })
      .select();

    if (error) {
      console.error(`❌ 배치 ${i / batchSize + 1} 실패:`, error.message);
      errors++;
    } else {
      inserted += data.length;
      console.log(`✅ 배치 ${Math.ceil((i + batchSize) / batchSize)}: ${data.length}개 삽입`);
    }
  }

  // 결과 요약
  console.log('\n📋 임포트 완료!');
  console.log(`   총 ${records.length}개 중 ${inserted}개 성공, ${errors}개 실패`);

  // 검증: 실제 삽입된 데이터 확인
  const { count, error: countError } = await supabase
    .from('hanja_characters')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ 검증 실패:', countError.message);
  } else {
    console.log(`   현재 DB 에 ${count}개의 한자가 있습니다.`);
  }

  // 급수별 분포 확인
  console.log('\n📊 급수별 분포:');
  const { data: levelDist, error: levelError } = await supabase
    .from('hanja_characters')
    .select('level_label')
    .eq('level', 0); // 특급만 확인

  if (!levelError && levelDist) {
    console.log(`   특급: ${levelDist.length}개`);
  }
}

main().catch((err) => {
  console.error('❌ 오류 발생:', err);
  process.exit(1);
});
