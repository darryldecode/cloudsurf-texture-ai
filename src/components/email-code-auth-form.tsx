"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, KeyRound, Loader2, LockKeyhole, MailCheck, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth/client";
import styles from "./email-code-auth-form.module.css";

type AuthStep = "sign-up" | "verify";

type StatusMessage = {
  tone: "success" | "error" | "info";
  text: string;
};

type EmailCodeAuthFormProps = {
  initialEmail?: string;
  initialStep: AuthStep;
  next?: string;
};

const pendingEmailStorageKey = "cloudsurf.pendingVerificationEmail";
const codeLength = 6;
const resendCooldownSeconds = 45;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const maybeError = error as { error?: { message?: string; code?: string }; message?: string };
    return maybeError.error?.message ?? maybeError.error?.code ?? maybeError.message ?? "Something went wrong. Please try again.";
  }

  return "Something went wrong. Please try again.";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getSafeRedirect(value?: string) {
  if (!value) {
    return "/dashboard";
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  if (typeof window === "undefined") {
    return "/dashboard";
  }

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin === window.location.origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return "/dashboard";
  }

  return "/dashboard";
}

function isSixDigitCode(value: string) {
  return new RegExp(`^\\d{${codeLength}}$`).test(value);
}

function statusClasses(tone: StatusMessage["tone"]) {
  if (tone === "success") {
    return "border-[rgb(97_211_148/0.28)] bg-[rgb(97_211_148/0.1)] text-[#bcf3d0]";
  }

  if (tone === "error") {
    return "border-[rgb(255_105_120/0.28)] bg-[rgb(255_105_120/0.1)] text-[#ffd1d6]";
  }

  return "border-[rgb(244_184_96/0.24)] bg-[rgb(244_184_96/0.09)] text-[#f8d8a3]";
}

function navigateAfterAuth(redirectTo: string) {
  window.location.assign(redirectTo);
}

export function EmailCodeAuthForm({ initialEmail = "", initialStep, next }: EmailCodeAuthFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>(initialStep);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [pending, setPending] = useState<"sign-up" | "send-code" | "verify" | null>(null);
  const [codeSent, setCodeSent] = useState(initialStep === "verify" && Boolean(initialEmail));
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [secondsUntilResend, setSecondsUntilResend] = useState(0);

  const redirectTo = useMemo(() => getSafeRedirect(next), [next]);
  const normalizedEmail = normalizeEmail(email);
  const canResend = secondsUntilResend === 0;

  useEffect(() => {
    if (initialEmail || initialStep !== "verify") {
      return;
    }

    const storedEmail = sessionStorage.getItem(pendingEmailStorageKey);
    if (storedEmail) {
      queueMicrotask(() => {
        setEmail(storedEmail);
        setCodeSent(true);
      });
    }
  }, [initialEmail, initialStep]);

  useEffect(() => {
    if (!resendAvailableAt) {
      return;
    }

    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000));
      setSecondsUntilResend(remaining);
    }, 500);
    return () => window.clearInterval(interval);
  }, [resendAvailableAt]);

  function startResendCooldown() {
    setResendAvailableAt(Date.now() + resendCooldownSeconds * 1000);
    setSecondsUntilResend(resendCooldownSeconds);
  }

  async function sendVerificationCode(emailAddress = normalizedEmail, showSuccess = true) {
    if (!emailAddress) {
      setStatus({ tone: "error", text: "Enter the email address you used to create your account." });
      return false;
    }

    setPending("send-code");
    setStatus(null);

    try {
      await authClient.emailOtp.sendVerificationOtp({
        email: emailAddress,
        type: "email-verification",
        fetchOptions: { throw: true },
      });

      sessionStorage.setItem(pendingEmailStorageKey, emailAddress);
      setCodeSent(true);
      startResendCooldown();
      if (showSuccess) {
        setStatus({ tone: "success", text: "A fresh verification code was sent to your email." });
      }
      return true;
    } catch (error) {
      setStatus({ tone: "error", text: getErrorMessage(error) });
      return false;
    } finally {
      setPending(null);
    }
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!name.trim()) {
      setStatus({ tone: "error", text: "Enter your name so your workspace profile is ready." });
      return;
    }

    if (!normalizedEmail) {
      setStatus({ tone: "error", text: "Enter a valid email address." });
      return;
    }

    if (password.length < 8) {
      setStatus({ tone: "error", text: "Use at least 8 characters for your password." });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ tone: "error", text: "Those passwords do not match." });
      return;
    }

    setPending("sign-up");

    try {
      const callbackURL = `${window.location.origin}/auth/verify-email?next=${encodeURIComponent(redirectTo)}`;
      const result = await authClient.signUp.email({
        email: normalizedEmail,
        password,
        name: name.trim(),
        callbackURL,
        fetchOptions: { throw: true },
      });
      const signUpResult = result as { token?: string | null; user?: { emailVerified?: boolean } };

      if (signUpResult.token && signUpResult.user?.emailVerified) {
        navigateAfterAuth(redirectTo);
        return;
      }

      const verificationSent = await sendVerificationCode(normalizedEmail, false);
      if (!verificationSent) {
        return;
      }

      setStep("verify");
      setPassword("");
      setConfirmPassword("");
      setStatus({ tone: "success", text: "Account created. Enter the 6-digit code we sent to verify your email." });
      router.replace(`/auth/verify-email?next=${encodeURIComponent(redirectTo)}`);
    } catch (error) {
      setStatus({ tone: "error", text: getErrorMessage(error) });
    } finally {
      setPending(null);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!normalizedEmail) {
      setStatus({ tone: "error", text: "Enter the email address tied to your new account." });
      return;
    }

    if (!isSixDigitCode(code)) {
      setStatus({ tone: "error", text: "Enter the 6-digit code from your email." });
      return;
    }

    setPending("verify");

    try {
      await authClient.emailOtp.verifyEmail({
        email: normalizedEmail,
        otp: code,
        fetchOptions: { throw: true },
      });

      sessionStorage.removeItem(pendingEmailStorageKey);
      setStatus({ tone: "success", text: "Email verified. Taking you to your workspace." });
      navigateAfterAuth(redirectTo);
    } catch (error) {
      setStatus({ tone: "error", text: getErrorMessage(error) });
    } finally {
      setPending(null);
    }
  }

  function handleCodeChange(value: string) {
    setCode(value.replace(/\D/g, "").slice(0, codeLength));
  }

  const isVerifying = step === "verify";
  const title = isVerifying ? "Verify your email" : "Create your workspace";
  const description = isVerifying
    ? "Enter the code sent to your inbox to finish securing your Cloudsurf Texture AI account."
    : "Start with a verified account so generated texture assets stay tied to the right workspace.";

  return (
    <div className={styles.shell}>
      <div className={styles.header}>
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-[#182033] text-[var(--accent)]">
            {isVerifying ? <MailCheck className="size-5" /> : <ShieldCheck className="size-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-[var(--accent)]">Account access</p>
            <h2 className="mt-1 text-xl font-semibold">{title}</h2>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>

      <div className={styles.body}>
        {status ? (
          <div className={`mb-5 flex gap-3 rounded-md border p-4 text-sm leading-6 ${statusClasses(status.tone)}`} aria-live="polite">
            {status.tone === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
            <p>{status.text}</p>
          </div>
        ) : null}

        {isVerifying ? (
          <form className={styles.form} onSubmit={handleVerify}>
            <label className={styles.field} htmlFor="verification-email">
              Email
              <div className={styles.inputWrap}>
                <MailCheck className={styles.fieldIcon} />
                <input
                  id="verification-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={styles.input}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </label>

            <label className={styles.field} htmlFor="verification-code">
              Verification code
              <div className={styles.inputWrap}>
                <KeyRound className={styles.fieldIcon} />
                <input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => handleCodeChange(event.target.value)}
                  className={`${styles.input} ${styles.codeInput}`}
                  placeholder="000000"
                  maxLength={codeLength}
                  required
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={pending !== null || !isSixDigitCode(code)}
              className={`${styles.button} ${styles.primaryButton}`}
            >
              {pending === "verify" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Verify email
            </button>

            <button
              type="button"
              disabled={pending !== null || !canResend}
              onClick={() => sendVerificationCode()}
              className={`${styles.button} ${styles.secondaryButton}`}
            >
              {pending === "send-code" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {codeSent && !canResend ? `Resend code in ${secondsUntilResend}s` : "Send verification code"}
            </button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleSignUp}>
            <label className={styles.field} htmlFor="signup-name">
              Name
              <div className={styles.inputWrap}>
                <UserRound className={styles.fieldIcon} />
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={styles.input}
                  placeholder="Your name"
                  required
                />
              </div>
            </label>

            <label className={styles.field} htmlFor="signup-email">
              Email
              <div className={styles.inputWrap}>
                <MailCheck className={styles.fieldIcon} />
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={styles.input}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </label>

            <label className={styles.field} htmlFor="signup-password">
              Password
              <div className={styles.inputWrap}>
                <LockKeyhole className={styles.fieldIcon} />
                <input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={styles.input}
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
              </div>
            </label>

            <label className={styles.field} htmlFor="signup-confirm-password">
              Confirm password
              <div className={styles.inputWrap}>
                <LockKeyhole className={styles.fieldIcon} />
                <input
                  id="signup-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={styles.input}
                  placeholder="Repeat your password"
                  minLength={8}
                  required
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={pending !== null}
              className={`${styles.button} ${styles.primaryButton}`}
            >
              {pending === "sign-up" || pending === "send-code" ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              Create account
            </button>
          </form>
        )}

        <div className={styles.footer}>
          <span>{isVerifying ? "Already verified?" : "Already have an account?"}</span>
          <Link href={`/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`} className="font-semibold text-foreground underline underline-offset-4 hover:text-[var(--accent)]">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
