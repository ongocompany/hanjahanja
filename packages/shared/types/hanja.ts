/** 개별 한자 글자 정보 (hanja_characters 테이블 대응) */
export interface HanjaCharacter {
  id: number;
  character: string; // 한자 1글자 (예: "經")
  reading: string; // 음 (예: "경")
  meaning: string; // 뜻 (예: "지날")
  level: number; // 급수 (8, 7.5, 7, ... 0)
  levelLabel: string; // 급수 라벨 (예: "7급", "준7급")
  strokeCount?: number; // 획수
  radical?: string; // 부수
}

/** 한자어 구성 글자 상세 정보 */
export interface CharDetail {
  char: string; // 한자 글자
  meaning: string; // 뜻
  reading: string; // 음
  level: number; // 급수
}

/** 한자어 매핑 정보 (hanja_words 테이블 대응) */
export interface HanjaWord {
  id: number;
  koreanWord: string; // 한글 단어 (예: "경제")
  hanja: string; // 한자 표기 (예: "經濟")
  reading: string; // 음 (예: "경제")
  meaning?: string; // 뜻
  wordLevel: number; // 단어 급수
  wordLevelLabel?: string; // 급수 라벨
  charDetails?: CharDetail[]; // 개별 한자 분해
  source?: string; // 데이터 출처
  frequency?: number; // 사용 빈도
  isVerified?: boolean; // 검증 완료 여부
}

/** 크롬 확장용 사전 JSON의 단어 엔트리 */
export interface DictEntry {
  hanja: string;
  reading: string;
  meaning: string;
  level: number;
  chars: CharDetail[];
}

/** 급수별 사전 JSON 타입 */
export type HanjaDict = Record<string, DictEntry>;

/** 한자 변환 매치 결과 */
export interface HanjaMatch {
  word: string; // 매칭된 한글 단어
  data: DictEntry; // 사전 데이터
  position: number; // 텍스트 내 위치
}
