import { ImageResponse } from "next/og";

export const alt = "SweetHome — Compare neighborhoods with data";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const comparisonBars = [
  { left: "72%", right: "86%", label: "COST" },
  { left: "84%", right: "66%", label: "LIFE" },
  { left: "61%", right: "78%", label: "MOBILITY" },
];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#f8fbf9",
          color: "#102c22",
          display: "flex",
          height: "100%",
          overflow: "hidden",
          padding: "68px 72px",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#d9eee7",
            borderRadius: 999,
            display: "flex",
            height: 460,
            opacity: 0.72,
            position: "absolute",
            right: -160,
            top: -220,
            width: 460,
          }}
        />
        <div
          style={{
            background: "#eee4f3",
            borderRadius: 999,
            bottom: -360,
            display: "flex",
            height: 650,
            left: 250,
            opacity: 0.78,
            position: "absolute",
            width: 650,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            width: "54%",
          }}
        >
          <div style={{ alignItems: "center", display: "flex", gap: 22 }}>
            <div
              style={{
                alignItems: "center",
                background: "#102c22",
                borderRadius: 18,
                display: "flex",
                height: 78,
                justifyContent: "center",
                width: 78,
              }}
            >
              <svg height="58" viewBox="0 0 236 236" width="58">
                <path
                  d="M29 105 117 35l32 25v150h-30V110H89v100H59v-80H29v-25Z"
                  fill="#fffdf8"
                />
                <path d="m174 124 33-31v117h-33v-86Z" fill="#fffdf8" />
                <circle cx="173" cy="67" fill="#dfff62" r="16" />
              </svg>
            </div>
            <div style={{ fontSize: 45, fontWeight: 700, letterSpacing: -2 }}>
              SweetHome
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div
              style={{
                color: "#397b67",
                fontSize: 19,
                fontWeight: 700,
                letterSpacing: 3.4,
              }}
            >
              RESIDENTIAL DECISION SUPPORT
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 62,
                fontWeight: 700,
                letterSpacing: -3.2,
                lineHeight: 1.04,
              }}
            >
              <span>Compare places.</span>
              <span>Decide with data.</span>
            </div>
            <div
              style={{
                color: "#60736c",
                fontSize: 24,
                lineHeight: 1.45,
                maxWidth: 540,
              }}
            >
              Cost, daily life, safety context and mobility—viewed on the same basis.
            </div>
          </div>

          <div style={{ color: "#73857f", display: "flex", fontSize: 18, gap: 26 }}>
            <span>SEOUL</span>
            <span>•</span>
            <span>OPEN DATA</span>
            <span>•</span>
            <span>NO RANKING</span>
          </div>
        </div>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "flex-end",
            position: "relative",
            width: "46%",
          }}
        >
          <div
            style={{
              background: "rgba(255, 255, 255, 0.92)",
              border: "1px solid #d8e2de",
              borderRadius: 30,
              boxShadow: "0 24px 70px rgba(16, 44, 34, 0.12)",
              display: "flex",
              flexDirection: "column",
              gap: 24,
              padding: "34px 32px",
              width: 440,
            }}
          >
            <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ color: "#72847d", fontSize: 15, letterSpacing: 2 }}>COMPARE</span>
                <span style={{ fontSize: 25, fontWeight: 700 }}>AREA A</span>
              </div>
              <div
                style={{
                  alignItems: "center",
                  background: "#eff5f2",
                  borderRadius: 999,
                  color: "#567067",
                  display: "flex",
                  fontSize: 16,
                  height: 40,
                  justifyContent: "center",
                  width: 72,
                }}
              >
                AND
              </div>
              <div style={{ alignItems: "flex-end", display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ color: "#72847d", fontSize: 15, letterSpacing: 2 }}>COMPARE</span>
                <span style={{ fontSize: 25, fontWeight: 700 }}>AREA B</span>
              </div>
            </div>

            <div style={{ background: "#e5ece9", display: "flex", height: 1, width: "100%" }} />

            {comparisonBars.map((bar) => (
              <div key={bar.label} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div
                  style={{
                    color: "#73857f",
                    display: "flex",
                    fontSize: 14,
                    fontWeight: 700,
                    justifyContent: "space-between",
                    letterSpacing: 1.6,
                  }}
                >
                  <span>{bar.left}</span>
                  <span>{bar.label}</span>
                  <span>{bar.right}</span>
                </div>
                <div style={{ display: "flex", gap: 8, height: 14, width: "100%" }}>
                  <div style={{ background: "#7666b4", borderRadius: 99, display: "flex", width: bar.left }} />
                  <div style={{ background: "#dce4e1", borderRadius: 99, display: "flex", flex: 1 }} />
                </div>
                <div style={{ display: "flex", gap: 8, height: 14, width: "100%" }}>
                  <div style={{ background: "#55a58b", borderRadius: 99, display: "flex", width: bar.right }} />
                  <div style={{ background: "#dce4e1", borderRadius: 99, display: "flex", flex: 1 }} />
                </div>
              </div>
            ))}

            <div
              style={{
                background: "#f0f7f4",
                borderRadius: 16,
                color: "#397b67",
                display: "flex",
                fontSize: 16,
                justifyContent: "center",
                padding: "14px 18px",
              }}
            >
              Same data basis · clearer trade-offs
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
