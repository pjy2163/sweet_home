import { PolicyLayout, PolicySection } from "@/components/policy-layout";

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  const controllerName = process.env.SWEETHOME_PRIVACY_CONTROLLER_NAME?.trim()
    || "SweetHome 개인정보 문의";
  const contactEmail = process.env.SWEETHOME_PRIVACY_CONTACT_EMAIL?.trim()
    || "parangofsky@gmail.com";

  return (
    <PolicyLayout
      description="SweetHome이 로그인과 리포트 저장 과정에서 어떤 정보를 왜 처리하고, 언제 삭제하는지 설명합니다."
      effectiveDate="2026년 7월 15일"
      title="개인정보처리방침"
    >
      <PolicySection title="1. 처리 목적과 법적 근거">
        <p>SweetHome은 로그인 상태 확인, 사용자별 리포트 저장·조회, 보안 사고 대응 및 서비스 안정성 확보를 위해 필요한 최소한의 개인정보를 처리합니다. 처리는 서비스 제공 계약의 체결·이행, 사용자의 저장 요청 및 관련 법령상 의무 이행을 근거로 합니다.</p>
      </PolicySection>
      <PolicySection title="2. 처리하는 개인정보 항목">
        <ul className="list-disc space-y-2 pl-5">
          <li>로그인 시: 인증 제공자명(Google 또는 GitHub), 제공자가 부여한 불투명 사용자 식별자</li>
          <li>최초 확인 시: 이용약관 버전, 개인정보 처리 안내 버전, 확인 시각</li>
          <li>리포트 저장 시: 선택 지역 코드, 판단 기준, 비교 방식, 저장 시점의 데이터 근거와 생성 시각</li>
          <li>서비스 접속 시 자동 생성: 접속 시각, 요청·오류 기록 등 보안과 장애 대응에 필요한 최소 서버 로그</li>
        </ul>
        <p>SweetHome 애플리케이션 데이터베이스에는 비밀번호, 이메일 주소, 실명, OAuth access token·refresh token을 저장하지 않습니다.</p>
      </PolicySection>
      <PolicySection title="3. 보유 기간과 파기">
        <ul className="list-disc space-y-2 pl-5">
          <li>로그인 식별자, 약관 확인 이력과 저장 리포트: 이용 종료 또는 삭제 요청 시까지</li>
          <li>서비스 운영 로그: 생성일로부터 최대 30일</li>
        </ul>
        <p>목적이 달성되거나 보유기간이 끝난 정보는 복구하기 어려운 방식으로 지체 없이 삭제합니다. 법령에 따라 별도 보관이 필요한 경우에는 해당 근거와 기간을 안내하고 분리 보관합니다.</p>
      </PolicySection>
      <PolicySection title="4. 제3자 제공">
        <p>SweetHome은 저장된 리포트나 사용자 식별자를 광고 사업자에게 판매하거나 제공하지 않습니다. 법령에 특별한 근거가 있거나 정보주체가 별도로 동의한 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다.</p>
      </PolicySection>
      <PolicySection title="5. 처리 위탁과 외부 인증">
        <ul className="list-disc space-y-2 pl-5">
          <li>Microsoft Azure: 웹서비스 호스팅, 인증 중계, 데이터베이스 및 최대 30일 운영 로그 처리</li>
          <li>Google·GitHub: 사용자가 선택한 계정 인증과 인증 결과 제공</li>
        </ul>
        <p>서비스의 주 인프라는 Azure Korea Central 리전에 구성합니다. 외부 인증 과정에서 사용자가 선택한 Google 또는 GitHub의 해외 인프라로 인증 요청이 전달될 수 있으며, 계정 정보 처리는 각 인증 제공자의 개인정보처리방침과 사용자의 계정 설정을 따릅니다. SweetHome은 인증 제공자에게 저장 리포트 내용을 전달하지 않습니다.</p>
      </PolicySection>
      <PolicySection title="6. 정보주체의 권리와 행사 방법">
        <p>사용자는 자신의 개인정보와 저장 리포트에 대해 열람, 정정, 삭제, 처리정지 및 동의 철회를 요청할 수 있습니다. 아래 개인정보 문의처로 요청하면 본인 확인 후 관련 법령이 정한 기간 안에 처리합니다. Google·GitHub 계정 자체의 정보는 각 제공자 설정에서 관리해야 합니다.</p>
      </PolicySection>
      <PolicySection title="7. 자동 수집 장치">
        <p>로그인 유지와 보안을 위해 Azure 인증 쿠키 등 필수 쿠키가 사용될 수 있습니다. 현재 맞춤형 광고, 행동 추적 또는 마케팅 분석을 위한 쿠키는 사용하지 않습니다. 필수 쿠키를 차단하면 로그인과 리포트 저장 기능을 이용할 수 없습니다.</p>
      </PolicySection>
      <PolicySection title="8. 안전성 확보 조치">
        <p>SweetHome은 외부 HTTPS 통신, 내부 API 네트워크 제한, 서버 간 비밀키 검증, 사용자별 소유권 확인, 최소 권한, 비밀정보의 환경변수·Azure secret 관리, 보안 헤더와 로그 보존기간 제한을 적용합니다.</p>
      </PolicySection>
      <PolicySection title="9. 만 14세 미만 이용자">
        <p>SweetHome은 만 14세 미만 아동을 대상으로 개인정보를 의도적으로 수집하지 않습니다. 관련 정보가 확인되면 법정대리인의 요청 또는 확인 절차에 따라 삭제합니다.</p>
      </PolicySection>
      <PolicySection title="10. 개인정보 보호 문의">
        <dl className="grid gap-2 rounded-xl bg-surface-soft p-4 sm:grid-cols-[140px_1fr]">
          <dt className="font-semibold text-ink">서비스 운영</dt><dd>parang</dd>
          <dt className="font-semibold text-ink">개인정보 문의</dt><dd>{controllerName}</dd>
          <dt className="font-semibold text-ink">문의 이메일</dt><dd>{contactEmail}</dd>
        </dl>
        <p>개인정보 침해에 대한 신고나 상담이 필요한 경우 개인정보침해 신고센터(118), 개인정보분쟁조정위원회 등 관계 기관에 문의할 수 있습니다.</p>
      </PolicySection>
      <PolicySection title="11. 방침 변경">
        <p>내용이 변경되면 시행일과 주요 변경 사항을 서비스에서 알립니다. 수집 항목이나 이용 목적 등 중요한 변경에는 필요한 경우 별도 동의 절차를 진행합니다.</p>
      </PolicySection>
    </PolicyLayout>
  );
}
