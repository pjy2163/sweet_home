import { PolicyLayout, PolicySection } from "@/components/policy-layout";

export default function DataPolicyPage() {
  return (
    <PolicyLayout
      description="SweetHome이 데이터를 비교에 사용하는 방식과 결과를 해석할 때 반드시 함께 봐야 할 한계를 정리했습니다."
      effectiveDate="2026년 7월 15일"
      title="데이터 이용 안내"
    >
      <PolicySection title="비교의 기본 단위">
        <p>현재 서비스는 서울 행정동을 공통 비교 단위로 사용합니다. 법정동, 주소 또는 좌표로 제공되는 원천은 명시된 연결 과정을 거쳐 행정동 기준으로 변환합니다.</p>
      </PolicySection>
      <PolicySection title="지표별 기준일">
        <p>주거 비용, 생활인구, 야간 생활환경, 생활 편의와 교통 데이터는 갱신 주기가 서로 다릅니다. 각 화면과 저장 리포트에는 가능한 범위에서 원천명과 기준일을 함께 표시하며, 리포트는 저장 당시의 근거를 보존합니다.</p>
      </PolicySection>
      <PolicySection title="결과의 의미">
        <p>서비스의 높음·낮음 표현은 같은 데이터셋에서 관측된 서울 행정동 분포에 대한 상대적 설명입니다. 지역의 종합 순위, 추천, 안전 보장, 투자 가치 또는 미래 가격 예측을 의미하지 않습니다.</p>
      </PolicySection>
      <PolicySection title="주요 해석 한계">
        <ul className="list-disc space-y-2 pl-5">
          <li>생활인구는 주민등록상 거주인구가 아니라 특정 시간대의 체류 추정인구입니다.</li>
          <li>안심 인프라와 야간 상권 시설은 환경을 살펴보는 참고 근거이며 범죄율이 아닙니다.</li>
          <li>교통 데이터는 역·정류소의 정적 위치로, 실제 도보시간·배차·혼잡·환승 편의를 반영하지 않습니다.</li>
          <li>거래량이 적거나 결측인 지역은 가격 해석의 신뢰도가 낮을 수 있습니다.</li>
        </ul>
      </PolicySection>
      <PolicySection title="공식 원천 확인">
        <p>지표별 공식 원천, 이용 조건, 산출 방식과 현재 결측 범위는 공개 저장소의 데이터 출처 표와 각 지도 화면의 ‘데이터 출처’에서 확인할 수 있습니다.</p>
        <a className="inline-flex font-bold text-sage-strong underline underline-offset-4" href="https://github.com/pjy2163/sweet_home#데이터-출처와-산출-기준" rel="noreferrer" target="_blank">전체 데이터 출처 보기 ↗</a>
      </PolicySection>
    </PolicyLayout>
  );
}
