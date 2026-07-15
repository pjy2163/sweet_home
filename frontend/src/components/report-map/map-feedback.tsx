export type MapClickNoticeState = {
  tone: "guide" | "loading" | "success" | "error";
  text: string;
};

export function MapClickNotice({ notice }: { notice: MapClickNoticeState }) {
  const toneClass = {
    guide: "border-white/10 bg-black/55 text-[#d8d8dc]",
    loading: "border-[#65a68f]/45 bg-[#263a33]/92 text-sage-soft",
    success: "border-[#65a68f]/50 bg-[#214033]/92 text-[#e3f5ee]",
    error: "border-[#e8988f]/35 bg-[#2a1716]/90 text-[#ffc7c2]",
  }[notice.tone];

  return (
    <div
      className={`absolute bottom-5 left-5 z-20 max-w-[28rem] rounded-xl border px-4 py-3 text-xs leading-5 shadow-lg backdrop-blur ${toneClass}`}
    >
      <p className="font-semibold">위치 선택 분석</p>
      <p className="mt-1 opacity-85">{notice.text}</p>
    </div>
  );
}

export function MapStatusBanner({
  onRetry,
  text,
  tone = "loading",
}: {
  onRetry?: () => void;
  text: string;
  tone?: "loading" | "error";
}) {
  return (
    <div
      className={`absolute right-8 top-8 z-50 max-w-sm rounded-xl border px-4 py-3 text-xs leading-5 shadow-lg backdrop-blur ${
        tone === "error"
          ? "border-[#e8988f]/35 bg-[#2a1716]/95 text-[#ffc7c2]"
          : "border-[#65a68f]/40 bg-[#263a33]/92 text-sage-soft"
      }`}
      role={tone === "error" ? "alert" : "status"}
    >
      <p>{text}</p>
      {onRetry ? (
        <button
          className="mt-2 rounded-lg border border-current/25 px-3 py-1.5 font-semibold hover:bg-white/10"
          onClick={onRetry}
          type="button"
        >
          다시 시도
        </button>
      ) : null}
    </div>
  );
}

export function MapNotice({
  text,
  onRetry,
}: {
  text: string;
  onRetry?: () => void;
}) {
  return (
    <div className="absolute left-1/2 top-1/2 w-[min(420px,calc(100%_-_48px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0f1011] p-6 text-center text-sm font-medium text-[#9f9fa0]">
      <p>{text}</p>
      {onRetry ? (
        <button
          className="mt-4 rounded-lg border border-white/15 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
          onClick={onRetry}
          type="button"
        >
          다시 시도
        </button>
      ) : null}
    </div>
  );
}
