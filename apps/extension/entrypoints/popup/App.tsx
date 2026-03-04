import { useState, useEffect } from "react";

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

function App() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [level, setLevel] = useState(8);
  const [darkTooltip, setDarkTooltip] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    browser.storage.local.get(["enabled", "level", "darkTooltip"]).then((result) => {
      setIsEnabled(result.enabled ?? true);
      setLevel(result.level ?? 8);
      setDarkTooltip(result.darkTooltip ?? false);
      setLoaded(true);
    });
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

  if (!loaded) return null;

  return (
    <div style={{ width: 300, padding: 16, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>
        한자한자
      </h1>
      <hr style={{ marginBottom: 12 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span>{isEnabled ? "🟢" : "🔴"}</span>
        <span>변환 {isEnabled ? "활성화" : "비활성화"}</span>
        <button
          onClick={toggleEnabled}
          style={{ marginLeft: "auto", cursor: "pointer" }}
        >
          {isEnabled ? "끄기" : "켜기"}
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>
          현재 레벨:{" "}
          <select
            value={level}
            onChange={(e) => changeLevel(Number(e.target.value))}
          >
            {LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={darkTooltip}
            onChange={async (e) => {
              const next = e.target.checked;
              setDarkTooltip(next);
              await browser.storage.local.set({ darkTooltip: next });
            }}
          />
          툴팁 다크 모드
        </label>
      </div>

      <div style={{ color: "#888", fontSize: 13 }}>
        설정 변경 시 페이지가 새로고침됩니다.
      </div>

      <div style={{ marginTop: 12 }}>
        <a
          href="https://hanjahanja.kr/mypage"
          target="_blank"
          rel="noreferrer"
          style={{ color: "#3b82f6", textDecoration: "underline", fontSize: 13 }}
        >
          마이페이지 열기
        </a>
      </div>
    </div>
  );
}

export default App;
