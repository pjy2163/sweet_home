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
    description: "조건을 선택해 관련 지표가 많이 관측된 행정동 후보군을 봅니다",
  },
  {
    id: "known",
    eyebrow: "Compare",
    title: "후보지를 알고 있어요",
    description: "알고 있는 행정동 2곳을 선택해 평균 대비 지표를 비교합니다",
  },
];

export function EntryModeSelector({
  mode,
  onModeChange,
}: EntryModeSelectorProps) {
  return (
    <section
      className="mx-auto max-w-5xl px-6 py-20 lg:px-10 lg:py-28"
      id="entry"
    >
      <div className="mx-auto mb-12 max-w-3xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5e7069]">001 — Start</p>
        <h2 className="mt-5 text-3xl font-normal leading-[1.14] tracking-[-0.055em] sm:text-5xl">
          지금 어디쯤 와 있나요?
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#5e7069]">
          후보지가 정해졌다면 바로 비교하고, 아직 막막하다면 조건을 먼저
          선택해 데이터상 관측 지표가 많은 후보군을 좁혀봅니다.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
          {ENTRY_MODES.map((entryMode) => {
            const selected = mode === entryMode.id;

            return (
              <button
                aria-pressed={selected}
                className={`group min-h-72 rounded-[1.5rem] border p-8 text-left shadow-[0_22px_60px_rgba(18,29,23,0.06)] transition sm:p-10 ${
                  selected
                    ? "border-[#121d17] bg-[#121d17] text-[#f5f4ee]"
                    : "border-[#d7e3dc] bg-[#fbfcf8] text-[#172019] hover:border-[#9fb4aa] hover:bg-[#f3f7f3]"
                }`}
                key={entryMode.id}
                onClick={() => onModeChange(entryMode.id)}
                type="button"
              >
                <span
                  className={`block text-xs font-bold uppercase tracking-[0.16em] ${
                    selected ? "text-[#dfff62]" : "text-[#527367]"
                  }`}
                >
                  {entryMode.eyebrow}
                </span>
                <span className="mt-16 block max-w-md text-2xl font-normal leading-[1.14] tracking-[-0.055em] sm:text-4xl">
                  {entryMode.title}
                </span>
                <span className={`mt-7 block max-w-sm leading-7 ${selected ? "text-white/65" : "text-[#5e7069]"}`}>
                  {entryMode.description}
                </span>
                <span className="mt-8 inline-grid h-12 w-12 place-items-center rounded-lg border border-current text-xl transition group-hover:rotate-45">↗</span>
              </button>
            );
          })}
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
          <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
            어떤 방식으로 후보지를 볼까요?
          </h2>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-[#526b62] sm:text-lg">
            알고 있는 지역을 바로 비교하거나, 조건을 선택해 데이터상 관련
            지표가 많이 관측된 후보군을 먼저 확인할 수 있습니다
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
              <span className="mt-5 block text-2xl font-black leading-tight sm:text-3xl">
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
