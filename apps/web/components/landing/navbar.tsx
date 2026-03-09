import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NavMenu } from "./nav-menu";

export async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let avatarUrl: string | null = null;
  let nickname: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url, nickname")
      .eq("id", user.id)
      .single();
    avatarUrl = profile?.avatar_url || null;
    nickname = profile?.nickname || null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-cream/80 backdrop-blur-md border-b border-warm-brown/5">
      <div className="relative mx-auto max-w-5xl flex items-center justify-between px-6 py-3">
        {/* 로고 */}
        <Link href="/" className="text-xl font-bold text-warm-brown">
          한자한자
        </Link>

        <NavMenu user={user ? { nickname, avatarUrl } : null} />
      </div>
    </header>
  );
}
