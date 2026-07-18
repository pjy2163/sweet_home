import { randomUUID } from "node:crypto";

import type {
  AgreementStatus,
  CandidateMatchRegion,
  ExploreCondition,
  SavedReportCreate,
  SavedReportDetail,
  SavedReportSummary,
} from "@/types/sweethome";

const TERMS_VERSION = "2026-07-15";
const PRIVACY_NOTICE_VERSION = "2026-07-18";

const PRIORITY_LABELS: Record<ExploreCondition, string> = {
  price: "주거 비용",
  population: "거주·활동 특성",
  safety: "야간 생활환경",
  convenience: "생활 편의",
  transport: "교통 접근성",
};

type DevelopmentReportRequest = SavedReportCreate & {
  preview_regions?: CandidateMatchRegion[];
};

type DevelopmentStore = {
  reportsByRequest: Map<string, SavedReportDetail>;
  reportsById: Map<string, SavedReportDetail>;
};

const globalStore = globalThis as typeof globalThis & {
  __sweethomeDevelopmentStore?: DevelopmentStore;
};

function store() {
  globalStore.__sweethomeDevelopmentStore ??= {
    reportsByRequest: new Map(),
    reportsById: new Map(),
  };
  return globalStore.__sweethomeDevelopmentStore;
}

export function developmentAgreementStatus(): AgreementStatus {
  return {
    accepted: true,
    terms_version: TERMS_VERSION,
    privacy_notice_version: PRIVACY_NOTICE_VERSION,
    accepted_at: new Date().toISOString(),
  };
}

export function createDevelopmentReport(
  request: DevelopmentReportRequest,
): SavedReportDetail {
  const currentStore = store();
  const existing = currentStore.reportsByRequest.get(request.client_request_id);
  if (existing) return existing;

  const regions = (request.preview_regions ?? []).slice(0, 2);
  const regionNames = regions.length > 0
    ? regions.map((region) => region.display_name)
    : request.region_ids.map((regionId) => `행정동 ${regionId}`);
  const priorityLabels = request.priority_keys.map((key) => PRIORITY_LABELS[key]);
  const title = regionNames.length === 2
    ? `${regionNames[0]} ↔ ${regionNames[1]} 비교`
    : `${regionNames[0]} 살펴보기`;
  const summary = regionNames.length === 2
    ? `${priorityLabels.join(", ")} 기준으로 ${regionNames[0]}과 ${regionNames[1]}의 비교 근거를 저장했습니다.`
    : `${priorityLabels.join(", ")} 기준으로 ${regionNames[0]}의 분석 근거를 저장했습니다.`;
  const dates = [...new Set(
    regions.flatMap((region) =>
      region.evidence_metrics
        .map((metric) => metric.data_date)
        .filter((date): date is string => Boolean(date)),
    ),
  )].sort();
  const report: SavedReportDetail = {
    report_id: randomUUID(),
    region_ids: request.region_ids,
    region_names: regionNames,
    priority_keys: request.priority_keys,
    comparison_basis: request.comparison_basis,
    title,
    summary,
    data_version: dates.join(",") || "local-preview",
    created_at: new Date().toISOString(),
    report_content: {
      title,
      summary,
      region_names: regionNames,
      priority_labels: priorityLabels,
      decision_flow: {
        candidate_count: regionNames.length,
        comparison_basis: request.comparison_basis,
        notice: "추천이나 종합 순위가 아닌, 현재 화면에서 확인한 비교 근거입니다.",
      },
      decision_context: request.decision_context,
      regions,
      detailed_regions: request.preview_detailed_regions,
      source: "SweetHome 로컬 개발 미리보기",
      limitation: "개발 서버를 재시작하면 이 로컬 기록은 초기화됩니다.",
    },
  };
  currentStore.reportsByRequest.set(request.client_request_id, report);
  currentStore.reportsById.set(report.report_id, report);
  return report;
}

export function listDevelopmentReports(): SavedReportSummary[] {
  return [...store().reportsById.values()]
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .map((report) => ({
      report_id: report.report_id,
      region_ids: report.region_ids,
      region_names: report.region_names,
      priority_keys: report.priority_keys,
      comparison_basis: report.comparison_basis,
      title: report.title,
      summary: report.summary,
      data_version: report.data_version,
      created_at: report.created_at,
    }));
}

export function getDevelopmentReport(reportId: string) {
  return store().reportsById.get(reportId) ?? null;
}

export function deleteDevelopmentReport(reportId: string) {
  const currentStore = store();
  const report = currentStore.reportsById.get(reportId);
  if (!report) return false;
  currentStore.reportsById.delete(reportId);
  currentStore.reportsByRequest.delete(
    [...currentStore.reportsByRequest.entries()]
      .find(([, storedReport]) => storedReport.report_id === reportId)?.[0] ?? "",
  );
  return true;
}
