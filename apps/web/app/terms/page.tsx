import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-cream px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm text-tan-dark hover:underline"
        >
          ← 홈으로
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-warm-brown">이용약관</h1>
        <p className="mt-2 text-sm text-warm-brown-light">
          시행일: 2026년 3월 9일
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-warm-brown">
          <section>
            <h2 className="text-lg font-semibold mb-3">제1조 (목적)</h2>
            <p>
              이 약관은 한자한자(이하 &ldquo;서비스&rdquo;)가 제공하는 한자 학습
              서비스의 이용 조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              제2조 (용어의 정의)
            </h2>
            <ul className="list-decimal ml-5 space-y-1 text-warm-brown-light">
              <li>
                &ldquo;회원&rdquo;이란 서비스에 가입하여 이용 계약을 체결한 자를
                말합니다.
              </li>
              <li>
                &ldquo;콘텐츠&rdquo;란 서비스에서 제공하는 한자 학습 자료, 진단
                테스트, 학습 기록 등을 말합니다.
              </li>
              <li>
                &ldquo;크롬 확장 프로그램&rdquo;이란 서비스가 제공하는 웹
                브라우저용 한자 변환 확장 프로그램을 말합니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              제3조 (서비스의 제공)
            </h2>
            <p className="mb-2">서비스는 다음과 같은 기능을 제공합니다.</p>
            <ul className="list-decimal ml-5 space-y-1 text-warm-brown-light">
              <li>
                웹페이지 한자어 자동 변환 (크롬 확장 프로그램)
              </li>
              <li>한자 실력 진단 테스트</li>
              <li>급수별 학습 진도 관리</li>
              <li>단어장 저장 및 관리</li>
              <li>오변환 신고 기능</li>
              <li>
                기타 서비스가 정하는 한자 학습 관련 기능
              </li>
            </ul>
            <p className="mt-2">
              서비스는 운영상·기술상 필요한 경우 제공하는 서비스를 변경할 수
              있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              제4조 (이용 계약의 성립)
            </h2>
            <ul className="list-decimal ml-5 space-y-1 text-warm-brown-light">
              <li>
                이용 계약은 이용자가 약관에 동의하고 회원가입을 완료한 시점에
                성립합니다.
              </li>
              <li>
                소셜 로그인(Google, 카카오, 네이버)을 통한 가입도 동일하게
                적용됩니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              제5조 (회원의 의무)
            </h2>
            <ul className="list-decimal ml-5 space-y-1 text-warm-brown-light">
              <li>
                회원은 관련 법령, 이 약관, 서비스 이용 안내 등을 준수하여야
                합니다.
              </li>
              <li>
                회원은 타인의 개인정보를 도용하거나 부정하게 사용해서는 안 됩니다.
              </li>
              <li>
                회원은 서비스를 이용하여 얻은 정보를 서비스의 사전 승낙 없이
                상업적으로 이용해서는 안 됩니다.
              </li>
              <li>
                회원은 오변환 신고 시 정확한 정보를 제공하여야 하며, 허위 신고를
                해서는 안 됩니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              제6조 (서비스 이용료)
            </h2>
            <ul className="list-decimal ml-5 space-y-1 text-warm-brown-light">
              <li>기본 서비스(8급~4급)는 무료로 제공됩니다.</li>
              <li>
                프리미엄 서비스(3급~특급)는 추후 유료로 제공될 수 있으며, 요금
                정책은 별도로 공지합니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              제7조 (서비스 이용의 제한·중지)
            </h2>
            <p className="mb-2">
              서비스는 다음 각 호에 해당하는 경우 서비스 이용을 제한하거나 중지할
              수 있습니다.
            </p>
            <ul className="list-decimal ml-5 space-y-1 text-warm-brown-light">
              <li>서비스 설비의 보수 등 공사로 인한 부득이한 경우</li>
              <li>회원이 본 약관의 의무를 위반한 경우</li>
              <li>서비스 운영에 심각한 장애를 초래하는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              제8조 (저작권 및 지적재산권)
            </h2>
            <ul className="list-decimal ml-5 space-y-1 text-warm-brown-light">
              <li>
                서비스가 제공하는 콘텐츠(한자 데이터, UI, AI 모델 등)에 대한
                저작권 및 지적재산권은 서비스에 귀속됩니다.
              </li>
              <li>
                회원이 오변환 신고를 통해 제공한 데이터는 AI 모델 개선 목적으로
                활용될 수 있으며, 회원은 이에 동의합니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              제9조 (회원 탈퇴 및 자격 상실)
            </h2>
            <ul className="list-decimal ml-5 space-y-1 text-warm-brown-light">
              <li>
                회원은 언제든지 마이페이지에서 탈퇴를 요청할 수 있습니다.
              </li>
              <li>
                탈퇴 시 회원의 개인정보 및 학습 기록은 즉시 삭제됩니다.
                단, 관련 법령에 따라 보존이 필요한 정보는 해당 기간 동안
                보관됩니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">제10조 (면책)</h2>
            <ul className="list-decimal ml-5 space-y-1 text-warm-brown-light">
              <li>
                서비스는 천재지변 등 불가항력으로 인한 서비스 제공 장애에 대해
                책임지지 않습니다.
              </li>
              <li>
                서비스는 회원의 귀책사유로 인한 서비스 이용 장애에 대해 책임지지
                않습니다.
              </li>
              <li>
                서비스가 제공하는 한자 변환 결과는 참고용이며, 변환의 정확성을
                보증하지 않습니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              제11조 (분쟁 해결)
            </h2>
            <p>
              서비스 이용과 관련하여 분쟁이 발생한 경우, 서비스와 회원은 상호
              협의하여 해결하도록 노력합니다. 협의가 이루어지지 않을 경우
              민사소송법에 따른 관할 법원에서 해결합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              제12조 (약관의 변경)
            </h2>
            <p>
              서비스는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 서비스
              내 공지 후 적용됩니다. 회원이 변경된 약관에 동의하지 않는 경우
              서비스 이용을 중단하고 탈퇴할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">부칙</h2>
            <p className="text-warm-brown-light">
              본 약관은 2026년 3월 9일부터 시행됩니다.
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
