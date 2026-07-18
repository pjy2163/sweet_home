import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import Script from "next/script";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-noto-sans-kr",
});

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: "서울 동네 비교와 후보 찾기 | SweetHome",
    template: "%s | SweetHome",
  },
  description: "서울 동네 추천이 필요할 때 정답 대신 예산, 주거 비용, 생활 편의, 교통과 야간 생활환경 데이터를 같은 기준으로 비교해 후보를 좁혀보세요.",
  applicationName: "SweetHome",
  category: "real estate decision support",
  other: {
    "google-adsense-account": "ca-pub-7211753432405785",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "SweetHome",
    url: "/",
    title: "서울 동네 비교와 후보 찾기 | SweetHome",
    description: "집을 추천하는 대신 후보 지역을 같은 데이터 기준으로 비교합니다.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "SweetHome — 데이터로 비교하는 주거 의사결정",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "서울 동네 비교와 후보 찾기 | SweetHome",
    description: "가격과 생활 조건을 같은 기준으로 비교해 나에게 맞는 주거 결정을 돕습니다.",
    images: ["/twitter-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full`}>
      <head>
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-RNBTG5PPDM"
          strategy="beforeInteractive"
        />
        <Script
          id="google-analytics"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'G-RNBTG5PPDM');
            `,
          }}
        />
        <Script
          async
          crossOrigin="anonymous"
          id="google-adsense"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7211753432405785"
          strategy="beforeInteractive"
        />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
