"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signup } from "@/lib/auth/actions";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";

const TERMS = [
  {
    id: "terms",
    label: "이용약관 동의",
    content: `제1조 (목적)
이 약관은 한자한자(이하 "서비스")가 제공하는 한자 학습 서비스의 이용 조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.

제2조 (용어의 정의)
① "회원"이란 서비스에 가입하여 이용 계약을 체결한 자를 말합니다.
② "콘텐츠"란 서비스에서 제공하는 한자 학습 자료, 진단 테스트, 학습 기록 등을 말합니다.

제3조 (서비스의 제공)
① 서비스는 한자 학습 지원, 크롬 확장 프로그램, 진단 테스트, 학습 기록 관리 등을 제공합니다.
② 서비스는 운영상·기술상 필요한 경우 제공하는 서비스를 변경할 수 있습니다.

제4조 (회원의 의무)
① 회원은 관련 법령, 이 약관, 서비스 이용 안내 등을 준수하여야 합니다.
② 회원은 타인의 개인정보를 도용하거나 부정하게 사용해서는 안 됩니다.
③ 회원은 서비스를 이용하여 얻은 정보를 서비스의 사전 승낙 없이 상업적으로 이용해서는 안 됩니다.

제5조 (서비스 이용의 제한·중지)
서비스는 다음 각 호에 해당하는 경우 서비스 이용을 제한하거나 중지할 수 있습니다.
① 서비스 설비의 보수 등 공사로 인한 부득이한 경우
② 회원이 본 약관의 의무를 위반한 경우

제6조 (면책)
① 서비스는 천재지변 등 불가항력으로 인한 서비스 제공 장애에 대해 책임지지 않습니다.
② 서비스는 회원의 귀책사유로 인한 서비스 이용 장애에 대해 책임지지 않습니다.`,
  },
  {
    id: "privacy",
    label: "개인정보 수집·이용 동의",
    content: `1. 수집하는 개인정보 항목
- 필수: 이메일 주소, 비밀번호(암호화 저장)
- 자동 수집: 학습 기록, 서비스 이용 기록, 접속 로그

2. 개인정보의 수집·이용 목적
- 회원 식별 및 가입 의사 확인
- 서비스 제공 및 학습 진도 관리
- 서비스 개선을 위한 통계 분석
- 고지사항 전달 및 불만 처리

3. 개인정보의 보유 및 이용 기간
- 회원 탈퇴 시까지 보유하며, 탈퇴 즉시 파기합니다.
- 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
  · 계약 또는 청약철회에 관한 기록: 5년
  · 소비자 불만 또는 분쟁 처리에 관한 기록: 3년
  · 웹사이트 방문 기록: 3개월

4. 동의 거부 권리 및 불이익
개인정보 수집·이용에 대한 동의를 거부할 수 있으며, 거부 시 회원가입이 제한됩니다.`,
  },
  {
    id: "thirdParty",
    label: "제3자 정보제공 동의",
    content: `1. 개인정보를 제공받는 자
- Supabase Inc. (클라우드 인프라 제공)

2. 제공하는 개인정보 항목
- 이메일 주소, 암호화된 비밀번호, 서비스 이용 기록

3. 제공받는 자의 이용 목적
- 회원 인증 및 서비스 인프라 운영
- 데이터 저장 및 보안 관리

4. 보유 및 이용 기간
- 회원 탈퇴 시 또는 제3자 제공 목적 달성 시까지

5. 동의 거부 권리 및 불이익
제3자 정보제공에 대한 동의를 거부할 수 있으며, 거부 시 회원가입이 제한됩니다.

※ 서비스는 위 목적 외에 회원의 개인정보를 제3자에게 제공하지 않습니다.`,
  },
] as const;

export default function SignupPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    thirdParty: false,
  });
  const [openSection, setOpenSection] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const passwordConfirm = formData.get("passwordConfirm") as string;

    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      setLoading(false);
      return;
    }
    if (password.length < 10) {
      setError("비밀번호는 10자 이상이어야 합니다.");
      setLoading(false);
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("대문자를 1개 이상 포함해주세요.");
      setLoading(false);
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError("소문자를 1개 이상 포함해주세요.");
      setLoading(false);
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      setError("특수문자를 1개 이상 포함해주세요.");
      setLoading(false);
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      setLoading(false);
      return;
    }
    if (!agreements.terms || !agreements.privacy || !agreements.thirdParty) {
      setError("모든 필수 약관에 동의해주세요.");
      setLoading(false);
      return;
    }

    const result = await signup(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-cream">
      {/* 홈 링크 */}
      <Link
        href="/"
        className="absolute top-6 left-6 text-xl font-bold text-warm-brown"
      >
        한자한자
      </Link>
        <div className="w-full max-w-sm">
          {!success && (
            <div className="text-center mb-8">
              <Image
                src="/images/warmsmile.png"
                alt="미소짓는 책벌레"
                width={80}
                height={104}
                className="mx-auto mb-4 drop-shadow-sm"
              />
              <h1 className="text-2xl font-bold sm:text-3xl">회원가입</h1>
              <p className="mt-2 text-sm text-warm-brown-light">
                한자한자와 함께 한자 실력을 키워보세요
              </p>
            </div>
          )}

          {success ? (
            <div className="rounded-2xl bg-vanilla/60 p-6 text-center">
              <Image
                src="/images/missioncomplete.png"
                alt="미션완료"
                width={70}
                height={77}
                className="mx-auto mb-4"
              />
              <h2 className="text-lg font-bold">가입 완료!</h2>
              <p className="mt-2 text-sm text-warm-brown-light leading-relaxed">
                입력하신 이메일로 확인 메일을 보냈습니다.
                <br />
                메일의 링크를 클릭하면 가입이 완료됩니다.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block rounded-xl bg-tan px-6 py-2.5 text-sm font-semibold text-cream hover:bg-tan-dark transition-colors"
              >
                로그인하러 가기
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-warm-brown mb-1"
                >
                  이메일
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="email@example.com"
                  className="w-full rounded-xl border-2 border-vanilla bg-white px-4 py-3 text-base outline-none focus:border-tan transition-colors placeholder:text-warm-brown-light/40"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-warm-brown mb-1"
                >
                  비밀번호
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={10}
                  placeholder="10자 이상 (대소문자 + 특수문자)"
                  className="w-full rounded-xl border-2 border-vanilla bg-white px-4 py-3 text-base outline-none focus:border-tan transition-colors placeholder:text-warm-brown-light/40"
                />
                <p className="mt-1.5 text-xs text-warm-brown-light/60">
                  대문자·소문자·특수문자 각 1개 이상, 10자 이상
                </p>
              </div>

              <div>
                <label
                  htmlFor="passwordConfirm"
                  className="block text-sm font-medium text-warm-brown mb-1"
                >
                  비밀번호 확인
                </label>
                <input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  required
                  minLength={10}
                  placeholder="비밀번호 다시 입력"
                  className="w-full rounded-xl border-2 border-vanilla bg-white px-4 py-3 text-base outline-none focus:border-tan transition-colors placeholder:text-warm-brown-light/40"
                />
              </div>

              {/* 약관 동의 */}
              <div className="space-y-2 pt-2">
                {/* 전체 동의 */}
                <label className="flex items-center gap-2 rounded-xl bg-vanilla/40 px-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreements.terms && agreements.privacy && agreements.thirdParty}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAgreements({ terms: checked, privacy: checked, thirdParty: checked });
                    }}
                    className="size-4 accent-tan"
                  />
                  <span className="text-sm font-semibold text-warm-brown">전체 동의</span>
                </label>

                {TERMS.map((term) => (
                  <div key={term.id} className="border-b border-vanilla/60 last:border-0">
                    <div className="flex items-center justify-between px-3 py-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agreements[term.id]}
                          onChange={(e) =>
                            setAgreements((prev) => ({ ...prev, [term.id]: e.target.checked }))
                          }
                          className="size-4 accent-tan"
                        />
                        <span className="text-sm text-warm-brown">
                          <span className="text-xs text-tan-dark font-medium">[필수]</span>{" "}
                          {term.label}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setOpenSection(openSection === term.id ? null : term.id)}
                        className="text-xs text-warm-brown-light hover:text-tan-dark transition-colors"
                      >
                        {openSection === term.id ? "접기" : "보기"}
                      </button>
                    </div>
                    {openSection === term.id && (
                      <div className="mx-3 mb-2 rounded-lg bg-white/60 px-3 py-2 max-h-40 overflow-y-auto">
                        <pre className="text-xs text-warm-brown-light whitespace-pre-wrap leading-relaxed font-[Pretendard]">
                          {term.content}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-tan py-3 text-base font-semibold text-cream hover:bg-tan-dark transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? "가입 중..." : "회원가입"}
              </button>
            </form>
          )}

          {!success && (
            <>
              <SocialLoginButtons />
              <p className="mt-6 text-center text-sm text-warm-brown-light">
                이미 계정이 있나요?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-tan-dark hover:underline"
                >
                  로그인
                </Link>
              </p>
            </>
          )}
        </div>
    </main>
  );
}
