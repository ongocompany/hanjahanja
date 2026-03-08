import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NavMenu } from "./nav-menu";

export async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-cream/80 backdrop-blur-md border-b border-warm-brown/5">
      <div className="relative mx-auto max-w-5xl flex items-center justify-between px-6 py-3">
        {/* 로고 */}
        <Link href="/" className="text-xl font-bold text-warm-brown">
          한자한자
        </Link>

        <NavMenu user={user ? { email: user.email } : null} />
      </div>
    </header>
  );
}
