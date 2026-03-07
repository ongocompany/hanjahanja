"use client";

import { logout } from "@/lib/auth/actions";

export function LogoutButton({ email }: { email?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-warm-brown-light hidden sm:inline">
        {email}
      </span>
      <button
        onClick={() => logout()}
        className="text-sm font-medium text-warm-brown-light hover:text-warm-brown transition-colors cursor-pointer"
      >
        로그아웃
      </button>
    </div>
  );
}
