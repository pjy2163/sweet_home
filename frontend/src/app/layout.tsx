import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SweetHome | 데이터로 완성하는 주거 의사결정",
  description: "가격, 시간대별 체류 특성, 야간 생활환경, 편의 데이터로 서울의 주거 후보지를 비교하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
