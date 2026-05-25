"use client";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  CircleDollarSign,
  Download,
  FolderPlus,
  ImagePlus,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
  UserRound,
  Waves,
  WandSparkles,
  Wrench,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { AppRouteState, AtlasKind, GeneratedAtlas, PbrMap, PbrMapKind, Project, ReferenceImage, TextureWorkflow } from "@/lib/types";
import { authClient } from "@/lib/auth/client";
import { createApiRepository } from "@/lib/storage/api-repository";
import { cn, formatDate, safeName } from "@/lib/utils";

type ApiStatus = {
  configured: boolean;
  provider: string;
  model: string;
  missingEnvVar?: string;
  maxImages: number;
  maxImageSize: number;
  acceptedTypes: string[];
};

type Notice = { tone: "success" | "error" | "info"; message: string };

type AccountStatus = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  credits: {
    balance: number;
  };
  billing?: {
    configured: boolean;
    environment: string;
    missingEnvVar?: string;
  };
  creditPacks?: {
    id: string;
    label: string;
    credits: number;
    priceUsd: number;
    description: string;
    configured: boolean;
    priceEnvVar: string;
  }[];
};

type ProjectSummary = {
  workflowCount: number;
  referenceCount: number;
  textureCount: number;
  pbrTextureCount: number;
};

type UtilityTab = "pbr" | "emissive";

type UtilityUpload = {
  file?: File;
  name: string;
  type: string;
  dataUrl: string;
  storagePath: string;
};

type StoredUtilityUpload = {
  name: string;
  type: string;
  storagePath: string;
  url: string;
};

type UtilityMap = {
  kind: PbrMapKind | "emissive";
  title: string;
  width: number;
  height: number;
  url: string;
  storagePath?: string;
  model: string;
  generatedAt: string;
};

const repo = createApiRepository();
const acceptedImageTypes = ["image/png", "image/jpeg", "image/webp"];
const maxUtilityImageSize = 50 * 1024 * 1024;
const utilityPbrOrder: PbrMapKind[] = ["metallic", "roughness", "normal"];
const utilityPbrStorageKey = "texture-atlas-ai.utility-pbr";
const utilityEmissiveStorageKey = "texture-atlas-ai.utility-emissive";

function now() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}_${id}`;
}

function parseRoute(pathname: string, basePath: string): AppRouteState {
  const normalized = pathname === basePath ? "/" : pathname.replace(new RegExp(`^${basePath}`), "") || "/";

  if (normalized === "/account") {
    return { view: "account" };
  }

  if (normalized === "/utilities") {
    return { view: "utilities" };
  }

  const workflowMatch = normalized.match(/^\/projects\/([^/]+)\/workflows\/([^/]+)$/);
  if (workflowMatch) {
    return { view: "workflow", projectId: workflowMatch[1], workflowId: workflowMatch[2] };
  }

  const projectMatch = normalized.match(/^\/projects\/([^/]+)$/);
  if (projectMatch) {
    return { view: "project", projectId: projectMatch[1] };
  }

  return { view: "projects" };
}

function PrimaryButton({
  children,
  className,
  busy,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[#06120b] transition hover:bg-[var(--accent-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-background disabled:opacity-55",
        "disabled:bg-[#2a302f] disabled:text-[var(--muted)] disabled:hover:bg-[#2a302f]",
        className,
      )}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  className,
  busy,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-[#151823] px-4 text-sm font-medium text-foreground transition hover:border-[#4b5264] hover:bg-[#1d2230] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-background disabled:opacity-55",
        className,
      )}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

function IconButton({
  label,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-md border border-[var(--line)] bg-[#151823] text-[var(--muted)] transition hover:border-[#4b5264] hover:text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--accent)]",
        className,
      )}
    />
  );
}

function StatusPill({ children, tone = "info" }: { children: React.ReactNode; tone?: Notice["tone"] }) {
  const colors = {
    success: "border-emerald-400/35 bg-emerald-400/10 text-emerald-200",
    error: "border-red-400/35 bg-red-400/10 text-red-200",
    info: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  };

  return (
    <span className={cn("inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium", colors[tone])}>
      {children}
    </span>
  );
}

function NavButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-[var(--muted)] transition hover:bg-[#1d2230] hover:text-foreground",
        active ? "bg-[#1d2230] text-foreground" : "",
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[#0d1018] p-8 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-md bg-[#182033] text-[var(--accent)]">{icon}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function TextureAtlasApp({ basePath = "" }: { basePath?: string }) {
  const pathname = usePathname();
  const route = useMemo(() => parseRoute(pathname, basePath), [basePath, pathname]);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [projects, setProjects] = useState<Project[]>([]);
  const [workflows, setWorkflows] = useState<TextureWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [navigationNote, setNavigationNote] = useState("");
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const nextProjects = await repo.listProjects();
    setProjects(nextProjects);

    if (route.view === "project" || route.view === "workflow") {
      setWorkflows(await repo.listWorkflows(route.projectId));
    } else {
      setWorkflows([]);
    }

    setLoading(false);
  }, [route]);

  useEffect(() => {
    queueMicrotask(() => {
      load().catch((error) => {
        setNotice({ tone: "error", message: error instanceof Error ? error.message : "Could not load workspace." });
        setLoading(false);
      });
    });
  }, [load]);

  useEffect(() => {
    fetch("/api/generate-texture-atlases")
      .then((response) => response.json())
      .then((data: ApiStatus) => setApiStatus(data))
      .catch(() =>
        setApiStatus({
          configured: false,
          provider: "google",
          model: "gemini-2.5-flash-image",
          missingEnvVar: "GEMINI_API_KEY",
          maxImages: 16,
          maxImageSize: 52428800,
          acceptedTypes: acceptedImageTypes,
        }),
      );
  }, []);

  const refreshAccount = useCallback(async () => {
    const response = await fetch("/api/dashboard/account");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Could not load account.");
    }

    setAccountStatus(data as AccountStatus);
    return data as AccountStatus;
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      refreshAccount().catch((error) => {
        setNotice({ tone: "error", message: error instanceof Error ? error.message : "Could not load account credits." });
      });
    });
  }, [refreshAccount]);

  useEffect(() => {
    const timer = window.setTimeout(() => setNavigationNote(""), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  function navigate(href: string, label: string) {
    setNavigationNote(label);
    startTransition(() => router.push(`${basePath}${href === "/" ? "" : href}` || "/"));
  }

  async function refreshProject(projectId: string) {
    const [nextProjects, nextWorkflows] = await Promise.all([repo.listProjects(), repo.listWorkflows(projectId)]);
    setProjects(nextProjects);
    setWorkflows(nextWorkflows);
  }

  const currentProject =
    route.view === "project" || route.view === "workflow" ? projects.find((project) => project.id === route.projectId) : undefined;
  const currentWorkflow = route.view === "workflow" ? workflows.find((workflow) => workflow.id === route.workflowId) : undefined;
  const isProjectsActive = route.view === "projects" || route.view === "project" || route.view === "workflow";
  const creditBalance = accountStatus?.credits.balance ?? 0;
  const hasCredits = Boolean(accountStatus && creditBalance >= 1);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#172033_0,#090a0f_34rem)]">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-background/88 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={() => navigate("/", "Opening projects")}
            className="flex items-center gap-3 text-left"
            aria-label="Open project dashboard"
          >
            <span className="flex size-9 items-center justify-center rounded-md bg-[var(--accent)] text-[#06120b]">
              <Sparkles className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Cloudsurf Texture AI</span>
              <span className="block text-xs text-[var(--muted)]">Local-first extraction workspace</span>
            </span>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex items-center gap-1 rounded-md border border-[var(--line)] bg-[#111520] p-1" aria-label="Top navigation">
              <NavButton active={isProjectsActive} onClick={() => navigate("/", "Opening projects")}>
                <Sparkles className="size-4" />
                Projects
              </NavButton>
              <NavButton active={route.view === "utilities"} onClick={() => navigate("/utilities", "Opening utilities")}>
                <Wrench className="size-4" />
                Utilities
              </NavButton>
              <NavButton active={route.view === "account"} onClick={() => navigate("/account", "Opening account")}>
                <UserRound className="size-4" />
                Account
              </NavButton>
            </nav>
            <StatusPill tone={hasCredits ? "success" : "info"}>
              <CircleDollarSign className="size-3.5" />
              {accountStatus ? `${creditBalance} credits` : "Credits"}
            </StatusPill>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/auth/sign-out";
              }}
              className="inline-flex h-9 items-center rounded-md border border-[var(--line)] bg-[#151823] px-3 text-sm font-medium text-[var(--muted)] transition hover:border-[#4b5264] hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {(notice || isPending || navigationNote) && (
        <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2">
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg border bg-[#121621] px-4 py-3 text-sm shadow-2xl",
              notice?.tone === "error" ? "border-red-400/35 text-red-100" : "border-[var(--line)] text-foreground",
            )}
          >
            {isPending || navigationNote ? <Loader2 className="size-4 shrink-0 animate-spin text-[var(--accent)]" /> : null}
            <span>{navigationNote || notice?.message}</span>
            {notice ? (
              <button className="ml-auto text-xs text-[var(--muted)] hover:text-foreground" onClick={() => setNotice(null)}>
                Dismiss
              </button>
            ) : null}
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        {loading ? (
          <LoadingSurface />
        ) : route.view === "account" ? (
          <AccountSurface accountStatus={accountStatus} refreshAccount={refreshAccount} setNotice={setNotice} />
        ) : route.view === "utilities" ? (
          <UtilitiesSurface apiStatus={apiStatus} accountStatus={accountStatus} refreshAccount={refreshAccount} setNotice={setNotice} />
        ) : route.view === "projects" ? (
          <ProjectsDashboard projects={projects} navigate={navigate} onChanged={load} setNotice={setNotice} />
        ) : route.view === "project" ? (
          currentProject ? (
            <ProjectSurface
              project={currentProject}
              workflows={workflows}
              navigate={navigate}
              onChanged={() => refreshProject(currentProject.id)}
              setNotice={setNotice}
            />
          ) : (
            <MissingSurface navigate={navigate} />
          )
        ) : currentProject && currentWorkflow ? (
          <WorkflowSurface
            key={currentWorkflow.id}
            project={currentProject}
            workflow={currentWorkflow}
            apiStatus={apiStatus}
            accountStatus={accountStatus}
            refreshAccount={refreshAccount}
            navigate={navigate}
            onChanged={() => refreshProject(currentProject.id)}
            setNotice={setNotice}
          />
        ) : (
          <MissingSurface navigate={navigate} />
        )}
      </div>
    </main>
  );
}

function LoadingSurface() {
  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div className="h-72 animate-pulse rounded-lg border border-[var(--line)] bg-[#111520]" />
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-lg border border-[var(--line)] bg-[#111520]" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-44 animate-pulse rounded-lg border border-[var(--line)] bg-[#111520]" />
          <div className="h-44 animate-pulse rounded-lg border border-[var(--line)] bg-[#111520]" />
        </div>
      </div>
    </div>
  );
}

function AccountSurface({
  accountStatus,
  refreshAccount,
  setNotice,
}: {
  accountStatus: AccountStatus | null;
  refreshAccount: () => Promise<AccountStatus>;
  setNotice: (notice: Notice) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [selectedCreditPackId, setSelectedCreditPackId] = useState<string | null>(null);

  useEffect(() => {
    refreshAccount().catch((error) => {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Could not load account." });
    });
  }, [refreshAccount, setNotice]);

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();

    if (newPassword.length < 8) {
      setNotice({ tone: "error", message: "New password must be at least 8 characters." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setNotice({ tone: "error", message: "New passwords do not match." });
      return;
    }

    setSavingPassword(true);

    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (result.error) {
        throw new Error(result.error.message ?? "Could not change password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice({ tone: "success", message: "Password changed." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Could not change password." });
    } finally {
      setSavingPassword(false);
    }
  }

  const displayName = accountStatus?.user?.name || accountStatus?.user?.email || "Account";
  const balance = accountStatus?.credits.balance;
  const packages = accountStatus?.creditPacks ?? [
    { id: "starter", credits: 25, label: "Starter pack", priceUsd: 39, description: "For a few small texture batches.", configured: false, priceEnvVar: "PADDLE_STARTER_PRICE_ID" },
    { id: "production", credits: 100, label: "Production pack", priceUsd: 129, description: "Best fit for regular scenery work.", configured: false, priceEnvVar: "PADDLE_PRODUCTION_PRICE_ID" },
    { id: "studio", credits: 250, label: "Studio pack", priceUsd: 279, description: "Lowest per-credit price for larger runs.", configured: false, priceEnvVar: "PADDLE_STUDIO_PRICE_ID" },
  ];
  const selectedCreditPack = packages.find((pack) => pack.id === selectedCreditPackId);

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">Account</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">Account settings</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Manage login security and generation credits for this workspace.</p>
        </div>
        <StatusPill tone={balance && balance > 0 ? "success" : "info"}>
          <CircleDollarSign className="size-3.5" />
          {typeof balance === "number" ? `${balance} credits` : "Loading credits"}
        </StatusPill>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-md bg-[#182033] text-[var(--accent)]">
                <UserRound className="size-6" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-semibold">{displayName}</h2>
                <p className="mt-1 truncate text-sm text-[var(--muted)]">{accountStatus?.user?.email ?? "Signed in user"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">Credits</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Each generation action uses 1 credit.</p>
              </div>
              <div className="rounded-md bg-emerald-300/10 px-3 py-2 text-right text-emerald-200">
                <p className="text-2xl font-semibold">{typeof balance === "number" ? balance : "--"}</p>
                <p className="text-xs">available</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {packages.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  disabled={!accountStatus}
                  onClick={() => setSelectedCreditPackId(pack.id)}
                  className="flex min-h-14 items-center justify-between gap-4 rounded-md border border-[var(--line)] bg-[#151823] px-4 py-3 text-left text-sm transition hover:border-[#4b5264] hover:bg-[#1d2230] disabled:opacity-60"
                >
                  <span>
                    <span className="block font-semibold">{pack.label}</span>
                    <span className="text-xs text-[var(--muted)]">
                      {pack.credits} credits · ${pack.priceUsd}
                    </span>
                  </span>
                  <span className="text-xs font-medium text-[var(--accent)]">Buy credits</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">Online payments are pending. Credit purchases are handled manually for now.</p>
          </div>
        </div>

        <form onSubmit={changePassword} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-[#182033] text-[var(--accent)]">
              <KeyRound className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">Change password</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Revoke other sessions after saving the new password.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="block text-sm font-medium">
              Current password
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                className="mt-2 h-11 w-full rounded-md border border-[var(--line)] bg-[#0d1018] px-3 text-sm outline-none transition focus:border-[var(--accent)]"
                required
              />
            </label>
            <label className="block text-sm font-medium">
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                className="mt-2 h-11 w-full rounded-md border border-[var(--line)] bg-[#0d1018] px-3 text-sm outline-none transition focus:border-[var(--accent)]"
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="mt-2 h-11 w-full rounded-md border border-[var(--line)] bg-[#0d1018] px-3 text-sm outline-none transition focus:border-[var(--accent)]"
                required
              />
            </label>
          </div>

          <PrimaryButton type="submit" busy={savingPassword} disabled={savingPassword} className="mt-6 h-11 w-full">
            Save password
          </PrimaryButton>
        </form>
      </div>

      {selectedCreditPack ? <BuyCreditsModal pack={selectedCreditPack} onClose={() => setSelectedCreditPackId(null)} /> : null}
    </section>
  );
}

function BuyCreditsModal({ pack, onClose }: { pack: NonNullable<AccountStatus["creditPacks"]>[number]; onClose: () => void }) {
  const contactEmail = "contact@cloudsurf-texture-ai.0xdd.cloud";
  const subject = encodeURIComponent(`Cloudsurf Texture AI credits: ${pack.label}`);

  return (
    <Modal title="Buy credits" onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-md border border-[var(--line)] bg-[#0d1018] p-4">
          <p className="text-sm font-semibold">{pack.label}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {pack.credits} credits · ${pack.priceUsd}
          </p>
        </div>

        <div className="rounded-md border border-[rgb(244_184_96/0.24)] bg-[rgb(244_184_96/0.09)] p-4 text-sm leading-6 text-[#f8d8a3]">
          Payment checkout is still pending. To buy credits, please contact{" "}
          <a className="font-semibold text-foreground underline underline-offset-4" href={`mailto:${contactEmail}?subject=${subject}`}>
            {contactEmail}
          </a>
          .
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-[var(--line)] bg-[#151823] px-4 text-sm font-semibold text-foreground transition hover:bg-[#1d2230]">
            Close
          </button>
          <a
            href={`mailto:${contactEmail}?subject=${subject}`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[#06120b] transition hover:bg-[var(--accent-strong)]"
          >
            Email sales
          </a>
        </div>
      </div>
    </Modal>
  );
}

function UtilitiesSurface({
  apiStatus,
  accountStatus,
  refreshAccount,
  setNotice,
}: {
  apiStatus: ApiStatus | null;
  accountStatus: AccountStatus | null;
  refreshAccount: () => Promise<AccountStatus>;
  setNotice: (notice: Notice) => void;
}) {
  const [activeTab, setActiveTab] = useState<UtilityTab>("pbr");

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">Utilities</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">Texture utility generators</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Generate PBR and emissive maps from a single atlas image without attaching the result to a project workflow.
          </p>
        </div>
        <StatusPill tone={apiStatus?.configured ? "success" : "info"}>
          {apiStatus?.configured ? <Check className="size-3.5" /> : <AlertCircle className="size-3.5" />}
          {apiStatus?.configured ? `${apiStatus.provider} · ${apiStatus.model}` : "Image AI key needed"}
        </StatusPill>
      </div>

      <div className="grid grid-cols-2 rounded-md border border-[var(--line)] bg-[#151823] p-1 md:w-[420px]">
        <button
          onClick={() => setActiveTab("pbr")}
          className={cn(
            "h-10 rounded px-3 text-sm font-semibold text-[var(--muted)] transition hover:text-foreground",
            activeTab === "pbr" ? "bg-[var(--accent)] text-[#06120b] hover:text-[#06120b]" : "",
          )}
        >
          Generate PBR
        </button>
        <button
          onClick={() => setActiveTab("emissive")}
          className={cn(
            "h-10 rounded px-3 text-sm font-semibold text-[var(--muted)] transition hover:text-foreground",
            activeTab === "emissive" ? "bg-[var(--accent)] text-[#06120b] hover:text-[#06120b]" : "",
          )}
        >
          Generate Emissive
        </button>
      </div>

      <div className={activeTab === "pbr" ? "block" : "hidden"}>
        <GeneratePbrUtility
          apiConfigured={Boolean(apiStatus?.configured)}
          accountStatus={accountStatus}
          refreshAccount={refreshAccount}
          setNotice={setNotice}
        />
      </div>
      <div className={activeTab === "emissive" ? "block" : "hidden"}>
        <GenerateEmissiveUtility
          apiConfigured={Boolean(apiStatus?.configured)}
          accountStatus={accountStatus}
          refreshAccount={refreshAccount}
          setNotice={setNotice}
        />
      </div>
    </section>
  );
}

function GeneratePbrUtility({
  apiConfigured,
  accountStatus,
  refreshAccount,
  setNotice,
}: {
  apiConfigured: boolean;
  accountStatus: AccountStatus | null;
  refreshAccount: () => Promise<AccountStatus>;
  setNotice: (notice: Notice) => void;
}) {
  const [upload, setUpload] = useState<UtilityUpload | null>(null);
  const [dragging, setDragging] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [maps, setMaps] = useState<UtilityMap[]>([]);
  const [activeMap, setActiveMap] = useState<PbrMapKind>("metallic");
  const [storageReady, setStorageReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedMap = maps.find((map) => map.kind === activeMap) ?? maps[0];
  const creditsReady = Boolean(accountStatus);
  const hasCredits = Boolean(accountStatus && accountStatus.credits.balance >= 1);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const stored = window.localStorage.getItem(utilityPbrStorageKey);
        if (!stored) return;

        const parsed = JSON.parse(stored) as {
          upload?: StoredUtilityUpload | null;
          maps?: UtilityMap[];
          activeMap?: PbrMapKind;
        };
        const restoredUpload = parsed.upload ? await restoreUtilityUpload(parsed.upload) : null;

        if (!cancelled) {
          setUpload(restoredUpload);
          setMaps(Array.isArray(parsed.maps) ? await refreshUtilityMaps(parsed.maps) : []);
          if (parsed.activeMap && utilityPbrOrder.includes(parsed.activeMap)) {
            setActiveMap(parsed.activeMap);
          }
        }
      } catch {
        window.localStorage.removeItem(utilityPbrStorageKey);
      } finally {
        if (!cancelled) setStorageReady(true);
      }
    }

    void restore();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storageReady) return;

    if (!upload && maps.length === 0) {
      window.localStorage.removeItem(utilityPbrStorageKey);
      return;
    }

    window.localStorage.setItem(
      utilityPbrStorageKey,
      JSON.stringify({
        upload: upload ? serializeUtilityUpload(upload) : null,
        maps,
        activeMap,
      }),
    );
  }, [activeMap, maps, storageReady, upload]);

  function clear() {
    setUpload(null);
    setMaps([]);
    setActiveMap("metallic");
  }

  async function chooseFile(file: File) {
    const nextUpload = await readUtilityUpload(file, "pbr", setNotice);
    if (!nextUpload) return;
    setUpload(nextUpload);
    setMaps([]);
    setActiveMap("metallic");
  }

  async function generate() {
    if (!upload) {
      setNotice({ tone: "error", message: "Upload one image before generating PBR maps." });
      return;
    }

    setGenerating(true);
    setNotice({ tone: "info", message: "Generating PBR maps..." });

    try {
      const formData = new FormData();
      formData.set("imagePath", upload.storagePath);
      const response = await fetch("/api/utilities/generate-pbr", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "PBR generation failed.");
      }

      const nextMaps = data.pbrMaps as UtilityMap[];
      setMaps(nextMaps);
      setActiveMap((nextMaps.find((map) => map.kind === "metallic")?.kind as PbrMapKind | undefined) ?? "metallic");
      await refreshAccount();
      setNotice({ tone: "success", message: "PBR maps generated and saved locally." });
    } catch (error) {
      await refreshAccount();
      const message = error instanceof Error ? error.message : "PBR generation failed.";
      setNotice({ tone: "error", message });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <UtilityUploadColumn
        title="Upload atlas image"
        upload={upload}
        dragging={dragging}
        inputRef={inputRef}
        onDragging={setDragging}
        onFile={chooseFile}
        onClear={clear}
      />
      <div className="min-h-[460px] rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
        {maps.length === 3 ? (
          <div className="flex h-full min-h-[420px] flex-col">
            <div className="flex items-center gap-3">
              <div className="grid flex-1 grid-cols-3 rounded-md border border-[var(--line)] bg-[#151823] p-1">
                {utilityPbrOrder.map((kind) => {
                  const map = maps.find((item) => item.kind === kind);
                  return (
                    <button
                      key={kind}
                      onClick={() => setActiveMap(kind)}
                      disabled={!map}
                      className={cn(
                        "h-10 rounded px-2 text-xs font-semibold capitalize text-[var(--muted)] transition hover:text-foreground disabled:opacity-50",
                        selectedMap?.kind === kind ? "bg-[var(--accent)] text-[#06120b] hover:text-[#06120b]" : "",
                      )}
                    >
                      {kind}
                    </button>
                  );
                })}
              </div>
              <SecondaryButton onClick={clear}>Clear</SecondaryButton>
            </div>
            {selectedMap ? <UtilityMapPreview map={selectedMap} downloadPrefix="utility-pbr" /> : null}
          </div>
        ) : (
          <UtilityGeneratePanel
            title={generating ? "Generating PBR maps" : "PBR maps"}
            body={generating ? "Creating metallic, roughness, and normal maps from the uploaded atlas." : "Upload one atlas image, then generate matching PBR maps."}
            buttonLabel="Click to generate PBR"
            disabled={generating || !upload || !apiConfigured || !creditsReady || !hasCredits}
            busy={generating}
            onGenerate={generate}
            missingKey={!apiConfigured}
            checkingCredits={!accountStatus}
            missingCredits={creditsReady && !hasCredits}
          />
        )}
      </div>
    </div>
  );
}

function GenerateEmissiveUtility({
  apiConfigured,
  accountStatus,
  refreshAccount,
  setNotice,
}: {
  apiConfigured: boolean;
  accountStatus: AccountStatus | null;
  refreshAccount: () => Promise<AccountStatus>;
  setNotice: (notice: Notice) => void;
}) {
  const [upload, setUpload] = useState<UtilityUpload | null>(null);
  const [dragging, setDragging] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [emissiveMap, setEmissiveMap] = useState<UtilityMap | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const creditsReady = Boolean(accountStatus);
  const hasCredits = Boolean(accountStatus && accountStatus.credits.balance >= 1);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const stored = window.localStorage.getItem(utilityEmissiveStorageKey);
        if (!stored) return;

        const parsed = JSON.parse(stored) as {
          upload?: StoredUtilityUpload | null;
          emissiveMap?: UtilityMap | null;
        };
        const restoredUpload = parsed.upload ? await restoreUtilityUpload(parsed.upload) : null;

        if (!cancelled) {
          setUpload(restoredUpload);
          setEmissiveMap(parsed.emissiveMap ? (await refreshUtilityMaps([parsed.emissiveMap]))[0] : null);
        }
      } catch {
        window.localStorage.removeItem(utilityEmissiveStorageKey);
      } finally {
        if (!cancelled) setStorageReady(true);
      }
    }

    void restore();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storageReady) return;

    if (!upload && !emissiveMap) {
      window.localStorage.removeItem(utilityEmissiveStorageKey);
      return;
    }

    window.localStorage.setItem(
      utilityEmissiveStorageKey,
      JSON.stringify({
        upload: upload ? serializeUtilityUpload(upload) : null,
        emissiveMap,
      }),
    );
  }, [emissiveMap, storageReady, upload]);

  function clear() {
    setUpload(null);
    setEmissiveMap(null);
  }

  async function chooseFile(file: File) {
    const nextUpload = await readUtilityUpload(file, "emissive", setNotice);
    if (!nextUpload) return;
    setUpload(nextUpload);
    setEmissiveMap(null);
  }

  async function generate() {
    if (!upload) {
      setNotice({ tone: "error", message: "Upload one image before generating an emissive map." });
      return;
    }

    setGenerating(true);
    setNotice({ tone: "info", message: "Generating emissive map..." });

    try {
      const formData = new FormData();
      formData.set("imagePath", upload.storagePath);
      const response = await fetch("/api/utilities/generate-emissive", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Emissive generation failed.");
      }

      setEmissiveMap(data.emissiveMap as UtilityMap);
      await refreshAccount();
      setNotice({ tone: "success", message: "Emissive map generated and saved locally." });
    } catch (error) {
      await refreshAccount();
      const message = error instanceof Error ? error.message : "Emissive generation failed.";
      setNotice({ tone: "error", message });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <UtilityUploadColumn
        title="Upload atlas image"
        upload={upload}
        dragging={dragging}
        inputRef={inputRef}
        onDragging={setDragging}
        onFile={chooseFile}
        onClear={clear}
      />
      <div className="min-h-[460px] rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
        {emissiveMap ? (
          <div className="flex h-full min-h-[420px] flex-col">
            <div className="flex justify-end">
              <SecondaryButton onClick={clear}>Clear</SecondaryButton>
            </div>
            <UtilityMapPreview map={emissiveMap} downloadPrefix="utility-emissive" />
          </div>
        ) : (
          <UtilityGeneratePanel
            title={generating ? "Generating emissive map" : "Emissive map"}
            body={generating ? "Identifying windows and night-lit regions while keeping the rest of the atlas black." : "Upload one atlas image, then generate a corresponding emissive texture."}
            buttonLabel="Generate Emissive"
            disabled={generating || !upload || !apiConfigured || !creditsReady || !hasCredits}
            busy={generating}
            onGenerate={generate}
            missingKey={!apiConfigured}
            checkingCredits={!accountStatus}
            missingCredits={creditsReady && !hasCredits}
          />
        )}
      </div>
    </div>
  );
}

async function readUtilityUpload(file: File, kind: UtilityTab, setNotice: (notice: Notice) => void) {
  if (!acceptedImageTypes.includes(file.type)) {
    setNotice({ tone: "error", message: `${file.name} is not a supported image type.` });
    return null;
  }

  if (file.size > maxUtilityImageSize) {
    setNotice({ tone: "error", message: `${file.name} exceeds the 50 MB image limit.` });
    return null;
  }

  const imageId = createId("utility_image");
  const uploaded = await repo.uploadUtilityImage(kind, imageId, file);

  return {
    file,
    name: file.name,
    type: file.type,
    dataUrl: uploaded.url,
    storagePath: uploaded.storagePath,
  };
}

function serializeUtilityUpload(upload: UtilityUpload): StoredUtilityUpload {
  return {
    name: upload.name,
    type: upload.type,
    storagePath: upload.storagePath,
    url: upload.dataUrl,
  };
}

async function restoreUtilityUpload(upload: StoredUtilityUpload): Promise<UtilityUpload> {
  return {
    name: upload.name,
    type: upload.type,
    storagePath: upload.storagePath,
    dataUrl: await repo.getImageUrl(upload.storagePath, upload.url),
  };
}

async function refreshUtilityMaps(maps: UtilityMap[]) {
  return Promise.all(
    maps.map(async (map) => ({
      ...map,
      url: map.storagePath ? await repo.getImageUrl(map.storagePath, map.url) : map.url,
    })),
  );
}

function UtilityUploadColumn({
  title,
  upload,
  dragging,
  inputRef,
  onDragging,
  onFile,
  onClear,
}: {
  title: string;
  upload: UtilityUpload | null;
  dragging: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDragging: (dragging: boolean) => void;
  onFile: (file: File) => Promise<void>;
  onClear: () => void;
}) {
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        onDragging(true);
      }}
      onDragLeave={() => onDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        onDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) void onFile(file);
      }}
      className={cn(
        "min-h-[460px] rounded-lg border border-dashed bg-[#0d1018] p-5 transition",
        dragging ? "border-[var(--accent)] bg-emerald-400/10" : "border-[var(--line)]",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onFile(file);
          event.currentTarget.value = "";
        }}
      />
      {upload ? (
        <div className="flex h-full min-h-[420px] flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-1 truncate text-sm text-[var(--muted)]">{upload.name}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <SecondaryButton onClick={() => inputRef.current?.click()}>
                <ImagePlus className="size-4" />
                Replace
              </SecondaryButton>
              <SecondaryButton onClick={onClear}>Clear</SecondaryButton>
            </div>
          </div>
          <div className="mt-4 flex flex-1 items-center justify-center overflow-hidden rounded-md border border-[var(--line)] bg-[#090a0f]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={upload.dataUrl} alt={upload.name} className="max-h-[360px] w-full object-contain" />
          </div>
        </div>
      ) : (
        <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
          <div className="flex size-16 items-center justify-center rounded-lg bg-[#182033] text-[var(--accent)]">
            <UploadCloud className="size-8" />
          </div>
          <h2 className="mt-5 text-xl font-semibold">{title}</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">Drop one PNG, JPG, or WebP atlas image here, or browse from disk.</p>
          <PrimaryButton className="mt-5" onClick={() => inputRef.current?.click()}>
            <ImagePlus className="size-4" />
            Browse image
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}

function UtilityGeneratePanel({
  title,
  body,
  buttonLabel,
  disabled,
  busy,
  missingKey,
  checkingCredits,
  missingCredits,
  onGenerate,
}: {
  title: string;
  body: string;
  buttonLabel: string;
  disabled: boolean;
  busy: boolean;
  missingKey: boolean;
  checkingCredits: boolean;
  missingCredits: boolean;
  onGenerate: () => Promise<void>;
}) {
  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-md border border-dashed border-[var(--line)] bg-[#0d1018] p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-md bg-[#182033] text-[var(--accent)]">
        {busy ? <Loader2 className="size-7 animate-spin" /> : <WandSparkles className="size-7" />}
      </div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">{body}</p>
      <PrimaryButton onClick={() => void onGenerate()} disabled={disabled} busy={busy} className="mt-5 w-full max-w-xs">
        <WandSparkles className="size-4" />
        {buttonLabel}
      </PrimaryButton>
      {missingKey ? <p className="mt-3 text-xs text-[var(--muted)]">Image AI provider is not configured</p> : null}
      {!missingKey && checkingCredits ? <p className="mt-3 text-xs text-[var(--muted)]">Checking credits...</p> : null}
      {!missingKey && !checkingCredits && missingCredits ? (
        <p className="mt-3 text-xs text-[var(--muted)]">Add credits from Account to generate</p>
      ) : null}
    </div>
  );
}

function UtilityMapPreview({ map, downloadPrefix }: { map: UtilityMap; downloadPrefix: string }) {
  return (
    <article className="mt-4 flex flex-1 flex-col overflow-hidden rounded-md border border-[var(--line)] bg-[#0d1018]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2">
        <div>
          <h3 className="text-sm font-semibold">{map.title}</h3>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            {map.width} x {map.height} PNG · {map.model}
          </p>
        </div>
        <a
          href={map.url}
          download={`${downloadPrefix}-${map.kind}-${map.width}x${map.height}.png`}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-[#151823] text-[var(--muted)] transition hover:text-foreground"
          aria-label={`Download ${map.title}`}
          title={`Download ${map.title}`}
        >
          <Download className="size-3.5" />
        </a>
      </div>
      <div className="flex flex-1 items-center justify-center bg-[#0b0d14]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={map.url} alt={map.title} className="max-h-[360px] w-full object-contain" />
      </div>
    </article>
  );
}

function ProjectsDashboard({
  projects,
  navigate,
  onChanged,
  setNotice,
}: {
  projects: Project[];
  navigate: (href: string, label: string) => void;
  onChanged: () => Promise<void>;
  setNotice: (notice: Notice) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [summaries, setSummaries] = useState<Record<string, ProjectSummary>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadSummaries() {
      const entries = await Promise.all(
        projects.map(async (project) => {
          const workflows = await repo.listWorkflows(project.id);
          return [
            project.id,
            {
              workflowCount: workflows.length,
              referenceCount: workflows.reduce((total, workflow) => total + workflow.images.length, 0),
              textureCount: workflows.reduce((total, workflow) => total + workflow.atlases.length, 0),
              pbrTextureCount: workflows.reduce(
                (total, workflow) =>
                  total + workflow.atlases.reduce((atlasTotal, atlas) => atlasTotal + (atlas.pbrMaps?.length ?? 0), 0),
                0,
              ),
            },
          ] as const;
        }),
      );

      if (!cancelled) {
        setSummaries(Object.fromEntries(entries));
      }
    }

    void loadSummaries();

    return () => {
      cancelled = true;
    };
  }, [projects]);

  async function createProject(event: React.FormEvent) {
    event.preventDefault();
    const projectName = safeName(name);
    if (!projectName) {
      setNotice({ tone: "error", message: "Project name is required." });
      return;
    }

    setSaving(true);
    const timestamp = now();
    const project: Project = {
      id: createId("project"),
      name: projectName,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await repo.saveProject(project);
    await onChanged();
    setSaving(false);
    setOpen(false);
    setName("");
    setNotice({ tone: "success", message: "Project created. Opening it now." });
    navigate(`/projects/${project.id}`, "Opening project");
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">Projects</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">Texture workspaces</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Create a project, attach texture workflows, and keep generated atlases available locally across refreshes.
          </p>
        </div>
        <PrimaryButton onClick={() => setOpen(true)}>
          <FolderPlus className="size-4" />
          New project
        </PrimaryButton>
      </div>

      {projects.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} summary={summaries[project.id]} navigate={navigate} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FolderPlus className="size-6" />}
          title="No projects yet"
          body="Start with a project. Workflows, reference images, exclusions, and atlases are stored locally in this browser."
          action={
            <PrimaryButton onClick={() => setOpen(true)}>
              <FolderPlus className="size-4" />
              Create first project
            </PrimaryButton>
          }
        />
      )}

      {open ? (
        <Modal title="Create project" onClose={() => setOpen(false)}>
          <form onSubmit={createProject} className="space-y-4">
            <label className="block text-sm font-medium">
              Project name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
                placeholder="e.g. Tanjong Pagar shopfront"
                className="mt-2 h-11 w-full rounded-md border border-[var(--line)] bg-[#0d1018] px-3 text-sm outline-none transition focus:border-[var(--accent)]"
              />
            </label>
            <div className="flex justify-end gap-2">
              <SecondaryButton type="button" onClick={() => setOpen(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" busy={saving} disabled={saving}>
                Create
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}

function ProjectCard({
  project,
  summary,
  navigate,
}: {
  project: Project;
  summary?: ProjectSummary;
  navigate: (href: string, label: string) => void;
}) {
  const stats = summary ?? { workflowCount: 0, referenceCount: 0, textureCount: 0, pbrTextureCount: 0 };

  return (
    <button
      onClick={() => navigate(`/projects/${project.id}`, "Opening project")}
      className="group min-h-40 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 text-left transition hover:border-[#4d576c] hover:bg-[var(--panel-strong)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{project.name}</h2>
          <p className="mt-2 text-xs text-[var(--muted)]">Updated {formatDate(project.updatedAt)}</p>
        </div>
        <ChevronRight className="size-5 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-foreground" />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ProjectStat label="Workflows" value={stats.workflowCount} />
        <ProjectStat label="References" value={stats.referenceCount} />
        <ProjectStat label="Textures" value={stats.textureCount} />
        <ProjectStat label="PBR maps" value={stats.pbrTextureCount} />
      </div>
    </button>
  );
}

function ProjectStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-md border border-[var(--line)] bg-[#0d1018] px-3 py-2">
      <span className="block text-base font-semibold">{value}</span>
      <span className="mt-0.5 block text-[11px] text-[var(--muted)]">{label}</span>
    </span>
  );
}

function ProjectSurface({
  project,
  workflows,
  navigate,
  onChanged,
  setNotice,
}: {
  project: Project;
  workflows: TextureWorkflow[];
  navigate: (href: string, label: string) => void;
  onChanged: () => Promise<void>;
  setNotice: (notice: Notice) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [renamingWorkflow, setRenamingWorkflow] = useState<TextureWorkflow | null>(null);
  const [deletingWorkflow, setDeletingWorkflow] = useState<TextureWorkflow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function createWorkflow(event: React.FormEvent) {
    event.preventDefault();
    const workflowName = safeName(name || `Workflow ${workflows.length + 1}`);
    setSaving(true);
    const timestamp = now();
    const workflow: TextureWorkflow = {
      id: createId("workflow"),
      projectId: project.id,
      name: workflowName,
      exclusions: "",
      images: [],
      atlases: [],
      status: "draft",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await repo.saveWorkflow(workflow);
    await repo.saveProject({ ...project, updatedAt: timestamp });
    await onChanged();
    setSaving(false);
    setName("");
    setNotice({ tone: "success", message: "Texture workflow created. Opening it now." });
    navigate(`/projects/${project.id}/workflows/${workflow.id}`, "Opening workflow");
  }

  async function renameWorkflow(workflow: TextureWorkflow, name: string) {
    const workflowName = safeName(name);
    if (!workflowName) {
      setNotice({ tone: "error", message: "Workflow name is required." });
      return;
    }

    const timestamp = now();
    await repo.saveWorkflow({ ...workflow, name: workflowName, updatedAt: timestamp });
    await repo.saveProject({ ...project, updatedAt: timestamp });
    await onChanged();
    setRenamingWorkflow(null);
    setNotice({ tone: "success", message: "Workflow name updated." });
  }

  async function deleteSelectedWorkflow(workflow: TextureWorkflow) {
    setDeleting(true);

    try {
      await repo.deleteWorkflow(workflow.id);
      await onChanged();
      setDeletingWorkflow(null);
      setNotice({ tone: "success", message: "Workflow deleted with its stored files." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Could not delete workflow." });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
        <SecondaryButton onClick={() => navigate("/", "Opening projects")} className="mb-6 w-full justify-start">
          <ArrowLeft className="size-4" />
          Projects
        </SecondaryButton>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Current project</p>
        <h1 className="mt-3 text-2xl font-semibold">{project.name}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Updated {formatDate(project.updatedAt)}</p>
      </aside>

      <div className="space-y-5">
        <form onSubmit={createWorkflow} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="New texture workflow name"
              className="h-11 flex-1 rounded-md border border-[var(--line)] bg-[#0d1018] px-3 text-sm outline-none transition focus:border-[var(--accent)]"
            />
            <PrimaryButton type="submit" busy={saving} disabled={saving}>
              <Plus className="size-4" />
              Create workflow
            </PrimaryButton>
          </div>
        </form>

        {workflows.length ? (
          <div className="grid gap-3">
            {workflows.map((workflow) => (
              <article
                key={workflow.id}
                className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 transition hover:border-[#4d576c] hover:bg-[var(--panel-strong)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <button
                    onClick={() => navigate(`/projects/${project.id}/workflows/${workflow.id}`, "Opening workflow")}
                    className="group min-w-0 flex-1 text-left"
                  >
                    <h2 className="font-semibold">{workflow.name}</h2>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {workflow.images.length} references · {workflow.atlases.length} atlases · {formatDate(workflow.updatedAt)}
                    </p>
                  </button>
                  <div className="flex items-center gap-2">
                    <StatusPill tone={workflow.status === "error" ? "error" : workflow.status === "complete" ? "success" : "info"}>
                      {workflow.status}
                    </StatusPill>
                    <IconButton
                      label={`Rename ${workflow.name}`}
                      onClick={() => setRenamingWorkflow(workflow)}
                    >
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton
                      label={`Delete ${workflow.name}`}
                      onClick={() => setDeletingWorkflow(workflow)}
                      className="hover:border-red-400/45 hover:text-red-200"
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<WandSparkles className="size-6" />}
            title="No texture workflows"
            body="Create a workflow for each facade or building reference set you want to process into atlases."
          />
        )}
      </div>
      {renamingWorkflow ? (
        <RenameWorkflowModal
          workflow={renamingWorkflow}
          onClose={() => setRenamingWorkflow(null)}
          onSave={(nextName) => renameWorkflow(renamingWorkflow, nextName)}
        />
      ) : null}
      {deletingWorkflow ? (
        <DeleteWorkflowModal
          workflow={deletingWorkflow}
          deleting={deleting}
          onClose={() => setDeletingWorkflow(null)}
          onConfirm={() => deleteSelectedWorkflow(deletingWorkflow)}
        />
      ) : null}
    </section>
  );
}

function WorkflowSurface({
  project,
  workflow,
  apiStatus,
  accountStatus,
  refreshAccount,
  navigate,
  onChanged,
  setNotice,
}: {
  project: Project;
  workflow: TextureWorkflow;
  apiStatus: ApiStatus | null;
  accountStatus: AccountStatus | null;
  refreshAccount: () => Promise<AccountStatus>;
  navigate: (href: string, label: string) => void;
  onChanged: () => Promise<void>;
  setNotice: (notice: Notice) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exclusions, setExclusions] = useState(workflow.exclusions);
  const [generating, setGenerating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pbrLoading, setPbrLoading] = useState<AtlasKind | null>(null);
  const [step, setStep] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const activeGeneration = generating || workflow.status === "generating";
  const creditsReady = Boolean(accountStatus);
  const hasCredits = Boolean(accountStatus && accountStatus.credits.balance >= 1);

  useEffect(() => {
    queueMicrotask(() => setExclusions(workflow.exclusions));
  }, [workflow.exclusions, workflow.id]);

  useEffect(() => {
    if (workflow.status !== "generating") {
      queueMicrotask(() => {
        setGenerating(false);
        setStep("");
      });
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    queueMicrotask(() => {
      if (cancelled) return;
      setGenerating(true);
      setStep(workflow.statusMessage ?? "Processing reference images");
    });

    async function pollGeneration() {
      try {
        const latest = await repo.getWorkflow(workflow.id);
        if (cancelled) return;

        if (!latest) {
          setGenerating(false);
          setStep("");
          await onChanged();
          await refreshAccount();
          return;
        }

        if (latest.status !== "generating") {
          setGenerating(false);
          setStep("");
          await onChanged();
          await refreshAccount();
          setNotice({
            tone: latest.status === "complete" ? "success" : "error",
            message: latest.statusMessage ?? (latest.status === "complete" ? "Texture atlases generated and saved." : "Generation stopped."),
          });
          return;
        }

        setStep(latest.statusMessage ?? "Processing reference images");
        timer = window.setTimeout(pollGeneration, 2500);
      } catch {
        if (!cancelled) timer = window.setTimeout(pollGeneration, 5000);
      }
    }

    timer = window.setTimeout(pollGeneration, 1000);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [onChanged, refreshAccount, setNotice, workflow.id, workflow.status, workflow.statusMessage]);

  async function persistWorkflow(nextWorkflow: TextureWorkflow) {
    await repo.saveWorkflow(nextWorkflow);
    await repo.saveProject({ ...project, updatedAt: nextWorkflow.updatedAt });
    await onChanged();
  }

  async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;

    setUploading(true);
    setNotice({ tone: "info", message: `Uploading ${files.length} image${files.length === 1 ? "" : "s"} to R2...` });

    const errors: string[] = [];
    const valid = files.filter((file) => {
      if (!acceptedImageTypes.includes(file.type)) {
        errors.push(`${file.name} is not PNG, JPG, or WebP.`);
        return false;
      }
      if (file.size > 50 * 1024 * 1024) {
        errors.push(`${file.name} is larger than 50 MB.`);
        return false;
      }
      return true;
    });

    const remaining = 16 - workflow.images.length;
    const accepted = valid.slice(0, Math.max(remaining, 0));
    if (valid.length > accepted.length) {
      errors.push("Only 16 reference images can be attached to a workflow.");
    }

    const timestamp = now();
    const images: ReferenceImage[] = await Promise.all(
      accepted.map(async (file) => {
        const imageId = createId("image");
        const uploaded = await repo.uploadReferenceImage(workflow.id, imageId, file);

        return {
          id: imageId,
          workflowId: workflow.id,
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: uploaded.url,
          storagePath: uploaded.storagePath,
          createdAt: timestamp,
        };
      }),
    );

    await persistWorkflow({
      ...workflow,
      images: [...workflow.images, ...images],
      status: workflow.status === "draft" && images.length ? "ready" : workflow.status,
      statusMessage: errors[0],
      updatedAt: timestamp,
    });

    setUploading(false);
    setNotice({
      tone: errors.length ? "error" : "success",
      message: errors.length ? errors.join(" ") : `${images.length} image${images.length === 1 ? "" : "s"} uploaded to R2.`,
    });
  }

  async function removeImage(imageId: string) {
    setNotice({ tone: "info", message: "Removing reference image..." });
    const nextImages = workflow.images.filter((image) => image.id !== imageId);
    await persistWorkflow({
      ...workflow,
      images: nextImages,
      status: nextImages.length ? workflow.status : "draft",
      updatedAt: now(),
    });
    setNotice({ tone: "success", message: "Reference image removed." });
  }

  async function saveExclusions(value: string) {
    setExclusions(value);
    await repo.saveWorkflow({ ...workflow, exclusions: value, updatedAt: now() });
  }

  async function renameWorkflow(name: string) {
    const workflowName = safeName(name);
    if (!workflowName) {
      setNotice({ tone: "error", message: "Workflow name is required." });
      return;
    }

    const timestamp = now();
    await persistWorkflow({ ...workflow, name: workflowName, updatedAt: timestamp });
    setRenaming(false);
    setNotice({ tone: "success", message: "Workflow name updated." });
  }

  async function deleteCurrentWorkflow() {
    setDeleting(true);

    try {
      await repo.deleteWorkflow(workflow.id);
      await onChanged();
      setNotice({ tone: "success", message: "Workflow deleted with its stored files." });
      navigate(`/projects/${project.id}`, "Opening project");
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Could not delete workflow." });
      setDeleting(false);
    }
  }

  async function generateAtlases() {
    if (!apiStatus?.configured) {
      setNotice({ tone: "error", message: `Set ${apiStatus?.missingEnvVar ?? "the image AI provider key"} to enable generation.` });
      return;
    }

    if (!workflow.images.length) {
      setNotice({ tone: "error", message: "Upload at least one reference image before generating." });
      return;
    }

    if (!hasCredits) {
      setNotice({ tone: "error", message: creditsReady ? "Add credits from Account to generate." : "Checking credits. Try again in a moment." });
      return;
    }

    setGenerating(true);
    setStep("Processing reference images");

    try {
      const response = await fetch(`/api/dashboard/workflows/${encodeURIComponent(workflow.id)}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exclusions }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Generation failed.");
      }

      setStep(data.workflow?.statusMessage ?? "Processing reference images");
      await onChanged();
      await refreshAccount();
      setNotice({ tone: "info", message: "Texture atlas generation started. You can refresh this page while it runs." });
    } catch (error) {
      await refreshAccount();
      const message = error instanceof Error ? error.message : "Generation failed.";
      setGenerating(false);
      setStep("");
      setNotice({ tone: "error", message });
    }
  }

  async function generatePbr(atlas: GeneratedAtlas) {
    if (!apiStatus?.configured) {
      setNotice({ tone: "error", message: `Set ${apiStatus?.missingEnvVar ?? "the image AI provider key"} to enable PBR generation.` });
      return;
    }

    if (!hasCredits) {
      setNotice({ tone: "error", message: creditsReady ? "Add credits from Account to generate PBR maps." : "Checking credits. Try again in a moment." });
      return;
    }

    const texturePath = atlas.storagePath;
    if (!texturePath) {
      setNotice({ tone: "error", message: "This atlas must be regenerated so it has an R2 object key before PBR maps can be created." });
      return;
    }

    setPbrLoading(atlas.kind);
    setNotice({ tone: "info", message: `Generating PBR maps for ${atlas.title}...` });

    try {
      const response = await fetch("/api/generate-pbr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: workflow.id,
          atlasKind: atlas.kind,
          texturePath,
          width: atlas.width,
          height: atlas.height,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "PBR generation failed.");
      }

      const pbrMaps = data.pbrMaps as PbrMap[];
      const timestamp = now();
      await persistWorkflow({
        ...workflow,
        atlases: workflow.atlases.map((item) => (item.kind === atlas.kind ? { ...item, pbrMaps } : item)),
        updatedAt: timestamp,
      });
      await refreshAccount();
      setNotice({ tone: "success", message: "PBR maps generated and saved locally." });
    } catch (error) {
      await refreshAccount();
      const message = error instanceof Error ? error.message : "PBR generation failed.";
      setNotice({ tone: "error", message });
    } finally {
      setPbrLoading(null);
    }
  }

  const generationDisabled = activeGeneration || uploading || !workflow.images.length || !apiStatus?.configured || !creditsReady || !hasCredits;
  const generationReason = !apiStatus?.configured
    ? "Image AI provider is not configured"
    : !workflow.images.length
      ? "Upload reference images first"
      : uploading
        ? "Images are still uploading"
        : activeGeneration
          ? step || workflow.statusMessage || "Processing reference images"
          : !creditsReady
            ? "Checking credits..."
            : !hasCredits
              ? "Add credits from Account to generate"
              : "Generate texture seams and atlas";

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <SecondaryButton onClick={() => navigate(`/projects/${project.id}`, "Opening project")} className="mb-4">
            <ArrowLeft className="size-4" />
            {project.name}
          </SecondaryButton>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-normal">{workflow.name}</h1>
            <IconButton label="Rename workflow" onClick={() => setRenaming(true)}>
              <Pencil className="size-4" />
            </IconButton>
            <IconButton label="Delete workflow" onClick={() => setConfirmingDelete(true)} className="hover:border-red-400/45 hover:text-red-200">
              <Trash2 className="size-4" />
            </IconButton>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">Upload references, declare exclusions, and generate two production atlas outputs.</p>
        </div>
        <StatusPill tone={workflow.status === "error" ? "error" : workflow.status === "complete" ? "success" : "info"}>
          {activeGeneration ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {activeGeneration ? step || workflow.statusMessage || "Processing reference images" : workflow.statusMessage || workflow.status}
        </StatusPill>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void addFiles(event.dataTransfer.files);
            }}
            className={cn(
              "flex min-h-[330px] flex-col items-center justify-center rounded-lg border border-dashed bg-[#0d1018] p-6 text-center transition",
              dragging ? "border-[var(--accent)] bg-emerald-400/10" : "border-[var(--line)]",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                if (event.target.files) void addFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />
            <div className="flex size-16 items-center justify-center rounded-lg bg-[#182033] text-[var(--accent)]">
              {uploading ? <Loader2 className="size-8 animate-spin" /> : <UploadCloud className="size-8" />}
            </div>
            <h2 className="mt-5 text-xl font-semibold">Upload image references</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">
              Drop building or Street View references here, or browse for PNG, JPG, and WebP files. Up to 16 images are accepted.
            </p>
            <PrimaryButton className="mt-5" onClick={() => inputRef.current?.click()} busy={uploading} disabled={uploading}>
              <ImagePlus className="size-4" />
              Browse images
            </PrimaryButton>
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
            <label className="text-sm font-semibold" htmlFor="exclusions">
              Explicit exclusions
            </label>
            <textarea
              id="exclusions"
              value={exclusions}
              onChange={(event) => void saveExclusions(event.target.value)}
              placeholder="see-through fence, lamps, lights, cables"
              rows={4}
              className="mt-3 w-full resize-none rounded-md border border-[var(--line)] bg-[#0d1018] p-3 text-sm leading-6 outline-none transition focus:border-[var(--accent)]"
            />
            <p className="mt-2 text-xs text-[var(--muted)]">Comma-separated items are added under EXPLICIT EXCLUSIONS in the generation prompt.</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Reference set</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{workflow.images.length}/16 images attached</p>
              </div>
              <SecondaryButton onClick={() => inputRef.current?.click()} disabled={uploading}>
                <Plus className="size-4" />
                Add
              </SecondaryButton>
            </div>
            {workflow.images.length ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {workflow.images.map((image) => (
                  <div key={image.id} className="group relative aspect-square overflow-hidden rounded-md border border-[var(--line)] bg-[#0d1018]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.dataUrl} alt={image.name} className="h-full w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                      <p className="truncate text-xs font-medium">{image.name}</p>
                    </div>
                    <IconButton
                      label="Remove image"
                      onClick={() => void removeImage(image.id)}
                      className="absolute right-2 top-2 bg-black/70 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">No references uploaded yet.</div>
            )}
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
            <PrimaryButton onClick={generateAtlases} disabled={generationDisabled} busy={activeGeneration} className="h-12 w-full text-base">
              <WandSparkles className="size-5" />
              Generate texture seams and atlas
            </PrimaryButton>
            <p className="mt-3 text-center text-xs text-[var(--muted)]">{generationReason}</p>
            {activeGeneration ? (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#242a38]">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-[var(--accent)]" />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <AtlasResults
        atlases={workflow.atlases}
        apiConfigured={Boolean(apiStatus?.configured)}
        creditsReady={creditsReady}
        hasCredits={hasCredits}
        loadingKind={pbrLoading}
        onGeneratePbr={generatePbr}
      />
      {renaming ? (
        <RenameWorkflowModal workflow={workflow} onClose={() => setRenaming(false)} onSave={renameWorkflow} />
      ) : null}
      {confirmingDelete ? (
        <DeleteWorkflowModal
          workflow={workflow}
          deleting={deleting}
          onClose={() => setConfirmingDelete(false)}
          onConfirm={deleteCurrentWorkflow}
        />
      ) : null}
    </section>
  );
}

function DeleteWorkflowModal({
  workflow,
  deleting,
  onClose,
  onConfirm,
}: {
  workflow: TextureWorkflow;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const resourceCount =
    workflow.images.length +
    workflow.atlases.length +
    workflow.atlases.reduce((total, atlas) => total + (atlas.pbrMaps?.length ?? 0), 0);

  return (
    <Modal title="Delete workflow" onClose={onClose}>
      <div className="space-y-5">
        <p className="text-sm leading-6 text-[var(--muted)]">
          Delete <span className="font-semibold text-foreground">{workflow.name}</span> and remove its stored reference images, atlases, and PBR maps.
        </p>
        <div className="rounded-md border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-100">
          This will delete {resourceCount} related resource{resourceCount === 1 ? "" : "s"} and cannot be undone.
        </div>
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose} disabled={deleting}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="button" onClick={() => void onConfirm()} busy={deleting} disabled={deleting} className="bg-red-400 text-[#230608] hover:bg-red-300">
            <Trash2 className="size-4" />
            Delete workflow
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

function RenameWorkflowModal({
  workflow,
  onClose,
  onSave,
}: {
  workflow: TextureWorkflow;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(workflow.name);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    await onSave(name);
    setSaving(false);
  }

  return (
    <Modal title="Rename workflow" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium">
          Workflow name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            className="mt-2 h-11 w-full rounded-md border border-[var(--line)] bg-[#0d1018] px-3 text-sm outline-none transition focus:border-[var(--accent)]"
          />
        </label>
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose} disabled={saving}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit" busy={saving} disabled={saving}>
            Save name
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function AtlasResults({
  atlases,
  apiConfigured,
  creditsReady,
  hasCredits,
  loadingKind,
  onGeneratePbr,
}: {
  atlases: GeneratedAtlas[];
  apiConfigured: boolean;
  creditsReady: boolean;
  hasCredits: boolean;
  loadingKind: AtlasKind | null;
  onGeneratePbr: (atlas: GeneratedAtlas) => Promise<void>;
}) {
  if (!atlases.length) {
    return (
      <EmptyState
        icon={<WandSparkles className="size-6" />}
        title="Atlases will appear here"
        body="After generation, the seamless material atlas and unique facade element atlas are saved locally with previews and download actions."
      />
    );
  }

  return (
    <div className="space-y-4">
      {atlases.map((atlas) => (
        <AtlasResult
          key={atlas.kind}
          atlas={atlas}
          apiConfigured={apiConfigured}
          creditsReady={creditsReady}
          hasCredits={hasCredits}
          loading={loadingKind === atlas.kind}
          onGeneratePbr={() => onGeneratePbr(atlas)}
        />
      ))}
    </div>
  );
}

function AtlasResult({
  atlas,
  apiConfigured,
  creditsReady,
  hasCredits,
  loading,
  onGeneratePbr,
}: {
  atlas: GeneratedAtlas;
  apiConfigured: boolean;
  creditsReady: boolean;
  hasCredits: boolean;
  loading: boolean;
  onGeneratePbr: () => Promise<void>;
}) {
  const imageSource = atlas.url ?? atlas.dataUrl ?? "";

  return (
    <article className="grid gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">{atlas.title}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {atlas.width} x {atlas.height} PNG · {atlas.model}
            </p>
          </div>
          <a
            href={imageSource}
            download={`${atlas.kind}-atlas-${atlas.width}x${atlas.height}.png`}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-[#151823] text-[var(--muted)] transition hover:text-foreground"
            aria-label={`Download ${atlas.title}`}
            title={`Download ${atlas.title}`}
          >
            <Download className="size-4" />
          </a>
        </div>
        <div className="mt-4 overflow-hidden rounded-md border border-[var(--line)] bg-[#0d1018]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSource} alt={atlas.title} className="max-h-[520px] w-full object-contain" />
        </div>
      </div>
      <PbrColumn
        atlas={atlas}
        apiConfigured={apiConfigured}
        creditsReady={creditsReady}
        hasCredits={hasCredits}
        loading={loading}
        onGeneratePbr={onGeneratePbr}
      />
    </article>
  );
}

function PbrColumn({
  atlas,
  apiConfigured,
  creditsReady,
  hasCredits,
  loading,
  onGeneratePbr,
}: {
  atlas: GeneratedAtlas;
  apiConfigured: boolean;
  creditsReady: boolean;
  hasCredits: boolean;
  loading: boolean;
  onGeneratePbr: () => Promise<void>;
}) {
  const maps = atlas.pbrMaps ?? [];
  const [activeMap, setActiveMap] = useState<PbrMap["kind"]>("normal");
  const selectedMap = maps.find((map) => map.kind === activeMap) ?? maps[0];

  if (maps.length === 3) {
    return (
      <div className="rounded-md border border-[var(--line)] bg-[#0d1018] p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">PBR maps</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">Normal, roughness, and metallic maps</p>
          </div>
          <StatusPill tone="success">
            <Check className="size-3.5" />
            ready
          </StatusPill>
        </div>
        <div className="mt-4 grid grid-cols-3 rounded-md border border-[var(--line)] bg-[#151823] p-1">
          {maps.map((map) => (
            <button
              key={map.kind}
              onClick={() => setActiveMap(map.kind)}
              className={cn(
                "h-9 rounded px-2 text-xs font-semibold capitalize text-[var(--muted)] transition hover:text-foreground",
                selectedMap?.kind === map.kind ? "bg-[var(--accent)] text-[#06120b] hover:text-[#06120b]" : "",
              )}
            >
              {map.kind}
            </button>
          ))}
        </div>
        {selectedMap ? <PbrMapPreview map={selectedMap} atlasKind={atlas.kind} /> : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-[var(--line)] bg-[#0d1018] p-5 text-center">
      <div className="flex size-12 items-center justify-center rounded-md bg-[#182033] text-[var(--accent)]">
        {loading ? <Loader2 className="size-6 animate-spin" /> : <Waves className="size-6" />}
      </div>
      <h3 className="mt-4 font-semibold">{loading ? "Generating PBR maps" : "PBR maps not generated"}</h3>
      <p className="mt-2 max-w-xs text-sm leading-6 text-[var(--muted)]">
        {loading
          ? "Creating normal, roughness, and metallic maps from this texture."
          : atlas.url
            ? "Generate matching normal, roughness, and metallic maps for this texture."
            : "Regenerate this atlas first so it has a saved file URL."}
      </p>
      <PrimaryButton
        onClick={() => void onGeneratePbr()}
        disabled={loading || !apiConfigured || !atlas.url || !creditsReady || !hasCredits}
        busy={loading}
        className="mt-5 w-full max-w-xs"
      >
        <WandSparkles className="size-4" />
        Generate PBR
      </PrimaryButton>
      {!apiConfigured ? <p className="mt-3 text-xs text-[var(--muted)]">Image AI provider is not configured</p> : null}
      {apiConfigured && !atlas.url ? <p className="mt-3 text-xs text-[var(--muted)]">Saved atlas file required</p> : null}
      {apiConfigured && atlas.url && !creditsReady ? <p className="mt-3 text-xs text-[var(--muted)]">Checking credits...</p> : null}
      {apiConfigured && atlas.url && creditsReady && !hasCredits ? (
        <p className="mt-3 text-xs text-[var(--muted)]">Add credits from Account to generate</p>
      ) : null}
    </div>
  );
}

function PbrMapPreview({ map, atlasKind }: { map: PbrMap; atlasKind: AtlasKind }) {
  return (
    <article className="mt-3 overflow-hidden rounded-md border border-[var(--line)] bg-[var(--panel)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2">
        <div>
          <h4 className="text-sm font-semibold">{map.title}</h4>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            {map.width} x {map.height}
          </p>
        </div>
        <a
          href={map.url}
          download={`${atlasKind}-${map.kind}-map-${map.width}x${map.height}.png`}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-[#151823] text-[var(--muted)] transition hover:text-foreground"
          aria-label={`Download ${map.title}`}
          title={`Download ${map.title}`}
        >
          <Download className="size-3.5" />
        </a>
      </div>
      <div className="bg-[#0b0d14]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={map.url} alt={map.title} className="max-h-48 w-full object-contain" />
      </div>
    </article>
  );
}

function MissingSurface({ navigate }: { navigate: (href: string, label: string) => void }) {
  return (
    <EmptyState
      icon={<AlertCircle className="size-6" />}
      title="This local item was not found"
      body="The URL is valid, but the project or workflow is not present in your dashboard data."
      action={
        <PrimaryButton onClick={() => navigate("/", "Opening projects")}>
          <ArrowLeft className="size-4" />
          Back to projects
        </PrimaryButton>
      }
    />
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-4">
      <div className="w-full max-w-lg rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <Plus className="size-4 rotate-45" />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
