import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SweetHome | 서울 행정동 비교",
  description: "서울 행정동 후보지를 객관 데이터로 비교하는 SweetHome MVP",
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
