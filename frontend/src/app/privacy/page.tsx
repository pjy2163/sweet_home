import { PolicyLayout, PolicySection } from "@/components/policy-layout";

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  const controllerName = process.env.SWEETHOME_PRIVACY_CONTROLLER_NAME?.trim()
    || "SweetHome 개인정보 문의";
  const contactEmail = process.env.SWEETHOME_PRIVACY_CONTACT_EMAIL?.trim()
    || "parangofsky@gmail.com";

  return (
    <PolicyLayout
      description="SweetHome이 로그인, 리포트 저장, 서비스 분석과 광고 연결 과정에서 어떤 정보를 왜 처리하는지 설명합니다."
      effectiveDate="2026년 7월 18일"
      title="개인정보처리방침"
    >
      <PolicySection title="1. 처리 목적과 법적 근거">
        <p>SweetHome은 로그인 상태 확인, 사용자별 리포트 저장·조회, 보안 사고 대응, 서비스 이용 현황 분석, 품질 개선과 광고 연결을 위해 필요한 정보를 처리합니다. 서비스 제공은 계약의 체결·이행과 사용자의 저장 요청을 근거로 하며, 분석 쿠키와 맞춤형 광고 등 관련 법령상 동의가 필요한 처리는 사용자의 동의를 근거로 합니다.</p>
      </PolicySection>
      <PolicySection title="2. 처리하는 개인정보 항목">
        <ul className="list-disc space-y-2 pl-5">
          <li>로그인 시: 인증 제공자명(Google 또는 GitHub), 제공자가 부여한 불투명 사용자 식별자</li>
          <li>최초 확인 시: 이용약관 버전, 개인정보 처리 안내 버전, 확인 시각</li>
          <li>리포트 저장 시: 선택 지역 코드, 판단 기준, 비교 방식, 저장 시점의 데이터 근거와 생성 시각</li>
          <li>서비스 접속 시 자동 생성: 접속 시각, 요청·오류 기록 등 보안과 장애 대응에 필요한 최소 서버 로그</li>
          <li>Google Analytics 이용 시: 임의의 클라이언트 식별자, 방문·세션 통계, 대략적인 위치, 브라우저·기기 정보와 페이지 이용 이벤트</li>
          <li>Google AdSense 연결 및 광고 이용 시: IP 주소, 쿠키·온라인 식별자, 브라우저·기기 정보, 광고 요청·노출·클릭 정보</li>
        </ul>
        <p>Google 태그가 처리하는 정보는 Google의 시스템으로 전송될 수 있으나, SweetHome 애플리케이션 데이터베이스에는 비밀번호, 이메일 주소, 실명, OAuth access token·refresh token이나 Google 광고 쿠키를 저장하지 않습니다.</p>
      </PolicySection>
      <PolicySection title="3. 보유 기간과 파기">
        <ul className="list-disc space-y-2 pl-5">
          <li>로그인 식별자, 약관 확인 이력과 저장 리포트: 이용 종료 또는 삭제 요청 시까지</li>
          <li>서비스 운영 로그: 생성일로부터 최대 30일</li>
          <li>Google Analytics·AdSense 처리 정보: 각 Google 서비스의 계정 설정, 보존 정책과 사용자 선택에 따른 기간</li>
        </ul>
        <p>목적이 달성되거나 보유기간이 끝난 정보는 복구하기 어려운 방식으로 지체 없이 삭제합니다. 법령에 따라 별도 보관이 필요한 경우에는 해당 근거와 기간을 안내하고 분리 보관합니다.</p>
      </PolicySection>
      <PolicySection title="4. 제3자 제공">
        <p>SweetHome은 저장된 리포트나 로그인 사용자 식별자를 광고 사업자에게 판매하지 않습니다. 다만 Google Analytics와 Google AdSense 태그가 실행되면 방문·기기 정보, 온라인 식별자와 광고 상호작용 정보가 서비스 분석, 광고 제공과 측정을 위해 Google에 전송될 수 있습니다. 저장 리포트의 지역 선택이나 비교 내용은 광고 태그에 의도적으로 전달하지 않습니다.</p>
      </PolicySection>
      <PolicySection title="5. 처리 위탁과 외부 서비스">
        <ul className="list-disc space-y-2 pl-5">
          <li>Microsoft Azure: 웹서비스 호스팅, 인증 중계, 데이터베이스 및 최대 30일 운영 로그 처리</li>
          <li>Google·GitHub: 사용자가 선택한 계정 인증과 인증 결과 제공</li>
          <li>Google Analytics: 방문 현황과 서비스 이용 통계 분석</li>
          <li>Google AdSense: 사이트 소유권 확인, 광고 제공과 성과 측정</li>
        </ul>
        <p>서비스의 주 인프라는 Azure Korea Central 리전에 구성합니다. 외부 인증, 분석과 광고 과정에서 정보가 Google 또는 GitHub의 해외 인프라로 전송·처리될 수 있으며, 각 서비스의 개인정보처리방침과 사용자의 계정·동의 설정을 따릅니다. 자세한 내용은 <a className="text-sage-strong underline underline-offset-4" href="https://policies.google.com/privacy?hl=ko" rel="noreferrer" target="_blank">Google 개인정보처리방침</a>에서 확인할 수 있습니다.</p>
      </PolicySection>
      <PolicySection title="6. 정보주체의 권리와 행사 방법">
        <p>사용자는 자신의 개인정보와 저장 리포트에 대해 열람, 정정, 삭제, 처리정지 및 동의 철회를 요청할 수 있습니다. 아래 개인정보 문의처로 요청하면 본인 확인 후 관련 법령이 정한 기간 안에 처리합니다. Google·GitHub 계정과 광고 맞춤설정은 각 제공자 설정에서 관리해야 합니다.</p>
      </PolicySection>
      <PolicySection title="7. 자동 수집 장치">
        <p>로그인 유지와 보안을 위해 Azure 인증 쿠키 등 필수 쿠키가 사용됩니다. Google Analytics는 방문자와 세션을 구분하기 위해 <code>_ga</code> 등 분석 쿠키를 사용할 수 있고, Google AdSense는 광고 제공·빈도 제한·성과 측정과 설정에 따른 맞춤화를 위해 Google 또는 제3자 도메인의 쿠키와 로컬 저장소를 사용할 수 있습니다.</p>
        <p>사용자는 브라우저 설정에서 쿠키를 삭제·차단하고, <a className="text-sage-strong underline underline-offset-4" href="https://adssettings.google.com/" rel="noreferrer" target="_blank">Google 광고 설정</a> 또는 <a className="text-sage-strong underline underline-offset-4" href="https://tools.google.com/dlpage/gaoptout?hl=ko" rel="noreferrer" target="_blank">Google Analytics 차단 브라우저 부가기능</a>을 이용할 수 있습니다. 필수 쿠키를 차단하면 로그인과 리포트 저장 기능을 이용할 수 없습니다.</p>
        <p>유럽경제지역, 영국 또는 스위스 이용자에게 광고를 제공하는 경우 광고 활성화 전에 Google 인증 동의 관리 플랫폼을 통해 필요한 고지와 동의 선택을 제공합니다.</p>
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
