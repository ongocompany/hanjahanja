import { useState, useEffect } from "react";

// ─── 타입 ───
type TabId = "today" | "yesterday" | "about" | "settings";

interface QuizQuestion {
  word: string;       // 한글 (예: "경제")
  answer: string;     // 정답 한자 (예: "經濟")
  choices: string[];  // 4지선다
}

interface HanjaRank {
  rank: number;
  word: string;       // 한글
  hanja: string;      // 한자
  count: number;
}

interface VocabEntry {
  word: string;
  hanja: string;
  meaning: string;
  context: string;    // 저장 당시 문장
  savedAt: string;
}

// ─── 상수 ───
const LEVEL_OPTIONS = [
  { value: 8, label: "8급" },
  { value: 7.5, label: "준7급" },
  { value: 7, label: "7급" },
  { value: 6.5, label: "준6급" },
  { value: 6, label: "6급" },
  { value: 5.5, label: "준5급" },
  { value: 5, label: "5급" },
  { value: 4.5, label: "준4급" },
  { value: 4, label: "4급" },
  { value: 3.5, label: "준3급" },
  { value: 3, label: "3급" },
  { value: 2.5, label: "준2급" },
  { value: 2, label: "2급" },
  { value: 1.5, label: "준1급" },
  { value: 1, label: "1급" },
  { value: 0.5, label: "준특급" },
  { value: 0, label: "특급" },
];

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "today", label: "오늘의 한자", icon: "pencil" },
  { id: "yesterday", label: "어제의 한자", icon: "chart" },
  { id: "about", label: "한자한자", icon: "book" },
  { id: "settings", label: "설정", icon: "gear" },
];

// ─── Mock 데이터 (나중에 storage API로 교체) ───
const MOCK_QUIZ_EXPOSURE: QuizQuestion[] = [
  { word: "경제", answer: "經濟", choices: ["經濟", "京際", "景制", "更齊"] },
  { word: "정치", answer: "政治", choices: ["正値", "政治", "定致", "精置"] },
  { word: "교육", answer: "敎育", choices: ["交域", "敎育", "橋肉", "校育"] },
  { word: "사회", answer: "社會", choices: ["社會", "事回", "史繪", "私懷"] },
  { word: "문화", answer: "文化", choices: ["聞花", "門華", "文化", "紋火"] },
];

const MOCK_QUIZ_CLICK: QuizQuestion[] = [
  { word: "대통령", answer: "大統領", choices: ["大統領", "代通靈", "大桶嶺", "臺統領"] },
  { word: "국민", answer: "國民", choices: ["局旻", "國民", "菊敏", "鞠閔"] },
  { word: "민주", answer: "民主", choices: ["民主", "敏周", "閔朱", "旻柱"] },
  { word: "헌법", answer: "憲法", choices: ["獻法", "軒法", "憲法", "現罰"] },
  { word: "자유", answer: "自由", choices: ["自由", "子遊", "恣油", "慈幽"] },
];

const MOCK_IDIOM = {
  idiom: "經世濟民",
  reading: "경세제민",
  meaning: "세상을 다스리고 백성을 구함",
  relatedWord: "경제",
};

const MOCK_EXPOSURE_RANK: HanjaRank[] = [
  { rank: 1, word: "경제", hanja: "經濟", count: 47 },
  { rank: 2, word: "정치", hanja: "政治", count: 38 },
  { rank: 3, word: "사회", hanja: "社會", count: 35 },
  { rank: 4, word: "대통령", hanja: "大統領", count: 31 },
  { rank: 5, word: "국민", hanja: "國民", count: 28 },
  { rank: 6, word: "교육", hanja: "敎育", count: 24 },
  { rank: 7, word: "문화", hanja: "文化", count: 21 },
  { rank: 8, word: "역사", hanja: "歷史", count: 19 },
  { rank: 9, word: "전쟁", hanja: "戰爭", count: 17 },
  { rank: 10, word: "민주", hanja: "民主", count: 15 },
];

const MOCK_CLICK_RANK: HanjaRank[] = [
  { rank: 1, word: "헌법", hanja: "憲法", count: 12 },
  { rank: 2, word: "자유", hanja: "自由", count: 9 },
  { rank: 3, word: "경제", hanja: "經濟", count: 8 },
  { rank: 4, word: "민주", hanja: "民主", count: 7 },
  { rank: 5, word: "정치", hanja: "政治", count: 6 },
  { rank: 6, word: "역사", hanja: "歷史", count: 5 },
  { rank: 7, word: "대통령", hanja: "大統領", count: 4 },
  { rank: 8, word: "사회", hanja: "社會", count: 3 },
  { rank: 9, word: "국민", hanja: "國民", count: 3 },
  { rank: 10, word: "교육", hanja: "敎育", count: 2 },
];

const MOCK_VOCAB: VocabEntry[] = [
  { word: "경제", hanja: "經濟", meaning: "재화를 생산·분배·소비하는 활동", context: "한국 經濟가 회복세를 보이고 있다.", savedAt: "2026-03-05" },
  { word: "헌법", hanja: "憲法", meaning: "국가의 기본법", context: "憲法 재판소가 판결을 내렸다.", savedAt: "2026-03-05" },
  { word: "민주", hanja: "民主", meaning: "국민이 주인", context: "民主主義의 가치를 지켜야 한다.", savedAt: "2026-03-04" },
];

// ─── 스타일 ───
const S = {
  popup: {
    width: 360,
    height: 520,
    display: "flex" as const,
    flexDirection: "column" as const,
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
    background: "#fafaf8",
    color: "#1a1a1a",
    overflow: "hidden" as const,
  },
  header: {
    padding: "14px 16px 10px",
    background: "#fff",
    borderBottom: "1px solid #e8e5de",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: "#1a1a1a",
    letterSpacing: -0.5,
  },
  headerBadge: {
    fontSize: 11,
    background: "#f0ece3",
    color: "#8b7e6a",
    padding: "3px 8px",
    borderRadius: 10,
    fontWeight: 500,
  },
  content: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "12px 16px",
  },
  tabBar: {
    display: "flex" as const,
    borderTop: "1px solid #e8e5de",
    background: "#fff",
    padding: "6px 0 8px",
  },
  tabItem: (active: boolean) => ({
    flex: 1,
    display: "flex" as const,
    flexDirection: "column" as const,
    alignItems: "center" as const,
    gap: 3,
    padding: "4px 0",
    cursor: "pointer" as const,
    border: "none" as const,
    background: "none" as const,
    color: active ? "#b8860b" : "#999",
    fontSize: 10,
    fontWeight: active ? 600 : 400,
    transition: "color 0.15s",
  }),
  card: {
    background: "#fff",
    borderRadius: 10,
    padding: "14px 16px",
    marginBottom: 10,
    border: "1px solid #e8e5de",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#5a5347",
    marginBottom: 10,
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  btn: (variant: "primary" | "ghost" | "outline" = "ghost") => ({
    padding: variant === "primary" ? "10px 16px" : "6px 12px",
    borderRadius: 8,
    border: variant === "outline" ? "1px solid #d4cfc6" : "none",
    background: variant === "primary" ? "#b8860b" : variant === "outline" ? "#fff" : "transparent",
    color: variant === "primary" ? "#fff" : "#5a5347",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer" as const,
    width: variant === "primary" ? "100%" : undefined,
  }),
  quizOption: (selected: boolean, correct: boolean | null) => ({
    display: "block" as const,
    width: "100%",
    padding: "10px 14px",
    marginBottom: 6,
    borderRadius: 8,
    border: `1.5px solid ${
      correct === true ? "#2e7d32" : correct === false ? "#c62828" : selected ? "#b8860b" : "#e8e5de"
    }`,
    background: correct === true ? "#e8f5e9" : correct === false ? "#fbe9e7" : selected ? "#fef9ef" : "#fff",
    cursor: "pointer" as const,
    fontSize: 15,
    textAlign: "left" as const,
    fontWeight: selected ? 600 : 400,
    transition: "all 0.15s",
  }),
  rankRow: {
    display: "flex" as const,
    alignItems: "center" as const,
    padding: "7px 0",
    borderBottom: "1px solid #f2efe9",
    gap: 10,
  },
  rankNum: (rank: number) => ({
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: rank <= 3 ? "#b8860b" : "#e8e5de",
    color: rank <= 3 ? "#fff" : "#8b7e6a",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  }),
  loginPrompt: {
    textAlign: "center" as const,
    padding: "40px 20px",
  },
};

// ─── 탭 아이콘 SVG ───
function TabIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? "#b8860b" : "#999";
  const size = 20;
  switch (name) {
    case "pencil":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      );
    case "chart":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
        </svg>
      );
    case "book":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    case "gear":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      );
    default:
      return null;
  }
}

// ─── 탭: 오늘의 한자 ───
function TodayTab({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [quizSection, setQuizSection] = useState<"exposure" | "click">("exposure");
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  if (!isLoggedIn) return <LoginPrompt message="어제 내가 가장 많이 본 한자로 퀴즈를 풀어보세요!" />;

  const questions = quizSection === "exposure" ? MOCK_QUIZ_EXPOSURE : MOCK_QUIZ_CLICK;
  const q = questions[currentQ];

  const handleAnswer = (choice: string) => {
    if (answered) return;
    setSelected(choice);
    setAnswered(true);
    if (choice === q.answer) setScore((s) => s + 1);
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setFinished(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQ(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setFinished(false);
  };

  const switchSection = (s: "exposure" | "click") => {
    setQuizSection(s);
    resetQuiz();
  };

  return (
    <>
      {/* 퀴즈 섹션 토글 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <button
          onClick={() => switchSection("exposure")}
          style={{
            flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
            background: quizSection === "exposure" ? "#b8860b" : "#e8e5de",
            color: quizSection === "exposure" ? "#fff" : "#8b7e6a",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          많이 본 한자 5문제
        </button>
        <button
          onClick={() => switchSection("click")}
          style={{
            flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
            background: quizSection === "click" ? "#b8860b" : "#e8e5de",
            color: quizSection === "click" ? "#fff" : "#8b7e6a",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          클릭한 한자 5문제
        </button>
      </div>

      {/* 퀴즈 카드 */}
      <div style={S.card}>
        {finished ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>
              {score >= 4 ? "🎉" : score >= 2 ? "👍" : "💪"}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
              {score} / {questions.length}
            </div>
            <div style={{ fontSize: 13, color: "#8b7e6a", marginBottom: 16 }}>
              {score >= 4 ? "훌륭합니다!" : score >= 2 ? "잘 하고 있어요!" : "조금 더 힘내봐요!"}
            </div>
            <button onClick={resetQuiz} style={S.btn("outline")}>
              다시 풀기
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: "#8b7e6a" }}>
                {currentQ + 1} / {questions.length}
              </span>
              <span style={{ fontSize: 12, color: "#b8860b", fontWeight: 600 }}>
                {score}점
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, textAlign: "center" }}>
              "<span style={{ color: "#b8860b" }}>{q.word}</span>"의 한자는?
            </div>
            {q.choices.map((c) => (
              <button
                key={c}
                onClick={() => handleAnswer(c)}
                style={S.quizOption(
                  c === selected,
                  answered ? (c === q.answer ? true : c === selected ? false : null) : null,
                )}
              >
                {c}
              </button>
            ))}
            {answered && (
              <button
                onClick={nextQuestion}
                style={{ ...S.btn("primary"), marginTop: 8 }}
              >
                {currentQ < questions.length - 1 ? "다음 문제" : "결과 보기"}
              </button>
            )}
          </>
        )}
      </div>

      {/* 오늘의 사자성어 */}
      <div style={S.card}>
        <div style={S.cardTitle}>
          <span>📜</span> 오늘의 사자성어
        </div>
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 6, color: "#b8860b", marginBottom: 6 }}>
            {MOCK_IDIOM.idiom}
          </div>
          <div style={{ fontSize: 14, color: "#5a5347", marginBottom: 4 }}>
            {MOCK_IDIOM.reading}
          </div>
          <div style={{ fontSize: 13, color: "#8b7e6a" }}>
            {MOCK_IDIOM.meaning}
          </div>
          <div style={{ fontSize: 11, color: "#b8a88a", marginTop: 8 }}>
            어제 많이 본 "<span style={{ fontWeight: 600 }}>{MOCK_IDIOM.relatedWord}</span>"와 관련된 성어
          </div>
        </div>
      </div>
    </>
  );
}

// ─── 탭: 어제의 한자 ───
function YesterdayTab({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [rankType, setRankType] = useState<"exposure" | "click">("exposure");

  if (!isLoggedIn) return <LoginPrompt message="어제 내가 본 한자 통계를 확인해보세요!" />;

  const rankData = rankType === "exposure" ? MOCK_EXPOSURE_RANK : MOCK_CLICK_RANK;

  return (
    <>
      {/* 노출/클릭 토글 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <button
          onClick={() => setRankType("exposure")}
          style={{
            flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
            background: rankType === "exposure" ? "#b8860b" : "#e8e5de",
            color: rankType === "exposure" ? "#fff" : "#8b7e6a",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          노출빈도 Top 10
        </button>
        <button
          onClick={() => setRankType("click")}
          style={{
            flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
            background: rankType === "click" ? "#b8860b" : "#e8e5de",
            color: rankType === "click" ? "#fff" : "#8b7e6a",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          클릭빈도 Top 10
        </button>
      </div>

      {/* 랭킹 카드 */}
      <div style={S.card}>
        <div style={S.cardTitle}>
          <span>{rankType === "exposure" ? "👀" : "👆"}</span>
          {rankType === "exposure" ? "어제 가장 많이 본 한자" : "어제 가장 많이 클릭한 한자"}
        </div>
        {rankData.map((item) => (
          <div key={item.rank} style={S.rankRow}>
            <div style={S.rankNum(item.rank)}>{item.rank}</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{item.hanja}</span>
              <span style={{ fontSize: 12, color: "#8b7e6a", marginLeft: 6 }}>{item.word}</span>
            </div>
            <span style={{ fontSize: 12, color: "#b8860b", fontWeight: 600 }}>
              {item.count}회
            </span>
          </div>
        ))}
      </div>

      {/* 내 단어장 미리보기 */}
      <div style={S.card}>
        <div style={S.cardTitle}>
          <span>📒</span> 내 단어장
        </div>
        {MOCK_VOCAB.slice(0, 3).map((v, i) => (
          <div key={i} style={{ padding: "8px 0", borderBottom: i < 2 ? "1px solid #f2efe9" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{v.hanja}</span>
              <span style={{ fontSize: 12, color: "#8b7e6a" }}>{v.word}</span>
            </div>
            <div style={{ fontSize: 11, color: "#b8a88a", marginTop: 2 }}>{v.meaning}</div>
            <div style={{
              fontSize: 11, color: "#999", marginTop: 3,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              "{v.context}"
            </div>
          </div>
        ))}
        <button
          onClick={() => window.open("https://hanjahanja.kr/mypage/vocab", "_blank")}
          style={{ ...S.btn("outline"), width: "100%", marginTop: 10, fontSize: 12 }}
        >
          단어장 더 보기 →
        </button>
      </div>
    </>
  );
}

// ─── 탭: 한자한자 ───
function AboutTab() {
  return (
    <>
      {/* 사용 설명 */}
      <div style={S.card}>
        <div style={S.cardTitle}>
          <span>📖</span> 사용법
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: "#5a5347" }}>
          <p style={{ marginBottom: 8 }}>
            <strong>1.</strong> 웹 서핑을 하면 한자어가 자동으로 한자로 변환돼요.
          </p>
          <p style={{ marginBottom: 8 }}>
            <strong>2.</strong> 한자 위에 마우스를 올리면 뜻과 읽는 법이 나와요.
          </p>
          <p style={{ marginBottom: 8 }}>
            <strong>3.</strong> 모르는 한자는 <strong>우클릭 → 단어장에 추가</strong>로 저장!
          </p>
          <p style={{ marginBottom: 0 }}>
            <strong>4.</strong> 매일 퀴즈와 통계로 실력을 키워보세요.
          </p>
        </div>
      </div>

      {/* 채널 안내 */}
      <div style={S.card}>
        <div style={S.cardTitle}>
          <span>🔗</span> 한자한자 채널
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <a
            href="https://hanjahanja.kr"
            target="_blank"
            rel="noreferrer"
            style={{ ...S.btn("outline"), textDecoration: "none", textAlign: "center", display: "block" }}
          >
            🌐 hanjahanja.kr
          </a>
          <a
            href="https://instagram.com/hanjahanja.kr"
            target="_blank"
            rel="noreferrer"
            style={{ ...S.btn("outline"), textDecoration: "none", textAlign: "center", display: "block" }}
          >
            📸 인스타그램
          </a>
          <a
            href="https://youtube.com/@hanjahanja"
            target="_blank"
            rel="noreferrer"
            style={{ ...S.btn("outline"), textDecoration: "none", textAlign: "center", display: "block" }}
          >
            🎬 유튜브
          </a>
        </div>
      </div>

      {/* 버전 정보 */}
      <div style={{ textAlign: "center", padding: "8px 0", fontSize: 11, color: "#ccc" }}>
        한자한자 v1.0.0
      </div>
    </>
  );
}

// ─── 탭: 설정 ───
function SettingsTab({
  isLoggedIn,
  level,
  darkTooltip,
  isEnabled,
  blockedSites,
  currentUrl,
  onChangeLevel,
  onToggleDark,
  onToggleEnabled,
  onToggleBlock,
  onToggleCurrentSite,
  onLogin,
  onLogout,
}: {
  isLoggedIn: boolean;
  level: number;
  darkTooltip: boolean;
  isEnabled: boolean;
  blockedSites: string[];
  currentUrl: string;
  onChangeLevel: (v: number) => void;
  onToggleDark: () => void;
  onToggleEnabled: () => void;
  onToggleBlock: (site: string) => void;
  onToggleCurrentSite: () => void;
  onLogin: () => void;
  onLogout: () => void;
}) {
  const [newBlock, setNewBlock] = useState("");
  const currentHost = (() => {
    try { return new URL(currentUrl).hostname; } catch { return ""; }
  })();
  const isCurrentBlocked = blockedSites.includes(currentHost);

  return (
    <>
      {/* 변환 ON/OFF */}
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>한자 변환</div>
            <div style={{ fontSize: 11, color: "#8b7e6a" }}>
              {isEnabled ? "현재 활성화됨" : "현재 비활성화됨"}
            </div>
          </div>
          <button
            onClick={onToggleEnabled}
            style={{
              width: 48, height: 26, borderRadius: 13, border: "none",
              background: isEnabled ? "#b8860b" : "#ddd",
              cursor: "pointer", position: "relative", transition: "background 0.2s",
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: "50%", background: "#fff",
              position: "absolute", top: 3,
              left: isEnabled ? 25 : 3, transition: "left 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>
      </div>

      {/* 급수 설정 */}
      <div style={S.card}>
        <div style={{ ...S.cardTitle, marginBottom: 8 }}>
          <span>🎓</span> 급수 설정
        </div>
        <select
          value={level}
          onChange={(e) => onChangeLevel(Number(e.target.value))}
          style={{
            width: "100%", padding: "8px 12px", borderRadius: 8,
            border: "1px solid #d4cfc6", fontSize: 14, background: "#fff",
          }}
        >
          {LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} {opt.value >= 4 ? "(무료)" : "(프리미엄)"}
            </option>
          ))}
        </select>
      </div>

      {/* 현재 사이트 설정 */}
      {currentHost && (
        <div style={S.card}>
          <div style={{ ...S.cardTitle, marginBottom: 8 }}>
            <span>🌐</span> 현재 사이트
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{currentHost}</div>
              <div style={{ fontSize: 11, color: isCurrentBlocked ? "#c62828" : "#2e7d32" }}>
                {isCurrentBlocked ? "변환 차단됨" : "변환 허용됨"}
              </div>
            </div>
            <button onClick={onToggleCurrentSite} style={S.btn("outline")}>
              {isCurrentBlocked ? "허용" : "차단"}
            </button>
          </div>
        </div>
      )}

      {/* 블락 사이트 관리 */}
      <div style={S.card}>
        <div style={{ ...S.cardTitle, marginBottom: 8 }}>
          <span>🚫</span> 차단 사이트
        </div>
        {blockedSites.length === 0 ? (
          <div style={{ fontSize: 12, color: "#b8a88a", textAlign: "center", padding: "8px 0" }}>
            차단된 사이트가 없습니다
          </div>
        ) : (
          blockedSites.map((site) => (
            <div key={site} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0" }}>
              <span style={{ fontSize: 13 }}>{site}</span>
              <button onClick={() => onToggleBlock(site)} style={{ ...S.btn("ghost"), color: "#c62828", fontSize: 12 }}>
                삭제
              </button>
            </div>
          ))
        )}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input
            value={newBlock}
            onChange={(e) => setNewBlock(e.target.value)}
            placeholder="예: news.naver.com"
            style={{
              flex: 1, padding: "6px 10px", borderRadius: 6,
              border: "1px solid #d4cfc6", fontSize: 12,
            }}
          />
          <button
            onClick={() => {
              if (newBlock.trim()) {
                onToggleBlock(newBlock.trim());
                setNewBlock("");
              }
            }}
            style={S.btn("outline")}
          >
            추가
          </button>
        </div>
      </div>

      {/* 다크 모드 */}
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>🌙 툴팁 다크 모드</div>
          <button
            onClick={onToggleDark}
            style={{
              width: 48, height: 26, borderRadius: 13, border: "none",
              background: darkTooltip ? "#b8860b" : "#ddd",
              cursor: "pointer", position: "relative", transition: "background 0.2s",
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: "50%", background: "#fff",
              position: "absolute", top: 3,
              left: darkTooltip ? 25 : 3, transition: "left 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>
      </div>

      {/* 계정 */}
      <div style={S.card}>
        <div style={{ ...S.cardTitle, marginBottom: 8 }}>
          <span>👤</span> 계정
        </div>
        {isLoggedIn ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a
              href="https://hanjahanja.kr/mypage"
              target="_blank"
              rel="noreferrer"
              style={{ ...S.btn("outline"), textDecoration: "none", textAlign: "center", display: "block" }}
            >
              계정 정보 확인 →
            </a>
            <button onClick={onLogout} style={{ ...S.btn("ghost"), color: "#c62828" }}>
              로그아웃
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={onLogin} style={S.btn("primary")}>
              로그인 / 회원가입
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── 비로그인 프롬프트 ───
function LoginPrompt({ message }: { message: string }) {
  return (
    <div style={S.loginPrompt as React.CSSProperties}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🔑</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: "#5a5347" }}>
        로그인이 필요해요
      </div>
      <div style={{ fontSize: 13, color: "#8b7e6a", marginBottom: 20, lineHeight: 1.5 }}>
        {message}
      </div>

      {/* 비로그인 진단 퀴즈 유도 */}
      <div style={{ ...S.card, textAlign: "left" as const, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: "#b8860b" }}>
          🎯 나의 한자 실력 알아보기
        </div>
        <div style={{ fontSize: 12, color: "#8b7e6a", marginBottom: 10, lineHeight: 1.5 }}>
          간단한 퀴즈로 내 한자 실력을 진단하고,<br />
          맞춤 급수를 추천받아 보세요!
        </div>
        <a
          href="https://hanjahanja.kr/diagnosis"
          target="_blank"
          rel="noreferrer"
          style={{ ...S.btn("primary"), textDecoration: "none", display: "block", textAlign: "center" }}
        >
          실력 진단하기 →
        </a>
      </div>

      <button
        onClick={() => window.open("https://hanjahanja.kr/login", "_blank")}
        style={S.btn("outline")}
      >
        로그인 / 회원가입
      </button>
    </div>
  );
}

// ─── 메인 앱 ───
function App() {
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [isEnabled, setIsEnabled] = useState(true);
  const [level, setLevel] = useState(8);
  const [darkTooltip, setDarkTooltip] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // TODO: Supabase 연동
  const [blockedSites, setBlockedSites] = useState<string[]>([]);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    // 설정 로드
    browser.storage.local.get(["enabled", "level", "darkTooltip", "blockedSites"]).then((result) => {
      setIsEnabled(result.enabled ?? true);
      setLevel(result.level ?? 8);
      setDarkTooltip(result.darkTooltip ?? false);
      setBlockedSites(result.blockedSites ?? []);
      setLoaded(true);
    });

    // 현재 탭 URL
    try {
      browser.tabs?.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs[0]?.url) setCurrentUrl(tabs[0].url);
      }).catch(() => {});
    } catch { /* tabs API 없으면 무시 */ }
  }, []);

  const toggleEnabled = async () => {
    const next = !isEnabled;
    setIsEnabled(next);
    await browser.storage.local.set({ enabled: next });
  };

  const changeLevel = async (newLevel: number) => {
    setLevel(newLevel);
    await browser.storage.local.set({ level: newLevel });
  };

  const toggleDark = async () => {
    const next = !darkTooltip;
    setDarkTooltip(next);
    await browser.storage.local.set({ darkTooltip: next });
  };

  const toggleBlock = async (site: string) => {
    let updated: string[];
    if (blockedSites.includes(site)) {
      updated = blockedSites.filter((s) => s !== site);
    } else {
      updated = [...blockedSites, site];
    }
    setBlockedSites(updated);
    await browser.storage.local.set({ blockedSites: updated });
  };

  const toggleCurrentSite = () => {
    try {
      const host = new URL(currentUrl).hostname;
      toggleBlock(host);
    } catch { /* noop */ }
  };

  if (!loaded) return null;

  return (
    <div style={S.popup}>
      {/* 헤더 */}
      <div style={S.header}>
        <span style={S.headerTitle}>한자한자</span>
        <span style={S.headerBadge}>
          {LEVEL_OPTIONS.find((o) => o.value === level)?.label ?? "8급"}
        </span>
      </div>

      {/* 콘텐츠 */}
      <div style={S.content}>
        {activeTab === "today" && <TodayTab isLoggedIn={isLoggedIn} />}
        {activeTab === "yesterday" && <YesterdayTab isLoggedIn={isLoggedIn} />}
        {activeTab === "about" && <AboutTab />}
        {activeTab === "settings" && (
          <SettingsTab
            isLoggedIn={isLoggedIn}
            level={level}
            darkTooltip={darkTooltip}
            isEnabled={isEnabled}
            blockedSites={blockedSites}
            currentUrl={currentUrl}
            onChangeLevel={changeLevel}
            onToggleDark={toggleDark}
            onToggleEnabled={toggleEnabled}
            onToggleBlock={toggleBlock}
            onToggleCurrentSite={toggleCurrentSite}
            onLogin={() => window.open("https://hanjahanja.kr/login", "_blank")}
            onLogout={() => setIsLoggedIn(false)}
          />
        )}
      </div>

      {/* 하단 탭 바 */}
      <div style={S.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={S.tabItem(activeTab === tab.id)}
          >
            <TabIcon name={tab.icon} active={activeTab === tab.id} />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;
