"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { logout } from "@/lib/auth/actions";

interface NavMenuProps {
  user: { nickname?: string | null; avatarUrl?: string | null } | null;
}

function UserAvatar({ avatarUrl, nickname, size = 32 }: { avatarUrl?: string | null; nickname?: string | null; size?: number }) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={nickname || "프로필"}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  // 기본 이미지: 책벌레
  return (
    <Image
      src="/images/default.png"
      alt="프로필"
      width={size}
      height={size}
      className="rounded-full object-cover bg-vanilla"
      style={{ width: size, height: size }}
    />
  );
}

export function NavMenu({ user }: NavMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 데스크톱 메뉴 */}
      <nav className="hidden md:flex items-center gap-6">
        <Link
          href="/guide"
          className="text-sm font-medium text-warm-brown-light hover:text-warm-brown transition-colors"
        >
          사용방법
        </Link>
        <Link
          href="/about"
          className="text-sm font-medium text-warm-brown-light hover:text-warm-brown transition-colors"
        >
          한자한자 소개
        </Link>
        {user ? (
          <>
            <Link
              href="/mypage"
              className="text-sm font-medium text-warm-brown-light hover:text-warm-brown transition-colors"
            >
              마이페이지
            </Link>
            <div className="flex items-center gap-2">
              <UserAvatar avatarUrl={user.avatarUrl} nickname={user.nickname} size={28} />
              <span className="text-sm text-warm-brown-light hidden lg:inline max-w-[100px] truncate">
                {user.nickname || "사용자"}
              </span>
              <button
                onClick={() => logout()}
                className="text-xs font-medium text-warm-brown-light/60 hover:text-warm-brown transition-colors cursor-pointer ml-1"
              >
                로그아웃
              </button>
            </div>
          </>
        ) : (
          <Link
            href="/login"
            className="text-sm font-semibold bg-tan hover:bg-tan-dark text-cream rounded-lg px-4 py-2 transition-colors"
          >
            로그인
          </Link>
        )}
      </nav>

      {/* 모바일 햄버거 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 cursor-pointer"
        aria-label="메뉴 열기"
      >
        <span
          className={`block w-5 h-0.5 bg-warm-brown transition-all duration-200 ${
            open ? "rotate-45 translate-y-1" : ""
          }`}
        />
        <span
          className={`block w-5 h-0.5 bg-warm-brown transition-all duration-200 ${
            open ? "opacity-0" : ""
          }`}
        />
        <span
          className={`block w-5 h-0.5 bg-warm-brown transition-all duration-200 ${
            open ? "-rotate-45 -translate-y-1" : ""
          }`}
        />
      </button>

      {/* 모바일 드롭다운 메뉴 */}
      {open && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-cream/95 backdrop-blur-md border-b border-warm-brown/10 shadow-sm">
          <nav className="flex flex-col px-6 py-4 gap-3">
            <Link
              href="/guide"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-warm-brown-light hover:text-warm-brown transition-colors py-1"
            >
              사용방법
            </Link>
            <Link
              href="/about"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-warm-brown-light hover:text-warm-brown transition-colors py-1"
            >
              한자한자 소개
            </Link>
            {user ? (
              <>
                <Link
                  href="/mypage"
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-warm-brown-light hover:text-warm-brown transition-colors py-1"
                >
                  마이페이지
                </Link>
                <div className="flex items-center gap-2 py-1">
                  <UserAvatar avatarUrl={user.avatarUrl} nickname={user.nickname} size={24} />
                  <span className="text-sm text-warm-brown-light">
                    {user.nickname || "사용자"}
                  </span>
                  <button
                    onClick={() => logout()}
                    className="text-xs font-medium text-warm-brown-light/60 hover:text-warm-brown transition-colors cursor-pointer ml-auto"
                  >
                    로그아웃
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="inline-block text-center text-sm font-medium bg-tan hover:bg-tan-dark text-cream rounded-lg px-4 py-2 transition-colors"
              >
                로그인
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
