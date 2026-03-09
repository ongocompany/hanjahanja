import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // 로그인 유지 옵션 확인 (기본값: 유지)
  const rememberMe = request.cookies.get("remember_me")?.value !== "0";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = { ...options };
            // 로그인 유지 해제 시 세션 쿠키로 변환 (브라우저 닫으면 만료)
            if (!rememberMe) {
              delete cookieOptions.maxAge;
              delete cookieOptions.expires;
            }
            supabaseResponse.cookies.set(name, value, cookieOptions);
          });
        },
      },
    }
  );

  // 세션 갱신 (만료된 토큰 자동 리프레시)
  await supabase.auth.getUser();

  return supabaseResponse;
}
