import { useState, useEffect } from "react";

// ─── 타입 ───
type TabId = "today" | "yesterday" | "about" | "settings";

interface QuizQuestion {
  hint: string;
  word: string;
  hanja: string;
  choices: string[];
}

interface HanjaRank {
  rank: number;
  word: string;
  hanja: string;
  count: number;
}

interface VocabEntry {
  word: string;
  hanja: string;
  meaning: string;
  context: string;
  savedAt: string;
}

// ─── 컬러 팔레트 (랜딩페이지 통일) ───
const C = {
  cream: "#FEFAE0",
  vanilla: "#FAEDCD",
  moss: "#E9EDC9",
  sage: "#CCD5AE",
  tan: "#D4A373",
  tanDark: "#B8834A",
  warmBrown: "#3D2C1E",
  warmBrownLight: "#6B5744",
  border: "#E0D5B7",
  white: "#FFFFFF",
  correct: "#4a7c59",
  wrong: "#b85450",
  outerBg: "#F2F5E0",
};

// ─── 캐릭터 이미지 헬퍼 ───
function charImg(name: string) {
  return browser.runtime.getURL(`images/${name}.svg`);
}

// ─── 상수 ───
const LEVEL_OPTIONS = [
  { value: 8, label: "8급" }, { value: 7.5, label: "준7급" },
  { value: 7, label: "7급" }, { value: 6.5, label: "준6급" },
  { value: 6, label: "6급" }, { value: 5.5, label: "준5급" },
  { value: 5, label: "5급" }, { value: 4.5, label: "준4급" },
  { value: 4, label: "4급" }, { value: 3.5, label: "준3급" },
  { value: 3, label: "3급" }, { value: 2.5, label: "준2급" },
  { value: 2, label: "2급" }, { value: 1.5, label: "준1급" },
  { value: 1, label: "1급" }, { value: 0.5, label: "준특급" },
  { value: 0, label: "특급" },
];

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "today", label: "오늘의 한자", icon: "pencil" },
  { id: "yesterday", label: "어제의 한자", icon: "chart" },
  { id: "about", label: "한자한자", icon: "book" },
  { id: "settings", label: "설정", icon: "gear" },
];

// ─── storage 키 ───
const STORAGE_KEYS = {
  todayExposures: 'todayExposures',
  todayClicks: 'todayClicks',
  yesterdayExposures: 'yesterdayExposures',
  yesterdayClicks: 'yesterdayClicks',
};

function exposuresToRank(data: Record<string, number>): HanjaRank[] {
  return Object.entries(data)
    .map(([key, count]) => {
      const [word, hanja] = key.split('|');
      return { rank: 0, word, hanja, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((item, i) => ({ ...item, rank: i + 1 }));
}

function clicksToRank(data: Array<Record<string, unknown>>): HanjaRank[] {
  const counts = new Map<string, { word: string; hanja: string; count: number }>();
  for (const click of data) {
    const key = `${click.word}|${click.hanja}`;
    const existing = counts.get(key);
    if (existing) existing.count++;
    else counts.set(key, { word: click.word as string, hanja: click.hanja as string, count: 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((item, i) => ({ rank: i + 1, ...item }));
}

// ─── Mock 데이터 ───
const MOCK_QUIZ_EXPOSURE: QuizQuestion[] = [
  { hint: "재물을 잘 다스림. 물자의 생산·분배·소비 등의 활동", word: "경제", hanja: "經濟", choices: ["經濟", "京際", "經齊", "景制"] },
  { hint: "나라를 다스리는 일. 권력을 획득·유지·행사하는 활동", word: "정치", hanja: "政治", choices: ["正置", "政治", "定致", "精緻"] },
  { hint: "지식과 기술 등을 가르치고 배우는 활동", word: "교육", hanja: "敎育", choices: ["敎育", "交域", "校肉", "橋育"] },
  { hint: "같은 무리끼리 모여 이루는 집단. 공동생활을 하는 인간의 조직체", word: "사회", hanja: "社會", choices: ["士會", "社會", "史繪", "私懷"] },
  { hint: "사회 구성원들이 만들어 가는 생활 양식과 그에 따른 산물", word: "문화", hanja: "文化", choices: ["聞花", "紋火", "文化", "門華"] },
];

const MOCK_QUIZ_CLICK: QuizQuestion[] = [
  { hint: "한 나라의 으뜸가는 자리. 행정부의 수반", word: "대통령", hanja: "大統領", choices: ["大統領", "代通靈", "大桶嶺", "臺統領"] },
  { hint: "나라의 백성. 국가를 구성하는 사람", word: "국민", hanja: "國民", choices: ["局旻", "國民", "菊敏", "國旼"] },
  { hint: "국가의 주권이 국민에게 있는 것", word: "민주", hanja: "民主", choices: ["民主", "敏周", "閔朱", "旻柱"] },
  { hint: "국가 통치 체제의 기본 원칙에 관한 법", word: "헌법", hanja: "憲法", choices: ["獻法", "軒法", "憲法", "顯罰"] },
  { hint: "외부의 구속이나 간섭을 받지 않고 자기 뜻에 따라 행동함", word: "자유", hanja: "自由", choices: ["自由", "子遊", "恣油", "慈幽"] },
];

const MOCK_IDIOM = {
  idiom: "經世濟民",
  reading: "경세제민",
  meaning: "세상을 다스리고 백성을 구함",
  relatedWord: "경제",
};

// ─── 토글 스위치 컴포넌트 ───
function ToggleSwitch({ on, onToggle, small }: { on: boolean; onToggle: () => void; small?: boolean }) {
  const w = small ? 36 : 48;
  const h = small ? 20 : 26;
  const knob = small ? 16 : 20;
  const pad = small ? 2 : 3;
  return (
    <button onClick={onToggle} style={{
      width: w, height: h, borderRadius: h / 2, border: "none",
      background: on ? C.tan : "#ddd",
      cursor: "pointer", position: "relative", transition: "background 0.2s",
    }}>
      <div style={{
        width: knob, height: knob, borderRadius: "50%", background: C.white,
        position: "absolute", top: pad, left: on ? w - knob - pad : pad,
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

// ─── 스타일 ───
const S = {
  popup: {
    width: "100%", height: "100%",
    display: "flex" as const, flexDirection: "column" as const,
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
    background: C.outerBg, color: C.warmBrown,
    overflow: "hidden" as const,
  },
  header: {
    padding: "10px 16px 8px",
    background: C.outerBg, borderBottom: `1px solid ${C.border}`,
    display: "flex" as const, alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  headerTitle: { fontSize: 15, fontWeight: 700, color: C.warmBrown, letterSpacing: -0.5 },
  headerBadge: {
    fontSize: 10, background: C.vanilla, color: C.warmBrownLight,
    padding: "2px 7px", borderRadius: 10, fontWeight: 500,
  },
  content: { flex: 1, overflowY: "auto" as const, padding: "8px 12px", background: C.cream },
  tabBar: {
    display: "flex" as const, borderTop: `1px solid ${C.border}`,
    background: C.outerBg, padding: "3px 3px",
  },
  tabItem: (active: boolean) => ({
    flex: 1, display: "flex" as const, flexDirection: "column" as const,
    alignItems: "center" as const, gap: 2, padding: "5px 0",
    cursor: "pointer" as const, border: "none" as const,
    background: active ? "#CBD784" : "transparent",
    borderRadius: active ? 8 : 0,
    color: active ? C.warmBrown : "#999", fontSize: 9,
    fontWeight: active ? 700 : 400, transition: "all 0.15s",
  }),
  card: {
    background: C.white, borderRadius: 10, padding: "10px 12px",
    marginBottom: 8, border: `1px solid ${C.border}`,
  },
  cardTitle: {
    fontSize: 12, fontWeight: 600, color: C.warmBrownLight,
    marginBottom: 8, display: "flex" as const, alignItems: "center" as const, gap: 5,
  },
  btn: (variant: "primary" | "ghost" | "outline" = "ghost") => ({
    padding: variant === "primary" ? "8px 14px" : "5px 10px",
    borderRadius: 8,
    border: variant === "outline" ? `1px solid ${C.border}` : "none",
    background: variant === "primary" ? C.tan : variant === "outline" ? C.white : "transparent",
    color: variant === "primary" ? C.cream : C.warmBrownLight,
    fontSize: 12, fontWeight: 500, cursor: "pointer" as const,
    width: variant === "primary" ? "100%" : undefined,
  }),
  quizOption: (selected: boolean, correct: boolean | null) => ({
    display: "block" as const, width: "100%",
    padding: "8px 12px", marginBottom: 4, borderRadius: 8,
    border: `1.5px solid ${
      correct === true ? C.correct : correct === false ? C.wrong
      : selected ? C.tan : C.border
    }`,
    background: correct === true ? "#e8f0e4" : correct === false ? "#fce8e6"
      : selected ? C.vanilla : C.white,
    cursor: "pointer" as const, fontSize: 14,
    textAlign: "center" as const, fontWeight: selected ? 600 : 400,
    transition: "all 0.15s",
  }),
  rankRow: {
    display: "flex" as const, alignItems: "center" as const,
    padding: "5px 0", borderBottom: `1px solid ${C.vanilla}`, gap: 8,
  },
  rankNum: (rank: number) => ({
    width: 20, height: 20, borderRadius: "50%",
    background: rank <= 3 ? C.tan : C.vanilla,
    color: rank <= 3 ? C.cream : C.warmBrownLight,
    display: "flex" as const, alignItems: "center" as const,
    justifyContent: "center" as const, fontSize: 10, fontWeight: 700, flexShrink: 0,
  }),
  toggleBtn: (active: boolean) => ({
    flex: 1, padding: "6px 0", borderRadius: 8, border: "none",
    background: active ? C.tan : C.vanilla,
    color: active ? C.cream : C.warmBrownLight,
    fontSize: 11, fontWeight: 600, cursor: "pointer" as const,
  }),
};

// ─── 탭 아이콘 ───
function TabIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? C.warmBrown : "#999";
  const size = 16;
  switch (name) {
    case "pencil":
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>);
    case "chart":
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>);
    case "book":
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>);
    case "gear":
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>);
    default: return null;
  }
}

// ─── 사자성어 하단 고정 바 ───
function IdiomBar() {
  return (
    <div style={{
      background: C.moss, borderTop: `1px solid ${C.border}`,
      padding: "6px 12px", display: "flex", alignItems: "center", gap: 8,
    }}>
      <img src={charImg("blackboard")} alt="사자성어" style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 2, color: C.tanDark }}>{MOCK_IDIOM.idiom}</span>
          <span style={{ fontSize: 11, color: C.warmBrown }}>{MOCK_IDIOM.reading}</span>
        </div>
        <div style={{ fontSize: 10, color: C.warmBrownLight, marginTop: 1 }}>{MOCK_IDIOM.meaning}</div>
      </div>
    </div>
  );
}

// ─── 탭: 오늘의 한자 ───
function TodayTab() {
  const [quizSection, setQuizSection] = useState<"exposure" | "click">("exposure");
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [todayStats, setTodayStats] = useState({ exposureCount: 0, uniqueWords: 0, clickCount: 0 });

  useEffect(() => {
    browser.storage.local.get([STORAGE_KEYS.todayExposures, STORAGE_KEYS.todayClicks]).then((result) => {
      const exposures = (result[STORAGE_KEYS.todayExposures] as Record<string, number>) ?? {};
      const clicks = (result[STORAGE_KEYS.todayClicks] as Array<Record<string, unknown>>) ?? [];
      const totalExposure = Object.values(exposures).reduce((sum, c) => sum + c, 0);
      setTodayStats({ exposureCount: totalExposure, uniqueWords: Object.keys(exposures).length, clickCount: clicks.length });
    });
  }, []);

  const questions = quizSection === "exposure" ? MOCK_QUIZ_EXPOSURE : MOCK_QUIZ_CLICK;
  const q = questions[currentQ];

  const handleAnswer = (choice: string) => {
    if (answered) return;
    setSelected(choice);
    setAnswered(true);
    if (choice === q.hanja) setScore((s) => s + 1);
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
    setCurrentQ(0); setSelected(null); setAnswered(false);
    setScore(0); setFinished(false);
  };

  const switchSection = (s: "exposure" | "click") => { setQuizSection(s); resetQuiz(); };

  return (
    <>
      {/* 오늘 통계 */}
      <div style={{ ...S.card, background: C.vanilla, display: "flex", justifyContent: "space-around", textAlign: "center", padding: "8px 12px" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.tanDark }}>{todayStats.uniqueWords}</div>
          <div style={{ fontSize: 10, color: C.warmBrownLight }}>오늘 본 단어</div>
        </div>
        <div style={{ width: 1, background: C.border }} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.tanDark }}>{todayStats.exposureCount}</div>
          <div style={{ fontSize: 10, color: C.warmBrownLight }}>총 노출</div>
        </div>
        <div style={{ width: 1, background: C.border }} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.tanDark }}>{todayStats.clickCount}</div>
          <div style={{ fontSize: 10, color: C.warmBrownLight }}>클릭</div>
        </div>
      </div>

      {/* 퀴즈 토글 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        <button onClick={() => switchSection("exposure")} style={S.toggleBtn(quizSection === "exposure")}>많이 본 한자 5문제</button>
        <button onClick={() => switchSection("click")} style={S.toggleBtn(quizSection === "click")}>클릭한 한자 5문제</button>
      </div>

      {/* 퀴즈 카드 */}
      <div style={S.card}>
        {finished ? (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <img src={charImg("whiteboard")} alt="결과" style={{ width: 100, height: 100, objectFit: "contain", marginBottom: 6 }} />
            <div style={{ fontSize: 28, fontWeight: 700, color: C.tanDark, marginBottom: 4 }}>
              {score} / {questions.length}
            </div>
            <div style={{ fontSize: 14, color: C.warmBrownLight, marginBottom: 12 }}>
              {score >= 4 ? "대단해요! 한자 실력이 쑥쑥!" : score >= 2 ? "잘 하고 있어요! 조금만 더!" : "오늘 본 한자들을 다시 살펴봐요!"}
            </div>
            <button onClick={resetQuiz} style={S.btn("outline")}>다시 풀기</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: C.warmBrownLight }}>{currentQ + 1} / {questions.length}</span>
              <span style={{ fontSize: 11, color: C.tanDark, fontWeight: 600 }}>{score}점</span>
            </div>

            {/* 정답/오답 피드백 */}
            {answered ? (
              <div style={{ textAlign: "center", marginBottom: 6 }}>
                <img
                  src={selected === q.hanja ? charImg("congratulations") : charImg("wronganswer")}
                  alt={selected === q.hanja ? "정답" : "오답"}
                  style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 6 }}
                />
                <div style={{
                  fontSize: 16, fontWeight: 700, marginBottom: 4,
                  color: selected === q.hanja ? C.correct : C.wrong,
                }}>
                  {selected === q.hanja ? "맞았어요, 정답!" : "아쉽지만 오답이네요"}
                </div>
                {selected !== q.hanja && (
                  <div style={{ fontSize: 13, color: C.warmBrownLight }}>
                    정답: <strong style={{ color: C.warmBrown }}>{q.hanja}</strong>
                    <span style={{ marginLeft: 4, color: C.warmBrownLight }}>({q.word})</span>
                  </div>
                )}
                {selected === q.hanja && (
                  <div style={{ fontSize: 13, color: C.warmBrownLight }}>
                    {q.hanja} <span style={{ color: C.warmBrownLight }}>({q.word})</span>
                  </div>
                )}
                <div style={{ fontSize: 12, color: C.warmBrownLight, marginTop: 3, fontStyle: "italic" }}>
                  "{q.hint}"
                </div>
                <button onClick={nextQuestion} style={{ ...S.btn("primary"), marginTop: 10 }}>
                  {currentQ < questions.length - 1 ? "다음 문제" : "결과 보기"}
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, color: C.warmBrownLight, marginBottom: 4, textAlign: "center" }}>
                  다음 설명에 맞는 한자어는?
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 500, marginBottom: 10, textAlign: "center",
                  lineHeight: 1.5, color: C.warmBrown, padding: "8px 6px",
                  background: C.vanilla, borderRadius: 8,
                }}>
                  {q.hint}
                </div>
                {q.choices.map((c) => (
                  <button key={c} onClick={() => handleAnswer(c)} style={S.quizOption(false, null)}>
                    <span style={{ fontSize: 16, letterSpacing: 2 }}>{c}</span>
                  </button>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── 탭: 어제의 한자 ───
function YesterdayTab() {
  const [rankType, setRankType] = useState<"exposure" | "click">("exposure");
  const [exposureRank, setExposureRank] = useState<HanjaRank[]>([]);
  const [clickRank, setClickRank] = useState<HanjaRank[]>([]);
  const [vocab, setVocab] = useState<VocabEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    browser.storage.local.get([STORAGE_KEYS.yesterdayExposures, STORAGE_KEYS.yesterdayClicks, 'localVocabulary']).then((result) => {
      const exposures = (result[STORAGE_KEYS.yesterdayExposures] as Record<string, number>) ?? {};
      const clicks = (result[STORAGE_KEYS.yesterdayClicks] as Array<Record<string, unknown>>) ?? [];
      setExposureRank(exposuresToRank(exposures));
      setClickRank(clicksToRank(clicks));
      const raw = (result.localVocabulary as Array<Record<string, unknown>>) ?? [];
      setVocab(raw.slice(-10).reverse().map((v) => ({
        word: (v.word as string) ?? '', hanja: (v.hanja as string) ?? '',
        meaning: (v.meaning as string) ?? '', context: (v.contextSentence as string) ?? '',
        savedAt: (v.savedAt as string) ?? '',
      })));
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: C.warmBrownLight }}>불러오는 중...</div>;

  const rankData = rankType === "exposure" ? exposureRank : clickRank;

  return (
    <>
      {/* 상단 캐릭터 */}
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <img src={charImg("curiosity")} alt="어제의 한자" style={{ width: 56, height: 56, objectFit: "contain" }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: C.warmBrown, marginTop: 2 }}>
          어제의 학습 기록이에요!
        </div>
      </div>

      {/* 토글 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        <button onClick={() => setRankType("exposure")} style={S.toggleBtn(rankType === "exposure")}>노출빈도 Top 10</button>
        <button onClick={() => setRankType("click")} style={S.toggleBtn(rankType === "click")}>클릭빈도 Top 10</button>
      </div>

      {/* 랭킹 */}
      <div style={S.card}>
        <div style={S.cardTitle}>
          <span>{rankType === "exposure" ? "👀" : "👆"}</span>
          {rankType === "exposure" ? "어제 가장 많이 본 한자" : "어제 가장 많이 클릭한 한자"}
        </div>
        {rankData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: C.warmBrownLight, fontSize: 13 }}>
            어제 {rankType === "exposure" ? "노출" : "클릭"} 데이터가 없습니다.<br />
            웹서핑을 하면 자동으로 기록됩니다!
          </div>
        ) : rankData.map((item) => (
          <div key={item.rank} style={S.rankRow}>
            <div style={S.rankNum(item.rank)}>{item.rank}</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{item.hanja}</span>
              <span style={{ fontSize: 12, color: C.warmBrownLight, marginLeft: 6 }}>{item.word}</span>
            </div>
            <span style={{ fontSize: 12, color: C.tanDark, fontWeight: 600 }}>{item.count}회</span>
          </div>
        ))}
      </div>

      {/* 단어장 */}
      <div style={S.card}>
        <div style={S.cardTitle}><span>📒</span> 내 단어장</div>
        {vocab.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: C.warmBrownLight, fontSize: 13 }}>
            저장된 단어가 없습니다.<br />
            한자를 우클릭하여 단어장에 추가해보세요!
          </div>
        ) : vocab.slice(0, 3).map((v, i) => (
          <div key={i} style={{ padding: "8px 0", borderBottom: i < 2 ? `1px solid ${C.vanilla}` : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{v.hanja}</span>
              <span style={{ fontSize: 12, color: C.warmBrownLight }}>{v.word}</span>
            </div>
            <div style={{ fontSize: 11, color: C.warmBrownLight, marginTop: 2 }}>{v.meaning}</div>
            {v.context && (
              <div style={{ fontSize: 11, color: "#999", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                "{v.context}"
              </div>
            )}
          </div>
        ))}
        {vocab.length > 3 && (
          <button onClick={() => window.open("https://hanjahanja.kr/mypage/vocab", "_blank")}
            style={{ ...S.btn("outline"), width: "100%", marginTop: 10, fontSize: 12 }}>
            단어장 더 보기 →
          </button>
        )}
      </div>
    </>
  );
}

// ─── 탭: 한자한자 ───
function AboutTab() {
  return (
    <>
      {/* 캐릭터 + 인사 */}
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <img src={charImg("explaning")} alt="한자한자" style={{ width: 60, height: 60, objectFit: "contain" }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: C.warmBrown, marginTop: 2 }}>
          한자한자와 함께 배워봐요!
        </div>
        <div style={{ fontSize: 11, color: C.warmBrownLight, marginTop: 1 }}>
          웹서핑만 해도 한자가 쌓여요
        </div>
      </div>

      {/* 사용법 */}
      <div style={{ ...S.card, background: C.vanilla }}>
        <div style={S.cardTitle}><span>📖</span> 사용법</div>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: C.warmBrown }}>
          <p style={{ marginBottom: 8 }}><strong>1.</strong> 웹 서핑을 하면 한자어가 자동으로 한자로 변환돼요.</p>
          <p style={{ marginBottom: 8 }}><strong>2.</strong> 한자 위에 마우스를 올리면 뜻과 읽는 법이 나와요.</p>
          <p style={{ marginBottom: 8 }}><strong>3.</strong> 모르는 한자는 <strong>우클릭 → 단어장에 추가</strong>로 저장!</p>
          <p style={{ marginBottom: 0 }}><strong>4.</strong> 매일 퀴즈와 통계로 실력을 키워보세요.</p>
        </div>
      </div>

      {/* 채널 */}
      <div style={S.card}>
        <div style={S.cardTitle}><span>🔗</span> 한자한자 채널</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <a href="https://hanjahanja.kr" target="_blank" rel="noreferrer"
            style={{ ...S.btn("outline"), textDecoration: "none", textAlign: "center", display: "block" }}>
            🌐 hanjahanja.kr
          </a>
          <a href="https://instagram.com/hanjahanja.kr" target="_blank" rel="noreferrer"
            style={{ ...S.btn("outline"), textDecoration: "none", textAlign: "center", display: "block" }}>
            📸 인스타그램
          </a>
          <a href="https://youtube.com/@hanjahanja" target="_blank" rel="noreferrer"
            style={{ ...S.btn("outline"), textDecoration: "none", textAlign: "center", display: "block" }}>
            🎬 유튜브
          </a>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "8px 0", fontSize: 11, color: C.warmBrownLight, opacity: 0.5 }}>
        한자한자 v1.0.0
      </div>
    </>
  );
}

// ─── 탭: 설정 ───
function SettingsTab({
  isLoggedIn, level, darkTooltip, blockedSites, currentUrl,
  onChangeLevel, onToggleDark, onToggleBlock, onToggleCurrentSite, onLogin, onLogout,
}: {
  isLoggedIn: boolean; level: number; darkTooltip: boolean;
  blockedSites: string[]; currentUrl: string;
  onChangeLevel: (v: number) => void; onToggleDark: () => void;
  onToggleBlock: (site: string) => void; onToggleCurrentSite: () => void;
  onLogin: () => void; onLogout: () => void;
}) {
  const [newBlock, setNewBlock] = useState("");
  const currentHost = (() => { try { return new URL(currentUrl).hostname; } catch { return ""; } })();
  const isCurrentBlocked = blockedSites.includes(currentHost);

  return (
    <>
      <div style={S.card}>
        <div style={{ ...S.cardTitle, marginBottom: 8 }}>🎓 급수 설정</div>
        <select value={level} onChange={(e) => onChangeLevel(Number(e.target.value))}
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, background: C.white }}>
          {LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label} {opt.value >= 4 ? "(무료)" : "(프리미엄)"}</option>
          ))}
        </select>
      </div>

      {currentHost && (
        <div style={S.card}>
          <div style={{ ...S.cardTitle, marginBottom: 8 }}>🌐 현재 사이트</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{currentHost}</div>
              <div style={{ fontSize: 11, color: isCurrentBlocked ? C.wrong : C.correct }}>
                {isCurrentBlocked ? "변환 차단됨" : "변환 허용됨"}
              </div>
            </div>
            <button onClick={onToggleCurrentSite} style={S.btn("outline")}>{isCurrentBlocked ? "허용" : "차단"}</button>
          </div>
        </div>
      )}

      <div style={S.card}>
        <div style={{ ...S.cardTitle, marginBottom: 8 }}>🚫 차단 사이트</div>
        {blockedSites.length === 0 ? (
          <div style={{ fontSize: 12, color: C.warmBrownLight, textAlign: "center", padding: "8px 0" }}>차단된 사이트가 없습니다</div>
        ) : blockedSites.map((site) => (
          <div key={site} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0" }}>
            <span style={{ fontSize: 13 }}>{site}</span>
            <button onClick={() => onToggleBlock(site)} style={{ ...S.btn("ghost"), color: C.wrong, fontSize: 12 }}>삭제</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input value={newBlock} onChange={(e) => setNewBlock(e.target.value)} placeholder="예: news.naver.com"
            style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12 }} />
          <button onClick={() => { if (newBlock.trim()) { onToggleBlock(newBlock.trim()); setNewBlock(""); } }} style={S.btn("outline")}>추가</button>
        </div>
      </div>

      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: C.warmBrown }}>🌙 툴팁 다크 모드</div>
          <ToggleSwitch on={darkTooltip} onToggle={onToggleDark} />
        </div>
      </div>

      <div style={S.card}>
        <div style={{ ...S.cardTitle, marginBottom: 8 }}>👤 계정</div>
        {isLoggedIn ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a href="https://hanjahanja.kr/mypage" target="_blank" rel="noreferrer"
              style={{ ...S.btn("outline"), textDecoration: "none", textAlign: "center", display: "block" }}>
              계정 정보 확인 →
            </a>
            <button onClick={onLogout} style={{ ...S.btn("ghost"), color: C.wrong }}>로그아웃</button>
          </div>
        ) : (
          <button onClick={onLogin} style={S.btn("primary")}>로그인 / 회원가입</button>
        )}
      </div>
    </>
  );
}

// ─── 메인 앱 ───
function App() {
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [isEnabled, setIsEnabled] = useState(true);
  const [level, setLevel] = useState(8);
  const [darkTooltip, setDarkTooltip] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [blockedSites, setBlockedSites] = useState<string[]>([]);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    browser.storage.local.get(["enabled", "level", "darkTooltip", "blockedSites", "supabaseSession"]).then((result) => {
      setIsEnabled(result.enabled ?? true);
      setLevel(result.level ?? 8);
      setDarkTooltip(result.darkTooltip ?? false);
      setBlockedSites(result.blockedSites ?? []);
      if (result.supabaseSession?.access_token) setIsLoggedIn(true);
      setLoaded(true);
    });
    try {
      browser.tabs?.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs[0]?.url) setCurrentUrl(tabs[0].url);
      }).catch(() => {});
    } catch { /* tabs API 없으면 무시 */ }
  }, []);

  const toggleEnabled = async () => { const next = !isEnabled; setIsEnabled(next); await browser.storage.local.set({ enabled: next }); };
  const changeLevel = async (v: number) => { setLevel(v); await browser.storage.local.set({ level: v }); };
  const toggleDark = async () => { const next = !darkTooltip; setDarkTooltip(next); await browser.storage.local.set({ darkTooltip: next }); };
  const toggleBlock = async (site: string) => {
    const updated = blockedSites.includes(site) ? blockedSites.filter((s) => s !== site) : [...blockedSites, site];
    setBlockedSites(updated); await browser.storage.local.set({ blockedSites: updated });
  };
  const toggleCurrentSite = () => { try { toggleBlock(new URL(currentUrl).hostname); } catch { /* noop */ } };

  if (!loaded) return null;

  return (
    <div style={S.popup}>
      {/* 헤더: 타이틀 + 배지 + 온오프 토글 */}
      <div style={S.header}>
        <span style={S.headerTitle}>한자한자</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={S.headerBadge}>{LEVEL_OPTIONS.find((o) => o.value === level)?.label ?? "8급"}</span>
          <ToggleSwitch on={isEnabled} onToggle={toggleEnabled} small />
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div style={S.content}>
        {activeTab === "today" && <TodayTab />}
        {activeTab === "yesterday" && <YesterdayTab />}
        {activeTab === "about" && <AboutTab />}
        {activeTab === "settings" && (
          <SettingsTab isLoggedIn={isLoggedIn} level={level} darkTooltip={darkTooltip}
            blockedSites={blockedSites} currentUrl={currentUrl}
            onChangeLevel={changeLevel} onToggleDark={toggleDark}
            onToggleBlock={toggleBlock} onToggleCurrentSite={toggleCurrentSite}
            onLogin={() => window.open("https://hanjahanja.kr/login", "_blank")}
            onLogout={() => setIsLoggedIn(false)} />
        )}
      </div>

      {/* 사자성어 하단 고정 (오늘 탭에서만) */}
      {activeTab === "today" && <IdiomBar />}

      {/* 하단 탭바 */}
      <div style={S.tabBar}>
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={S.tabItem(activeTab === tab.id)}>
            <TabIcon name={tab.icon} active={activeTab === tab.id} />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;
