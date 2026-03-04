import { useState } from "react";

function App() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [level, setLevel] = useState(8);

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
          onClick={() => setIsEnabled(!isEnabled)}
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
            onChange={(e) => setLevel(Number(e.target.value))}
          >
            <option value={8}>8급</option>
            <option value={7}>7급</option>
            <option value={6}>6급</option>
            <option value={5}>5급</option>
            <option value={4}>4급</option>
          </select>
        </label>
      </div>

      <div style={{ color: "#888", fontSize: 13 }}>
        오늘 본 한자: 0개
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
