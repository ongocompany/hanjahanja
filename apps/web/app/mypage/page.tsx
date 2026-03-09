import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVocabulary } from "@/lib/vocab/actions";
import { MyPageTabs } from "@/components/mypage/mypage-tabs";

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
];

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/mypage");
  }

  // 프로필 조회
  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, current_level")
    .eq("id", user.id)
    .single();

  // 단어장 조회
  const { data: vocab } = await getVocabulary();

  const nickname = profile?.nickname || user.email?.split("@")[0] || "사용자";
  const currentLevel = profile?.current_level ?? 8;

  return (
    <main className="min-h-screen bg-cream">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-20 sm:pt-24 pb-16">
        {/* 상단 프로필 카드 */}
        <div className="rounded-2xl bg-vanilla/60 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-warm-brown">
                {nickname}님의 학습
              </h1>
              <p className="text-sm text-warm-brown-light mt-1">
                현재 급수:{" "}
                <span className="font-semibold text-tan-dark">
                  {LEVEL_OPTIONS.find((o) => o.value === currentLevel)?.label ??
                    `${currentLevel}급`}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* 탭 - 클라이언트 컴포넌트로 위임 */}
        <MyPageTabs
          vocab={vocab}
          nickname={nickname}
          currentLevel={currentLevel}
          userEmail={user.email ?? ""}
          levelOptions={LEVEL_OPTIONS}
        />
      </div>
    </main>
  );
}
