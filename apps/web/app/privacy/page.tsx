import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-cream px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm text-tan-dark hover:underline"
        >
          ← 홈으로
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-warm-brown">
          개인정보처리방침
        </h1>
        <p className="mt-2 text-sm text-warm-brown-light">
          시행일: 2026년 3월 9일
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-warm-brown">
          <section>
            <h2 className="text-lg font-semibold mb-3">제1조 (목적)</h2>
            <p>
              한자한자(이하 &ldquo;서비스&rdquo;)는 이용자의 개인정보를 중요시하며,
              「개인정보 보호법」 등 관련 법령을 준수합니다. 본 개인정보처리방침은
              서비스가 수집하는 개인정보의 항목, 수집 목적, 보유 기간, 제3자 제공 등에
              관한 사항을 안내합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              제2조 (수집하는 개인정보 항목)
            </h2>
            <p className="mb-2">서비스는 다음과 같은 개인정보를 수집합니다.</p>
            <div className="rounded-xl bg-white border-2 border-vanilla p-4 space-y-3">
              <div>
                <p className="font-medium">1. 회원가입 시 (필수)</p>
                <ul className="list-disc ml-5 mt-1 text-warm-brown-light">
                  <li>이메일 주소</li>
                  <li>비밀번호 (암호화 저장)</li>
                  <li>전화번호</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">2. 소셜 로그인 시 (필수)</p>
                <ul className="list-disc ml-5 mt-1 text-warm-brown-light">
                  <li>이메일 주소 (OAuth 제공자로부터 수신)</li>
                  <li>이름/닉네임 (OAuth 제공자로부터 수신)</li>
                  <li>전화번호 (추가 입력)</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">3. 서비스 이용 중 자동 수집</p>
                <ul className="list-disc ml-5 mt-1 text-warm-brown-light">
                  <li>한자 학습 기록 (노출, 클릭, 퀴즈 결과)</li>
                  <li>단어장 저장 내역</li>
                  <li>오변환 신고 내역</li>
                  <li>접속 로그 (IP 주소, 접속 시간)</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              제3조 (개인정보의 수집·이용 목적)
            </h2>
            <ul className="list-disc ml-5 space-y-1 text-warm-brown-light">
              <li>회원 식별 및 가입 의사 확인</li>
              <li>서비스 제공 및 한자 학습 진도 관리</li>
              <li>AI 모델(WSD) 개선을 위한 학습 데이터 활용</li>
              <li>서비스 개선을 위한 통계 분석</li>
              <li>고지사항 전달, 불만 처리, 분쟁 조정</li>
              <li>부정 이용 방지 및 서비스 안정성 확보</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              제4조 (개인정보의 보유 및 이용 기간)
            </h2>
            <p className="mb-2">
              회원 탈퇴 시까지 보유하며, 탈퇴 즉시 파기합니다. 단, 관련 법령에 따라
              보존이 필요한 경우 해당 기간 동안 보관합니다.
            </p>
            <ul className="list-disc ml-5 space-y-1 text-warm-brown-light">
              <li>계약 또는 청약철회에 관한 기록: 5년</li>
              <li>소비자 불만 또는 분쟁 처리에 관한 기록: 3년</li>
              <li>웹사이트 방문 기록: 3개월</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              제5조 (개인정보의 제3자 제공)
            </h2>
            <p className="mb-2">
              서비스는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
              다만, 서비스 운영을 위해 다음과 같이 제3자에게 개인정보를 제공합니다.
            </p>
            <div className="rounded-xl bg-white border-2 border-vanilla p-4 space-y-3">
              <div>
                <p className="font-medium">1. Supabase Inc.</p>
                <ul className="list-disc ml-5 mt-1 text-warm-brown-light">
                  <li>제공 항목: 이메일, 암호화된 비밀번호, 서비스 이용 기록</li>
                  <li>목적: 회원 인증, 데이터 저장 및 보안 관리</li>
                  <li>보유 기간: 회원 탈퇴 시까지</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">2. Google LLC (소셜 로그인 이용 시)</p>
                <ul className="list-disc ml-5 mt-1 text-warm-brown-light">
                  <li>제공 항목: OAuth 인증 토큰</li>
                  <li>목적: 간편 로그인 인증</li>
                  <li>보유 기간: 연동 해제 시까지</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">
                  3. 카카오 (소셜 로그인 이용 시)
                </p>
                <ul className="list-disc ml-5 mt-1 text-warm-brown-light">
                  <li>제공 항목: OAuth 인증 토큰</li>
                  <li>목적: 간편 로그인 인증</li>
                  <li>보유 기간: 연동 해제 시까지</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              제6조 (개인정보의 파기)
            </h2>
            <p>
              서비스는 개인정보의 수집·이용 목적이 달성되거나 회원이 탈퇴를 요청한
              경우, 해당 개인정보를 지체 없이 파기합니다. 전자적 파일 형태의
              개인정보는 복구할 수 없는 방법으로 영구 삭제하며, 종이에 출력된
              개인정보는 분쇄기로 파기합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              제7조 (이용자의 권리)
            </h2>
            <ul className="list-disc ml-5 space-y-1 text-warm-brown-light">
              <li>
                이용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있습니다.
              </li>
              <li>
                이용자는 개인정보 수집·이용에 대한 동의를 철회(회원 탈퇴)할 수
                있습니다.
              </li>
              <li>
                개인정보 열람, 정정, 삭제, 처리 정지 요청은 마이페이지 또는
                아래 연락처를 통해 가능합니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              제8조 (개인정보 보호책임자)
            </h2>
            <div className="rounded-xl bg-white border-2 border-vanilla p-4 text-warm-brown-light">
              <p>서비스명: 한자한자</p>
              <p>이메일: contact@hanjahanja.co.kr</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              제9조 (개정 이력)
            </h2>
            <p className="text-warm-brown-light">
              본 개인정보처리방침은 2026년 3월 9일부터 시행됩니다.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-vanilla pt-6 text-center">
          <Link
            href="/"
            className="text-sm text-tan-dark hover:underline"
          >
            ← 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
