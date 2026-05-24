"use client";

import Link from "next/link";
import Script from "next/script";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

declare global {
  interface Window {
    Paddle?: {
      Environment: {
        set(environment: "sandbox" | "production"): void;
      };
      Initialize(options: {
        token: string;
        checkout?: {
          settings?: {
            displayMode?: "overlay" | "inline";
            theme?: "light" | "dark";
            locale?: string;
            successUrl?: string;
          };
        };
      }): void;
      Checkout: {
        open(options: { transactionId: string; settings?: { successUrl?: string } }): void;
      };
    };
  }
}

const paddleClientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
const paddleEnvironment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production" ? "production" : "sandbox";

export function PaddleCheckout() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("Loading checkout...");

  function initializePaddle() {
    const transactionId = new URLSearchParams(window.location.search).get("_ptxn");

    if (!paddleClientToken) {
      setStatus("error");
      setMessage("Paddle checkout is not configured. Set NEXT_PUBLIC_PADDLE_CLIENT_TOKEN.");
      return;
    }

    if (!transactionId) {
      setStatus("error");
      setMessage("Checkout transaction is missing.");
      return;
    }

    if (!window.Paddle) {
      setStatus("error");
      setMessage("Paddle checkout script did not load.");
      return;
    }

    if (paddleEnvironment === "sandbox") {
      window.Paddle.Environment.set("sandbox");
    }

    window.Paddle.Initialize({
      token: paddleClientToken,
      checkout: {
        settings: {
          displayMode: "overlay",
          theme: "dark",
          locale: "en",
          successUrl: `${window.location.origin}/dashboard/account?checkout=success`,
        },
      },
    });

    window.Paddle.Checkout.open({
      transactionId,
      settings: {
        successUrl: `${window.location.origin}/dashboard/account?checkout=success`,
      },
    });

    setStatus("ready");
    setMessage("Checkout is open. Credits are added after Paddle confirms payment.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#172033_0,#090a0f_34rem)] px-4 py-10">
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="afterInteractive" onLoad={initializePaddle} onError={() => {
        setStatus("error");
        setMessage("Could not load Paddle checkout.");
      }} />
      <section className="w-full max-w-md rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 text-center shadow-2xl">
        <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-[var(--accent)] text-[#06120b]">
          {status === "loading" ? <Loader2 className="size-6 animate-spin" /> : <Sparkles className="size-6" />}
        </div>
        <h1 className="mt-5 text-2xl font-semibold">Cloudsurf checkout</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{message}</p>
        <Link
          href="/dashboard/account"
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-[#151823] px-4 text-sm font-medium text-foreground transition hover:border-[#4b5264] hover:bg-[#1d2230]"
        >
          <ArrowLeft className="size-4" />
          Back to account
        </Link>
      </section>
    </main>
  );
}
