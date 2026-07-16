import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-noto-sans-kr",
});

const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000",
);

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "SweetHome | 데이터로 비교하는 주거 의사결정",
    template: "%s | SweetHome",
  },
  description: "집을 추천하는 대신 가격, 생활 편의, 야간 생활환경, 교통 데이터를 같은 기준으로 비교해 주거 의사결정을 돕습니다.",
  applicationName: "SweetHome",
  category: "real estate decision support",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "SweetHome",
    url: "/",
    title: "SweetHome | 데이터로 비교하는 주거 의사결정",
    description: "집을 추천하는 대신 후보 지역을 같은 데이터 기준으로 비교합니다.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SweetHome | 데이터로 비교하는 주거 의사결정",
    description: "가격과 생활 조건을 같은 기준으로 비교해 나에게 맞는 주거 결정을 돕습니다.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
