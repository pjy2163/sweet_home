import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SweetHome | 데이터로 완성하는 주거 의사결정",
  description: "가격, 생활인구, 안전, 편의 데이터로 서울의 주거 후보지를 탐색하고 비교하세요.",
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
