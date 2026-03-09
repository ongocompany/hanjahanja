import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function sanitizeRedirect(next: string): string {
  // 상대 경로만 허용, 외부 URL 차단
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeRedirect(searchParams.get("next") ?? "/");

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3500";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // 약관 미동의 시 프로필 완성 페이지로
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("terms_agreed_at")
          .eq("id", user.id)
          .single();

        if (!profile?.terms_agreed_at) {
          const completeUrl = new URL("/auth/complete-profile", origin);
          completeUrl.searchParams.set("next", next);
          return NextResponse.redirect(completeUrl.toString());
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
