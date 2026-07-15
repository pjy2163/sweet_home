"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { deleteSavedReport } from "@/lib/api";

export function ReportDeleteButton({
  iconOnly = false,
  onDeleted,
  reportId,
}: {
  iconOnly?: boolean;
  onDeleted?: () => void;
  reportId: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "deleting" | "error">("idle");

  async function remove() {
    if (!window.confirm("이 리포트와 비교 기록을 삭제할까요? 삭제한 기록은 복구할 수 없습니다.")) return;
    setStatus("deleting");
    try {
      await deleteSavedReport(reportId);
      if (onDeleted) {
        onDeleted();
      } else {
        router.replace("/mypage?deleted=1");
        router.refresh();
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="text-right">
      <button
        aria-label={iconOnly ? "리포트 삭제" : undefined}
        className={iconOnly
          ? "grid h-8 w-8 place-items-center rounded-full border border-line bg-white/85 text-lg font-light leading-none text-subtle shadow-sm transition hover:border-[#dcaeb8] hover:bg-[#fff5f7] hover:text-[#a34d5e] disabled:cursor-not-allowed disabled:opacity-50"
          : "rounded-lg border border-[#e6cbd1] bg-white/75 px-3 py-2 text-xs font-semibold text-[#a34d5e] transition hover:border-[#dcaeb8] hover:bg-[#fff5f7] disabled:cursor-not-allowed disabled:opacity-50"}
        disabled={status === "deleting"}
        onClick={() => void remove()}
        title={iconOnly ? "리포트 삭제" : undefined}
        type="button"
      >
        {iconOnly ? (status === "deleting" ? "…" : "×") : status === "deleting" ? "삭제 중…" : "리포트 삭제"}
      </button>
      {status === "error" && !iconOnly ? <p className="mt-2 text-[11px] text-[#a34d5e]">삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.</p> : null}
    </div>
  );
}
