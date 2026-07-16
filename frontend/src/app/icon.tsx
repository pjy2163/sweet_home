import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#102c22",
          borderRadius: 16,
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <svg height="48" viewBox="0 0 236 236" width="48">
          <path
            d="M29 105 117 35l32 25v150h-30V110H89v100H59v-80H29v-25Z"
            fill="#fffdf8"
          />
          <path d="m174 124 33-31v117h-33v-86Z" fill="#fffdf8" />
          <circle cx="173" cy="67" fill="#dfff62" r="16" />
        </svg>
      </div>
    ),
    size,
  );
}
