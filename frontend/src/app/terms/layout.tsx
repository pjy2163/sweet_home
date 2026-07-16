import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "서비스 이용약관",
  alternates: { canonical: "/terms" },
};

export default function TermsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
