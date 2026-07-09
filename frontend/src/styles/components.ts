export const layoutStyles = {
  page: "min-h-screen bg-[#e9eee9] text-[#121d17]",
  section: "mx-auto max-w-7xl px-6 lg:px-10",
  borderedPanel:
    "overflow-hidden rounded-[2rem] border border-[#cbd5cf] bg-[#fbfcf8]",
  panelPadding: "p-8 sm:p-12",
};

export const textStyles = {
  eyebrow: "text-xs font-bold uppercase tracking-[0.18em] text-[#607068]",
  heroTitle:
    "mx-auto max-w-5xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl",
  sectionTitle:
    "mt-4 text-3xl font-normal leading-[1.14] tracking-[-0.055em] sm:text-4xl",
  body: "text-base leading-7 text-[#5e7069]",
};

export const controlStyles = {
  select:
    "h-16 rounded-lg border border-[#d3ddd6] bg-[#f7faf6] px-5 text-lg font-semibold outline-none transition focus:border-[#173d31] focus:bg-white",
  primaryButton:
    "mt-10 h-16 w-full rounded-lg bg-[#121d17] px-8 text-lg font-bold text-[#f5f4ee] transition hover:bg-[#22352b] disabled:bg-[#8da69c]",
  error:
    "mt-6 rounded-lg border border-[#d7e6df] bg-[#f0f7f4] px-5 py-4 text-base font-semibold text-[#5e7069]",
};

export const tableStyles = {
  grid: "grid min-w-[42rem] grid-cols-[1fr_1.2fr_1.2fr]",
  header:
    "grid min-w-[42rem] grid-cols-[1fr_1.2fr_1.2fr] pb-4 text-xs font-bold uppercase tracking-[0.16em] text-[#607068]",
  row:
    "grid min-w-[42rem] grid-cols-[1fr_1.2fr_1.2fr] border-t border-[#d9e1dc] py-4 text-sm sm:text-base",
};
