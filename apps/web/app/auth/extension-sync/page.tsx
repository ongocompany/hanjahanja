import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ExtensionSyncPage() {
  const supabase = await createClient();

  // getUser()로 서버에서 토큰 검증 (getSession은 검증 없이 캐시된 값 반환)
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/auth/extension-sync");
  }

  // 세션은 검증 후에만 가져옴
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login?next=/auth/extension-sync");
  }

  // 세션 데이터를 JSON으로 직렬화 (content script가 읽어감)
  // 주의: 이 페이지는 확장 전용이며, content script가 즉시 읽고 페이지를 닫음
  const sessionData = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    user: {
      id: user.id,
      email: user.email,
    },
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-cream">
      <div className="w-full max-w-sm text-center">
        <div className="text-4xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-warm-brown mb-2">로그인 완료!</h1>
        <p className="text-sm text-warm-brown-light mb-4">
          크롬 확장에 로그인 정보를 전달하는 중...
        </p>
        <p className="text-xs text-warm-brown-light/60">
          이 페이지는 자동으로 닫힙니다.
        </p>
      </div>
      {/* content script가 읽어갈 세션 데이터 */}
      <div id="hanjahanja-session" data-session={sessionData} style={{ display: "none" }} />
    </main>
  );
}
