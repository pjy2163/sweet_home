import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "SweetHome — 귀여운 집 캐릭터와 함께 동네를 데이터로 비교하는 서비스";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function OpenGraphImage() {
  const illustration = await readFile(
    path.join(process.cwd(), "public", "sweethome-brand-illustration.png"),
  );
  const illustrationDataUrl = `data:image/png;base64,${illustration.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          background: "#eaf4f2",
          display: "flex",
          height: "100%",
          overflow: "hidden",
          position: "relative",
          width: "100%",
        }}
      >
        <img
          alt=""
          height="630"
          src={illustrationDataUrl}
          style={{
            height: "100%",
            objectFit: "cover",
            width: "100%",
          }}
          width="1200"
        />

        <div
          style={{
            background: "linear-gradient(180deg, rgba(16, 44, 34, 0.36) 0%, transparent 32%, transparent 68%, rgba(16, 44, 34, 0.46) 100%)",
            display: "flex",
            inset: 0,
            position: "absolute",
          }}
        />

        <div
          style={{
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.92)",
            border: "1px solid rgba(255, 255, 255, 0.95)",
            borderRadius: 999,
            boxShadow: "0 12px 36px rgba(16, 44, 34, 0.16)",
            color: "#102c22",
            display: "flex",
            fontSize: 30,
            fontWeight: 700,
            gap: 14,
            left: 46,
            letterSpacing: -1.2,
            padding: "15px 25px 15px 18px",
            position: "absolute",
            top: 40,
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "#102c22",
              borderRadius: 13,
              display: "flex",
              height: 48,
              justifyContent: "center",
              width: 48,
            }}
          >
            <svg height="36" viewBox="0 0 236 236" width="36">
              <path d="M29 105 117 35l32 25v150h-30V110H89v100H59v-80H29v-25Z" fill="#fffdf8" />
              <path d="m174 124 33-31v117h-33v-86Z" fill="#fffdf8" />
              <circle cx="173" cy="67" fill="#dfff62" r="16" />
            </svg>
          </div>
          SweetHome
        </div>

        <div
          style={{
            background: "rgba(16, 44, 34, 0.88)",
            border: "1px solid rgba(255, 255, 255, 0.24)",
            borderRadius: 18,
            bottom: 34,
            color: "#ffffff",
            display: "flex",
            fontSize: 21,
            fontWeight: 700,
            left: 46,
            letterSpacing: 1.8,
            padding: "14px 22px",
            position: "absolute",
          }}
        >
          COMPARE PLACES · DECIDE WITH DATA
        </div>
      </div>
    ),
    size,
  );
}
