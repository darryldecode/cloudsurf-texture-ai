"use client";

import dynamic from "next/dynamic";

function LoginFormPlaceholder() {
  return <div className="h-[314px] w-full max-w-md rounded-lg border border-[var(--line)] bg-[var(--panel)] shadow-2xl sm:h-[324px]" />;
}

export const LoginFormNoSsr = dynamic(() => import("./login-form").then((mod) => mod.LoginForm), {
  ssr: false,
  loading: LoginFormPlaceholder,
});
