"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchAuthSession } from "@/lib/api";

export function AuthMenu({ className = "" }: { className?: string }) {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;
    fetchAuthSession()
      .then((session) => {
        if (active) setAuthenticated(Boolean(session?.authenticated));
      })
      .catch(() => {
        if (active) setAuthenticated(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (authenticated) {
    return (
      <a
        className={className}
        href="/.auth/logout?post_logout_redirect_uri=/"
      >
        로그아웃
      </a>
    );
  }

  return <Link className={className} href="/login">로그인</Link>;
}
