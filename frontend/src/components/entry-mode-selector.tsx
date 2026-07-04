export type EntryMode = "unknown" | "known";

type EntryModeSelectorProps = {
  mode: EntryMode;
  onModeChange: (mode: EntryMode) => void;
};

const ENTRY_MODES: Array<{
  id: EntryMode;
  title: string;
  eyebrow: string;
  description: string;
}> = [
  {
    id: "unknown",
    eyebrow: "Explore",
    title: "후보지를 모르겠어요",
    description: "조건을 선택해 관련 지표가 많이 관측된 행정동 후보군을 봅니다.",
  },
  {
    id: "known",
    eyebrow: "Compare",
    title: "후보지를 알고 있어요",
    description: "알고 있는 행정동 2곳을 선택해 평균 대비 지표를 비교합니다.",
  },
];

export function EntryModeSelector({
  mode,
  onModeChange,
}: EntryModeSelectorProps) {
  return (
    <section
      className="mx-auto max-w-7xl px-6 pb-8 lg:px-10"
      id="entry"
    >
      <div className="border border-[#d7e6df] bg-white p-3 shadow-[0_14px_36px_rgba(31,83,67,0.07)]">
        <div className="grid gap-2 md:grid-cols-2">
          {ENTRY_MODES.map((entryMode) => {
            const selected = mode === entryMode.id;

            return (
              <button
                aria-pressed={selected}
                className={`border px-5 py-4 text-left transition ${
                  selected
                    ? "border-[#176b57] bg-[#176b57] text-white"
                    : "border-[#d7e6df] bg-[#fbfefd] text-[#10231d] hover:border-[#176b57]"
                }`}
                key={entryMode.id}
                onClick={() => onModeChange(entryMode.id)}
                type="button"
              >
                <span
                  className={`block text-xs font-black uppercase ${
                    selected ? "text-[#d7eee5]" : "text-[#527367]"
                  }`}
                >
                  {entryMode.eyebrow}
                </span>
                <span className="mt-2 block text-xl font-black sm:text-2xl">
                  {entryMode.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function EntryModeModal({
  onModeChange,
}: {
  onModeChange: (mode: EntryMode) => void;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f2e25]/55 px-5 py-8"
      role="dialog"
    >
      <div className="max-h-full w-full max-w-5xl overflow-y-auto border border-[#176b57] bg-[#f7fbf8] shadow-[0_28px_80px_rgba(6,32,24,0.28)]">
        <div className="border-b border-[#d7e6df] bg-white p-6 sm:p-8">
          <p className="text-sm font-black uppercase text-[#527367]">
            Start
          </p>
          <h2 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
            어떤 방식으로 후보지를 볼까요?
          </h2>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-[#526b62] sm:text-lg">
            알고 있는 지역을 바로 비교하거나, 조건을 선택해 데이터상 관련
            지표가 많이 관측된 후보군을 먼저 확인할 수 있습니다.
          </p>
        </div>
        <div className="grid gap-3 p-3 md:grid-cols-2">
          {ENTRY_MODES.map((entryMode) => (
            <button
              className="group min-h-64 border border-[#d7e6df] bg-white p-6 text-left transition hover:border-[#176b57] hover:bg-[#176b57] hover:text-white sm:p-8"
              key={entryMode.id}
              onClick={() => onModeChange(entryMode.id)}
              type="button"
            >
              <span className="inline-flex border border-[#cfe3da] bg-[#ecf8f2] px-3 py-1 text-xs font-black uppercase text-[#176b57] group-hover:border-white/35 group-hover:bg-white/15 group-hover:text-[#dff4eb]">
                {entryMode.eyebrow}
              </span>
              <span className="mt-5 block text-3xl font-black leading-tight sm:text-4xl">
                {entryMode.title}
              </span>
              <span className="mt-6 block text-base font-semibold leading-7 text-[#5e7069] group-hover:text-[#e6f6ef]">
                {entryMode.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
