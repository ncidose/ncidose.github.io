import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  ArrowUpDown,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Check,
  ChevronRight,
  CircleUserRound,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileArchive,
  FileCheck2,
  Folder,
  Globe2,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MessageCircleQuestion,
  Megaphone,
  Paperclip,
  Pin,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  demoAdminUser,
  demoApprovedUser,
  portalAnnouncements,
  portalReleases,
} from "@/data/portalDemo";
import { portalLinks } from "@/data/portalLinks";
import { cn } from "@/lib/utils";
import { getPortalHeaderEmail, selectPrimaryPortalIdentity } from "@/lib/portalUser";
import { buildAnswerThreads, questionAnswerLabel, questionAuthorLabel, questionRequestTypeLabels, questionRequestTypes, questionTools, type ManagedQuestion, type QuestionAnswerThread, type QuestionRequestType, type QuestionTool, type QuestionVisibility } from "@/lib/questions";

type PortalIdentity = {
  id: string;
  provider: string;
  email: string;
  verified: boolean;
  primary: boolean;
};

type PortalUser = {
  id: string;
  name: string;
  primaryEmail: string;
  signedInEmail?: string;
  institution: string;
  country?: string;
  role: "user" | "admin";
  discussionRole: "community" | "team";
  discussionHandle?: string;
  staStatus: "Approved";
  staApprovedOn: string;
  identities: PortalIdentity[];
};

type PortalSection = "overview" | "downloads" | "announcements" | "questions" | "account" | "admin";
const standalonePortalBuild = import.meta.env.VITE_PORTAL_STANDALONE === "true";

const portalNav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "downloads", label: "Downloads", icon: Download },
  { id: "announcements", label: "Announcements", icon: Bell },
  { id: "questions", label: "Discussions", icon: MessageCircleQuestion },
  { id: "account", label: "Account", icon: CircleUserRound },
] satisfies Array<{ id: PortalSection; label: string; icon: typeof LayoutDashboard }>;

const publicSiteUrl = "https://ncidose.github.io/";
const publicAccessRequestUrl = `${publicSiteUrl}portal/request-access/`;
const commercialLicensingEmail = "mailto:kevin.chang@nih.gov?subject=NCI%20Dose%20Tools%20Licensing%20Inquiry";
const portalSupportEmail = "mailto:choonsik.lee@nih.gov?subject=NCI%20Dose%20Tools%20User%20Portal%20Help";

export const AnnouncementBody = ({ children }: { children: string }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      a: ({ children: label, ...props }) => (
        <a {...props} target="_blank" rel="noopener noreferrer" className="break-words text-primary underline underline-offset-4">
          {label}
        </a>
      ),
      p: ({ children: paragraph }) => <p className="whitespace-pre-wrap">{paragraph}</p>,
    }}
  >
    {children}
  </ReactMarkdown>
);

const portalResources = [
  { label: "Manuals", href: `${publicSiteUrl}manuals`, icon: BookOpen },
  { label: "Tool information", href: `${publicSiteUrl}tools`, icon: ClipboardCheck },
  { label: "Literature", href: `${publicSiteUrl}literature`, icon: FileCheck2 },
  { label: "Public website", href: publicSiteUrl, icon: Globe2 },
] satisfies Array<{ label: string; href: string; icon: typeof LayoutDashboard }>;

const toolManualUrls: Record<string, string> = {
  NCICT: `${publicSiteUrl}manuals/ncict`,
  NCINM: `${publicSiteUrl}manuals/ncinm`,
  NCIRF: `${publicSiteUrl}manuals/ncirf`,
  PHANTOM: `${publicSiteUrl}manuals/phantom`,
};
const qaAttachmentMaximumBytes = 10 * 1024 * 1024;
const qaAttachmentMaximumCount = 3;
const qaAttachmentAccept = ".pdf,.png,.jpg,.jpeg,.txt,.log,.csv,.zip";
const qaAttachmentError = (files: File[]) => {
  if (files.length > qaAttachmentMaximumCount) return "Attach no more than 3 files.";
  if (files.some((file) => file.size > qaAttachmentMaximumBytes)) return "Each attachment must be 10 MB or smaller.";
  return "";
};
const attachmentSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const portalUserFromApi = (apiUser: Record<string, unknown>): PortalUser => {
  const signedInEmail = String(apiUser.signed_in_email || apiUser.primary_email || "");
  return {
    id: String(apiUser.id),
    name: String(apiUser.display_name || signedInEmail.split("@")[0]),
    primaryEmail: String(apiUser.primary_email || signedInEmail),
    signedInEmail,
    institution: String(apiUser.institution || ""),
    country: String(apiUser.country || ""),
    role: apiUser.role === "admin" ? "admin" : "user",
    discussionRole: apiUser.role === "admin" || apiUser.discussion_role === "team" ? "team" : "community",
    discussionHandle: String(apiUser.discussion_handle || ""),
    staStatus: "Approved",
    staApprovedOn: String(apiUser.approved_at || "Existing approval"),
    identities: Array.isArray(apiUser.identities) ? apiUser.identities as PortalIdentity[] : [],
  };
};

const getStoredUser = (): PortalUser | null => {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem("ncidose-portal-demo-user");
  if (value === "admin") return demoAdminUser;
  if (value === "user") return demoApprovedUser;
  return null;
};

export const Portal = ({ publicLanding = false }: { publicLanding?: boolean }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const standalonePortal = standalonePortalBuild;
  const demoMode = !standalonePortal && (import.meta.env.DEV || import.meta.env.VITE_PORTAL_DEMO_MODE === "true");
  const [user, setUser] = useState<PortalUser | null>(() => demoMode ? getStoredUser() : null);
  const [authState, setAuthState] = useState<"loading" | "ready" | "signed-out" | "denied">(demoMode ? "ready" : "loading");
  const [deniedEmail, setDeniedEmail] = useState("");
  const pathSection = location.pathname.split("/")[2] as PortalSection | undefined;
  const validSections: PortalSection[] = ["overview", "downloads", "announcements", "questions", "account", "admin"];
  const section: PortalSection = pathSection && validSections.includes(pathSection) ? pathSection : "overview";
  const isAccessRequest = location.pathname.replace(/\/+$/, "") === "/portal/request-access";

  useEffect(() => {
    if (demoMode || publicLanding || isAccessRequest) return;
    const controller = new AbortController();
    fetch("/api/me", { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const error = new Error(response.status === 403 ? "denied" : "authentication") as Error & { email?: string };
          if (response.status === 403) {
            const body = await response.json().catch(() => ({}));
            error.email = typeof body.email === "string" ? body.email : "";
          }
          throw error;
        }
        const body = await response.json();
        setUser(portalUserFromApi(body.user));
        setAuthState("ready");
      })
      .catch((error: Error & { email?: string }) => {
        if (error.name === "AbortError") return;
        if (error.message === "denied") {
          setDeniedEmail(error.email || "");
          setAuthState("denied");
        } else {
          setAuthState("signed-out");
        }
      });
    return () => controller.abort();
  }, [demoMode, publicLanding, isAccessRequest]);

  const signIn = (role: "user" | "admin") => {
    const nextUser = role === "admin" ? demoAdminUser : demoApprovedUser;
    window.sessionStorage.setItem("ncidose-portal-demo-user", role);
    setUser(nextUser);
    navigate("/portal");
  };

  if (!standalonePortalBuild && publicLanding) {
    if (isAccessRequest) return <AccessRequest />;
    return (
      <PortalSignIn
        demoMode={false}
        accessDenied={false}
        onSignIn={signIn}
        securePortalUrl={portalLinks.securePortal}
      />
    );
  }

  const signOut = async () => {
    if (!demoMode) {
      try {
        await Promise.allSettled([
          fetch("/api/auth/logout", { method: "POST", credentials: "include" }),
          fetch("/cdn-cgi/access/logout", { credentials: "include", redirect: "manual" }),
        ]);
      } finally {
        window.location.replace(publicSiteUrl);
      }
      return;
    }
    window.sessionStorage.removeItem("ncidose-portal-demo-user");
    setUser(null);
    navigate("/portal");
  };

  const retryWithAnotherEmail = async () => {
    try {
      await Promise.allSettled([
        fetch("/api/auth/logout", { method: "POST", credentials: "include" }),
        fetch("/cdn-cgi/access/logout", { credentials: "include", redirect: "manual" }),
      ]);
    } finally {
      setUser(null);
      setDeniedEmail("");
      setAuthState("signed-out");
    }
  };

  const completeEmailSignIn = (apiUser: Record<string, unknown>) => {
    setUser(portalUserFromApi(apiUser));
    setDeniedEmail("");
    setAuthState("ready");
    navigate("/portal");
  };

  if (!standalonePortalBuild && isAccessRequest && !user) {
    return <AccessRequest />;
  }

  if (!demoMode && authState === "loading") {
    return <PortalLoading />;
  }

  if (!user) {
    return (
      <PortalSignIn
        demoMode={demoMode}
        accessDenied={authState === "denied"}
        deniedEmail={deniedEmail}
        onSignIn={signIn}
        onRetrySignIn={retryWithAnotherEmail}
        selfHostedAuth={standalonePortal}
        onAuthenticated={completeEmailSignIn}
      />
    );
  }

  if (section === "admin" && user.role !== "admin") {
    return <Navigate to="/portal" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-foreground">
      <PortalTopbar user={user} onSignOut={signOut} />
      <PortalMobileNav section={section} isAdmin={user.role === "admin"} />
      <div className="mx-auto flex max-w-[1500px] pt-16">
        <PortalSidebar section={section} isAdmin={user.role === "admin"} />
        <main className="min-w-0 flex-1 px-5 pb-20 pt-20 sm:px-8 md:pt-8 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-mono text-xs uppercase tracking-widest text-primary">
                  Approved User Portal
                </div>
                <h1 className="mt-2 text-3xl font-light tracking-tight sm:text-4xl">
                  {section === "overview" && `Welcome, ${user.name}`}
                  {section === "downloads" && "Software downloads"}
                  {section === "announcements" && "Announcements"}
                  {section === "questions" && "Discussions"}
                  {section === "account" && "Account and access"}
                  {section === "admin" && "Portal administration"}
                </h1>
              </div>
              <div className="inline-flex items-center gap-2 border border-primary/20 bg-primary/5 px-3 py-2 font-mono text-xs text-primary">
                <ShieldCheck className="h-4 w-4" />
                {demoMode ? "Preview mode" : "Access verified"}
              </div>
            </div>

            {section === "overview" && <Overview user={user} demoMode={demoMode} />}
            {section === "downloads" && <Downloads demoMode={demoMode} />}
            {section === "announcements" && <Announcements demoMode={demoMode} />}
            {section === "questions" && <PortalQuestions demoMode={demoMode} />}
            {section === "account" && <Account user={user} setUser={setUser} demoMode={demoMode} onSignOut={signOut} />}
            {section === "admin" && <Admin demoMode={demoMode} />}
          </div>
        </main>
      </div>
    </div>
  );
};

const NewUserAccessOptions = ({ internalStaLink = false }: { internalStaLink?: boolean }) => {
  const optionClassName = "flex items-center justify-between gap-4 border border-primary px-4 py-3 text-left text-primary transition-colors hover:bg-primary hover:text-white";
  const researchContent = <><span><span className="block text-sm font-medium">Research user</span><span className="mt-0.5 block text-xs">Prepare and submit an STA</span></span><ChevronRight className="h-4 w-4 shrink-0" /></>;

  return (
    <div className="mt-5 space-y-3">
      {internalStaLink ? (
        <Link to="/portal/request-access" className={optionClassName}>{researchContent}</Link>
      ) : (
        <a href={publicAccessRequestUrl} className={optionClassName}>{researchContent}</a>
      )}
      <a href={commercialLicensingEmail} className="flex items-center justify-between gap-4 border border-slate-300 px-4 py-3 text-left text-slate-700 transition-colors hover:border-primary hover:text-primary">
        <span><span className="block text-sm font-medium">Commercial user</span><span className="mt-0.5 block text-xs">Email Dr. Kevin Chang</span></span><Mail className="h-4 w-4 shrink-0" />
      </a>
    </div>
  );
};

export const PortalSignIn = ({
  demoMode,
  accessDenied,
  deniedEmail,
  onSignIn,
  onRetrySignIn,
  securePortalUrl,
  selfHostedAuth = false,
  onAuthenticated,
}: {
  demoMode: boolean;
  accessDenied: boolean;
  deniedEmail?: string;
  onSignIn: (role: "user" | "admin") => void;
  onRetrySignIn?: () => void | Promise<void>;
  securePortalUrl?: string;
  selfHostedAuth?: boolean;
  onAuthenticated?: (apiUser: Record<string, unknown>) => void;
}) => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [authError, setAuthError] = useState("");
  const [submittingAuth, setSubmittingAuth] = useState(false);

  const beginSecureSignIn = () => {
    if (accessDenied && onRetrySignIn) {
      void onRetrySignIn();
      return;
    }
    if (securePortalUrl) {
      window.location.assign(securePortalUrl);
      return;
    }
    onSignIn("user");
  };

  const requestCode = async (event: FormEvent) => {
    event.preventDefault();
    setSubmittingAuth(true);
    setAuthError("");
    try {
      const response = await fetch("/api/auth/request-code", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json();
      if (!response.ok) {
        const message = body.error === "too_many_code_requests"
          ? "Too many code requests. Please wait before trying again."
          : body.error === "login_code_delivery_failed"
            ? "The sign-in email could not be delivered. Please try again shortly."
            : "A sign-in code could not be requested. Please check the email and try again.";
        throw new Error(message);
      }
      setChallengeId(body.challengeId);
      setCode("");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "A sign-in code could not be requested.");
    } finally {
      setSubmittingAuth(false);
    }
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^[0-9]{6}$/.test(code)) return;
    setSubmittingAuth(true);
    setAuthError("");
    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId, code }),
      });
      const body = await response.json();
      if (!response.ok) {
        const message = body.error === "portal_access_denied"
          ? "This portal account is not currently active."
          : "That code is incorrect or has expired. Request a new code and try again.";
        throw new Error(message);
      }
      onAuthenticated?.(body.user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "The sign-in code could not be verified.");
    } finally {
      setSubmittingAuth(false);
    }
  };

  const changeEmail = () => {
    setChallengeId("");
    setCode("");
    setAuthError("");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-border bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <a href={publicSiteUrl} className="text-lg font-light tracking-tight">NCI Dose Tools</a>
          <a href={publicSiteUrl} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to public site
          </a>
        </div>
      </header>

      <main className="container mx-auto grid min-h-[calc(100vh-64px)] items-center gap-12 px-6 py-16 lg:grid-cols-[1fr_460px]">
        <div className="max-w-2xl">
          <div className="font-mono text-xs uppercase tracking-widest text-primary">User Portal</div>
          <h1 className="mt-5 text-hero-md lg:text-[72px]">Your approved tools, in one place.</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Download current NCI Dose Tools releases, review announcements, and manage the email addresses linked to your approved access.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              [ShieldCheck, "STA access retained"],
              [FileArchive, "Private downloads"],
              [Megaphone, "Release updates"],
            ].map(([Icon, label]) => (
              <div key={label as string} className="flex items-center gap-3 border border-border bg-white p-4 text-sm text-slate-700">
                <Icon className="h-4 w-4 text-primary" /> {label as string}
              </div>
            ))}
          </div>
        </div>

        <div className="border border-border bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-9">
          <div className="mb-7">
            <h2 className="text-2xl font-light">{accessDenied ? "Email not registered" : "Sign in"}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {accessDenied
                ? "Email verification was successful, but this address is not linked to an approved portal account."
                : "Sign in with an email already linked to your approved portal account."}
            </p>
          </div>

          {!demoMode && accessDenied && (
            <div className="mb-6 border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
              <p className="font-medium">
                No approved portal access was found
                {deniedEmail ? <> for <span className="break-all">{deniedEmail}</span></> : " for this email"}.
              </p>
              <p className="mt-2">Existing users should try the Gmail address previously registered with the Google Group, the email in their portal invitation, or a verified secondary email.</p>
              <p className="mt-2">New users must prepare and submit a signed Software Transfer Agreement (STA) before download access can be activated.</p>
            </div>
          )}

          {accessDenied ? (
            <div className="space-y-3">
              <a
                href={publicAccessRequestUrl}
                className="flex items-center justify-center gap-2 bg-primary px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                Research user: prepare and submit an STA <ChevronRight className="h-4 w-4" />
              </a>
              <a
                href={commercialLicensingEmail}
                className="flex items-center justify-center gap-2 border border-primary px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-white"
              >
                Commercial user: email Dr. Kevin Chang <Mail className="h-4 w-4" />
              </a>
              <Button
                variant="outline"
                className="h-12 w-full rounded-none"
                onClick={beginSecureSignIn}
              >
                <Mail className="h-4 w-4" /> Try another email
              </Button>
            </div>
          ) : selfHostedAuth && !demoMode ? (
            <>
              {!challengeId ? (
                <form onSubmit={requestCode} className="space-y-4">
                  <label className="block">
                    <span className="font-mono text-xs uppercase tracking-wider text-slate-600">Approved account email</span>
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@institution.edu"
                      autoComplete="email"
                      required
                      disabled={submittingAuth}
                      className="mt-2 h-12 rounded-none"
                    />
                  </label>
                  {authError && <p role="alert" className="border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{authError}</p>}
                  <Button type="submit" className="h-12 w-full rounded-none" disabled={submittingAuth || !email.includes("@")}>
                    {submittingAuth ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send sign-in code
                  </Button>
                </form>
              ) : (
                <form onSubmit={verifyCode} className="space-y-4">
                  <div className="border-l-2 border-primary/30 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-slate-700">
                    <p><strong>This screen does not mean that a code was sent.</strong> For account privacy, the portal shows the same screen for every email address.</p>
                    <p className="mt-2">A code is generated only when <strong className="break-all">{email.trim().toLowerCase()}</strong> exactly matches an email linked to an active approved account. When generated, it expires in 10 minutes.</p>
                  </div>
                  <label className="block">
                    <span className="font-mono text-xs uppercase tracking-wider text-slate-600">Six-digit code, if received</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      autoComplete="one-time-code"
                      autoFocus
                      required
                      disabled={submittingAuth}
                      className="mt-2 h-14 rounded-none text-center font-mono text-2xl tracking-[0.35em]"
                    />
                  </label>
                  {authError && <p role="alert" className="border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{authError}</p>}
                  <Button type="submit" className="h-12 w-full rounded-none" disabled={submittingAuth || code.length !== 6}>
                    {submittingAuth ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Verify and sign in
                  </Button>
                  <button type="button" onClick={changeEmail} className="w-full text-center text-sm text-muted-foreground hover:text-primary">Use a different email</button>
                </form>
              )}

              <div className="mt-5 space-y-2 border-l-2 border-primary/20 pl-3 text-xs leading-relaxed text-muted-foreground">
                <p><span className="font-medium text-slate-700">Previous Google Group users:</span> use the Gmail address registered with the group.</p>
                <p><span className="font-medium text-slate-700">Newly approved users:</span> enter the exact email address shown in the User Portal welcome message.</p>
                <p>Only that address, or a secondary email already linked to the account, receives a sign-in code.</p>
              </div>

              <div className="mt-5 flex items-start gap-2 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Your secure session lasts up to 30 days on this device and browser. Signing out or clearing browser cookies ends it sooner.
              </div>

              {challengeId && (
                <div className="mt-5 border-t border-border pt-5 text-center text-xs leading-relaxed text-muted-foreground">
                  If no code arrives within a few minutes, do not keep waiting or repeatedly request one. If you received a welcome message, <button type="button" onClick={changeEmail} className="text-primary underline">enter the exact email shown there</button>. If you never received a welcome message, use the New User access process below.
                </div>
              )}
            </>
          ) : (
            <>
              <Button
                className="h-12 w-full rounded-none"
                disabled={!demoMode && !securePortalUrl}
                onClick={beginSecureSignIn}
              >
                <Mail className="h-4 w-4" /> Sign in with approved email
              </Button>
              <div className="mt-4 space-y-2 border-l-2 border-primary/20 pl-3 text-xs leading-relaxed text-muted-foreground">
                <p><span className="font-medium text-slate-700">Previous Google Group users:</span> use the Gmail address registered with the group.</p>
                <p><span className="font-medium text-slate-700">Newly approved users:</span> enter the exact email address shown in the User Portal welcome message—usually your institutional email.</p>
                <p>The secure User Portal verifies the email with a one-time code. Email verification alone does not grant software access.</p>
              </div>

              <div className="mt-6 flex items-start gap-2 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Your secure session lasts up to 30 days on the same device and browser. Signing out or clearing browser cookies ends it sooner.
              </div>

              <div className="mt-7 border-t border-border pt-6">
                <div className="font-mono text-xs uppercase tracking-wider text-primary">New user</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Choose the access type that matches your intended use.</p>
              </div>
              <NewUserAccessOptions internalStaLink={!standalonePortalBuild} />
            </>
          )}

          {selfHostedAuth && !demoMode && (
            <div className="mt-7 border-t border-border pt-6">
              <div className="font-mono text-xs uppercase tracking-wider text-primary">New user</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Choose the access type that matches your intended use.</p>
              <NewUserAccessOptions />
            </div>
          )}

          {!demoMode && (
            <div className="mt-6 border-t border-border pt-5 text-center text-xs leading-relaxed text-muted-foreground">
              Still need help? Email the{" "}
              <a href={portalSupportEmail} className="font-medium text-primary underline underline-offset-4">
                NCI Dose Team (choonsik.lee@nih.gov)
              </a>.
            </div>
          )}

          {demoMode && (
            <button type="button" onClick={() => onSignIn("admin")} className="mt-5 w-full text-center font-mono text-xs text-muted-foreground hover:text-primary">
              Preview administrator account
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

const PortalLoading = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50">
    <div className="flex items-center gap-3 border border-border bg-white px-6 py-5 text-sm text-slate-700 shadow-lg shadow-slate-200/50">
      <Loader2 className="h-5 w-5 animate-spin text-primary" /> Verifying approved access…
    </div>
  </div>
);

const AccessRequest = () => {
  const [submitted, setSubmitted] = useState(false);
  const [preparingPdf, setPreparingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [eligibility, setEligibility] = useState({ nonprofit: "", commercialReplacement: "", clinicalUse: "" });
  const isIneligible = eligibility.nonprofit === "no" || eligibility.commercialReplacement === "yes" || eligibility.clinicalUse === "yes";
  const eligibilityComplete = Object.values(eligibility).every(Boolean);

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PortalPublicHeader />
        <main className="container mx-auto flex min-h-[calc(100vh-64px)] items-center justify-center px-6 py-16">
          <div className="w-full max-w-2xl border border-border bg-white p-8 text-center shadow-xl shadow-slate-200/50 sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <ClipboardCheck className="h-8 w-8" />
            </div>
            <div className="mt-7 font-mono text-xs uppercase tracking-widest text-primary">STA PDF prepared</div>
            <h1 className="mt-3 text-3xl font-light">Your prefilled STA has been downloaded.</h1>
            <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Review every entry in the PDF, obtain the required recipient signatures, and attach the signed agreement to an email to Dr. Lee.
            </p>
            <div className="mx-auto mt-8 max-w-lg border border-border bg-slate-50 p-5 text-left">
              <div className="font-mono text-xs uppercase tracking-wider text-slate-500">Next step</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                The email button opens a prepared message. For security reasons, your browser cannot attach the PDF automatically; select the signed PDF from your Downloads folder before sending.
              </p>
            </div>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a href="mailto:choonsik.lee@nih.gov?subject=NCI%20Dose%20Tools%20Software%20Transfer%20Agreement" className="inline-flex items-center justify-center gap-2 bg-primary px-5 py-3 text-sm font-medium text-white"><Mail className="h-4 w-4" /> Email signed STA to Dr. Lee</a>
              <Link to="/portal" className="inline-flex items-center justify-center border border-border px-5 py-3 text-sm font-medium text-slate-700 hover:border-primary hover:text-primary">
                Return to sign in
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalPublicHeader />
      <main className="container mx-auto grid gap-10 px-6 py-12 lg:grid-cols-[0.85fr_1.15fr] lg:py-16">
        <section className="lg:sticky lg:top-10 lg:self-start">
          <div className="font-mono text-xs uppercase tracking-widest text-primary">New user access</div>
          <h1 className="mt-4 text-4xl font-light tracking-tight sm:text-5xl">A clearer path from STA to downloads.</h1>
          <p className="mt-5 max-w-xl leading-relaxed text-muted-foreground">
            The NCI Technology Transfer Center remains responsible for reviewing and executing the Software Transfer Agreement. This form prepares the request; signed agreements are submitted by email for review.
          </p>
          <div className="mt-9 space-y-3">
            {[
              ["01", "Request access", "Provide your institutional contact information."],
              ["02", "Complete the STA", "Follow the official NCI submission instructions."],
              ["03", "NCI review", "The Technology Transfer Center reviews and executes the agreement."],
              ["04", "Portal activation", "Verify your preferred login email and receive download access."],
            ].map(([number, title, detail]) => (
              <div key={number} className="grid grid-cols-[42px_1fr] gap-4 border border-border bg-white p-4">
                <div className="font-mono text-sm text-primary">{number}</div>
                <div><div className="text-sm font-medium text-slate-800">{title}</div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p></div>
              </div>
            ))}
          </div>
        </section>

        <form
          className="border border-border bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-9"
          onSubmit={async (event) => {
            event.preventDefault();
            setPreparingPdf(true);
            setPdfError("");
            const form = new FormData(event.currentTarget);
            try {
              const selectedTools = form.getAll("tools").map(String);
              if (!selectedTools.length) throw new Error("Select at least one NCI Dose Tool for the STA.");
              const { downloadStaPdf } = await import("@/lib/staPdf");
              await downloadStaPdf({
                recipientInstitution: String(form.get("institution") || ""),
                nonprofit: eligibility.nonprofit as "yes" | "no",
                commercialReplacement: eligibility.commercialReplacement as "yes" | "no",
                clinicalUse: eligibility.clinicalUse as "yes" | "no",
                researchUse: String(form.get("researchUse") || ""),
                officialName: String(form.get("officialName") || ""),
                officialTitle: String(form.get("officialTitle") || ""),
                investigatorName: String(form.get("fullName") || ""),
                investigatorTitle: String(form.get("investigatorTitle") || ""),
                mailingAddress: String(form.get("mailingAddress") || ""),
                legalEmail: String(form.get("legalEmail") || ""),
                legalPhone: String(form.get("legalPhone") || ""),
                tools: selectedTools,
              });
              setSubmitted(true);
            } catch (error) {
              setPdfError(error instanceof Error ? error.message : "The STA PDF could not be prepared.");
            } finally {
              setPreparingPdf(false);
            }
          }}
        >
          <div className="flex items-start justify-between gap-5 border-b border-border pb-6">
            <div><h2 className="text-2xl font-light">Access request</h2><p className="mt-2 text-sm text-muted-foreground">No signed agreement document is uploaded to this portal.</p></div>
            <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <PortalField label="Recipient investigator name" name="fullName" placeholder="Full legal name" />
            <PortalField label="Recipient investigator job title" name="investigatorTitle" placeholder="Job title" />
            <PortalField label="Institutional email" name="email" placeholder="name@institution.edu" type="email" />
            <PortalField label="Recipient institution" name="institution" placeholder="University or organization" />
            <PortalField label="Country" name="country" placeholder="Country" />
            <PortalField label="Phone" name="phone" placeholder="Phone number" type="tel" />
          </div>

          <div className="mt-7 border border-border p-5 sm:p-6">
            <div className="font-mono text-xs uppercase tracking-widest text-primary">STA eligibility questions</div>
            <div className="mt-5 space-y-5">
              <EligibilityQuestion
                name="nonprofit"
                question="Is your organization either non-profit or a government-run entity?"
                value={eligibility.nonprofit}
                onChange={(value) => setEligibility((current) => ({ ...current, nonprofit: value }))}
                instruction="If the answer is NO, please do not continue with the Software Transfer Agreement. Please contact Dr. Kevin Chang (kevin.chang@nih.gov) for additional licensing information."
                stopAnswer="no"
              />
              <EligibilityQuestion
                name="commercialReplacement"
                question="Will the provided Software be used to replace commercially available radiation dosimetry tools?"
                value={eligibility.commercialReplacement}
                onChange={(value) => setEligibility((current) => ({ ...current, commercialReplacement: value }))}
                instruction="If the answer is YES, please do not continue with the Software Transfer Agreement. Please contact Dr. Kevin Chang (kevin.chang@nih.gov) for additional licensing information."
                stopAnswer="yes"
              />
              <EligibilityQuestion
                name="clinicalUse"
                question="Will the provided Software be used to treat or diagnose current or future patients?"
                value={eligibility.clinicalUse}
                onChange={(value) => setEligibility((current) => ({ ...current, clinicalUse: value }))}
                instruction="If the answer is YES, please do not continue with the Software Transfer Agreement. Please contact Dr. Kevin Chang (kevin.chang@nih.gov) for additional licensing information."
                stopAnswer="yes"
              />
            </div>
          </div>

          <fieldset className="mt-7">
            <legend className="font-mono text-xs uppercase tracking-wider text-slate-600">Tools requested</legend>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {["NCICT", "NCINM", "NCIRF", "PHANTOM"].map((tool) => (
                <label key={tool} className="flex cursor-pointer items-center gap-2 border border-border px-3 py-3 text-sm text-slate-700 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:text-primary">
                  <input type="checkbox" name="tools" value={tool} className="accent-primary" /> {tool}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-7">
            <label htmlFor="research-use" className="font-mono text-xs uppercase tracking-wider text-slate-600">Intended research use</label>
            <textarea id="research-use" name="researchUse" required className="mt-2 min-h-28 w-full border border-input bg-background p-3 text-sm outline-none focus:border-primary" placeholder="Briefly describe the planned research use." />
          </div>

          <fieldset className="mt-7 border border-border p-5 sm:p-6">
            <legend className="px-2 font-mono text-xs uppercase tracking-widest text-primary">Authorized recipient official</legend>
            <p className="text-xs leading-relaxed text-muted-foreground">This must be someone authorized to sign legal documents for the recipient institution.</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <PortalField label="Authorized official name" name="officialName" placeholder="Full legal name" />
              <PortalField label="Authorized official job title" name="officialTitle" placeholder="Job title" />
            </div>
          </fieldset>

          <fieldset className="mt-7 border border-border p-5 sm:p-6">
            <legend className="px-2 font-mono text-xs uppercase tracking-widest text-primary">Legal notices</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-2"><span className="font-mono text-xs uppercase tracking-wider text-slate-600">Recipient mailing address</span><textarea required name="mailingAddress" className="mt-2 min-h-24 w-full border border-input bg-background p-3 text-sm outline-none focus:border-primary" placeholder="Complete institutional mailing address" /></label>
              <PortalField label="Legal notice email" name="legalEmail" placeholder="name@institution.edu" type="email" />
              <PortalField label="Legal notice phone" name="legalPhone" placeholder="Phone number" type="tel" />
            </div>
          </fieldset>

          <div className="mt-7 flex flex-col-reverse items-stretch justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">Submitting this request does not itself constitute NCI approval or grant software access.</p>
            <Button type="submit" disabled={!eligibilityComplete || isIneligible || preparingPdf} className="h-11 rounded-none px-6"><Send className="h-4 w-4" /> {preparingPdf ? "Preparing PDF…" : "Prepare STA request"}</Button>
          </div>
          {pdfError && <div role="alert" className="mt-4 border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{pdfError}</div>}
        </form>
      </main>
    </div>
  );
};

const PortalPublicHeader = () => (
  <header className="border-b border-border bg-white">
    <div className="container mx-auto flex h-16 items-center justify-between px-6">
      <Link to="/" className="text-lg font-light tracking-tight">NCI Dose Tools</Link>
      <Link to="/portal" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>
    </div>
  </header>
);

const PortalField = ({ label, name, placeholder, type = "text" }: { label: string; name: string; placeholder: string; type?: string }) => (
  <label className="block">
    <span className="font-mono text-xs uppercase tracking-wider text-slate-600">{label}</span>
    <Input required type={type} name={name} placeholder={placeholder} className="mt-2 h-11 rounded-none" />
  </label>
);

const EligibilityQuestion = ({ name, question, value, onChange, instruction, stopAnswer }: { name: string; question: string; value: string; onChange: (value: string) => void; instruction: string; stopAnswer: string }) => (
  <fieldset>
    <legend className="text-sm leading-relaxed text-slate-800">{question}</legend>
    <div className="mt-2 flex gap-2">
      {["yes", "no"].map((answer) => (
        <label key={answer} className={cn("flex cursor-pointer items-center gap-2 border px-4 py-2 text-sm uppercase", value === answer ? "border-primary bg-primary/5 text-primary" : "border-border text-slate-600")}>
          <input required type="radio" name={name} value={answer} checked={value === answer} onChange={() => onChange(answer)} className="accent-primary" /> {answer}
        </label>
      ))}
    </div>
    <p className={cn("mt-3 text-xs leading-relaxed", value === stopAnswer ? "border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-amber-900" : "text-muted-foreground")}>
      {instruction.split("kevin.chang@nih.gov")[0]}
      <a className="font-medium underline" href="mailto:kevin.chang@nih.gov">kevin.chang@nih.gov</a>
      {instruction.split("kevin.chang@nih.gov")[1]}
    </p>
  </fieldset>
);

const PortalTopbar = ({ user, onSignOut }: { user: PortalUser; onSignOut: () => void }) => (
  <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
    <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-5 sm:px-8">
      <div className="flex items-center gap-6">
        <a href={publicSiteUrl} className="text-lg font-light tracking-tight">NCI Dose Tools</a>
        <div className="hidden border-l border-border pl-6 font-mono text-xs uppercase tracking-widest text-primary sm:block">User Portal</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <div className="text-sm font-medium text-slate-800">{user.name}</div>
          <div className="text-xs text-muted-foreground">{getPortalHeaderEmail(user)}</div>
        </div>
        <button type="button" onClick={onSignOut} className="flex h-9 w-9 items-center justify-center border border-border text-muted-foreground hover:border-primary hover:text-primary" aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  </header>
);

const PortalSidebar = ({ section, isAdmin }: { section: PortalSection; isAdmin: boolean }) => (
  <aside className="sticky top-16 z-30 hidden h-[calc(100vh-4rem)] w-56 shrink-0 flex-col self-start overflow-y-auto border-r border-border bg-white px-4 py-6 md:flex xl:w-64">
    <nav className="space-y-1">
      {portalNav.map((item) => (
        <PortalNavLink key={item.id} item={item} active={section === item.id} layout="sidebar" />
      ))}
      {isAdmin && (
        <>
          <div className="my-5 border-t border-border" />
          <PortalNavLink item={{ id: "admin", label: "Admin", icon: Settings }} active={section === "admin"} layout="sidebar" />
        </>
      )}
      <div className="my-5 border-t border-border" />
      <div className="px-4 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">Resources</div>
      {portalResources.map((item) => (
        <PortalResourceLink key={item.label} item={item} layout="sidebar" />
      ))}
    </nav>
    <div className="mt-auto shrink-0 border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-800"><ShieldCheck className="h-4 w-4 text-primary" /> Access approved</div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Software access is governed by your approved agreement.</p>
    </div>
  </aside>
);

const PortalMobileNav = ({ section, isAdmin }: { section: PortalSection; isAdmin: boolean }) => (
  <nav className="fixed inset-x-0 top-16 z-40 flex overflow-x-auto border-b border-border bg-white px-3 py-2 md:hidden">
    {[...portalNav, ...(isAdmin ? [{ id: "admin" as const, label: "Admin", icon: Settings }] : [])].map((item) => (
      <PortalNavLink key={item.id} item={item} active={section === item.id} layout="tabs" />
    ))}
    {portalResources.map((item) => (
      <PortalResourceLink key={item.label} item={item} layout="tabs" />
    ))}
  </nav>
);

const PortalNavLink = ({ item, active, layout }: { item: { id: PortalSection; label: string; icon: typeof LayoutDashboard }; active: boolean; layout: "sidebar" | "tabs" }) => (
  <Link
    to={item.id === "overview" ? "/portal" : `/portal/${item.id}`}
    aria-current={active ? "page" : undefined}
    className={cn(
      "flex items-center gap-3 whitespace-nowrap border-l-2 py-3 text-sm transition-colors",
      layout === "sidebar" ? "w-full px-4" : "w-auto flex-none px-3",
      active ? "border-primary bg-primary/10 font-medium text-primary" : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-primary",
    )}
  >
    <item.icon className="h-4 w-4 shrink-0" /> <span>{item.label}</span>
  </Link>
);

const PortalResourceLink = ({ item, layout }: { item: { label: string; href: string; icon: typeof LayoutDashboard }; layout: "sidebar" | "tabs" }) => (
  <a
    href={item.href}
    target="_blank"
    rel="noreferrer"
    className={cn(
      "flex items-center gap-3 whitespace-nowrap border-l-2 border-transparent py-3 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary",
      layout === "sidebar" ? "w-full px-4" : "w-auto flex-none px-3",
    )}
  >
    <item.icon className="h-4 w-4 shrink-0" />
    <span>{item.label}</span>
    <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
  </a>
);

const Overview = ({ user, demoMode }: { user: PortalUser; demoMode: boolean }) => {
  const [announcements, setAnnouncements] = useState<LiveAnnouncement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(!demoMode);

  useEffect(() => {
    if (demoMode) return;
    fetch("/api/announcements", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Announcements could not be loaded.");
        const body = await response.json();
        setAnnouncements(body.announcements);
      })
      .catch(() => setAnnouncements([]))
      .finally(() => setLoadingAnnouncements(false));
  }, [demoMode]);

  const demoAnnouncements: LiveAnnouncement[] = portalAnnouncements.map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    summary: announcement.summary,
    body: announcement.summary,
    category: announcement.category,
    audience: announcement.audience === "Public" ? "public" : "approved_users",
    status: "published",
    originalPublishedAt: announcement.date,
    publishedAt: null,
    sourceUrl: null,
    read: !announcement.unread,
    emailDelivery: null,
  }));
  const items = demoMode ? demoAnnouncements : announcements;
  const unreadCount = items.filter((announcement) => !announcement.read).length;
  const latest = items[0];

  return <div className="space-y-8">
    <div className="grid gap-4 md:grid-cols-2">
      <StatusCard icon={FileCheck2} label="STA status" value={user.staStatus} note={`Approved ${user.staApprovedOn}`} />
      <StatusCard icon={Bell} label="Unread updates" value={loadingAnnouncements ? "—" : String(unreadCount)} note={unreadCount === 1 ? "Announcement awaiting review" : "Announcements awaiting review"} />
    </div>

    <div className="grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
      <section className="border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div><div className="font-mono text-xs uppercase tracking-widest text-primary">Current releases</div><h2 className="mt-1 text-xl font-light">Ready to download</h2></div>
          <Link to="/portal/downloads" className="inline-flex items-center gap-1 text-sm text-primary">View all <ChevronRight className="h-4 w-4" /></Link>
        </div>
        <div className="divide-y divide-border">
          {portalReleases.slice(0, 3).map((release) => (
            <div key={release.id} className="flex items-center justify-between gap-4 px-6 py-5">
              <div><div className="font-mono text-sm text-primary">{release.tool}</div><div className="mt-1 text-sm text-muted-foreground">Version {release.version}</div></div>
              <Link to="/portal/downloads" className="border border-border px-3 py-2 text-xs font-medium text-slate-700 hover:border-primary hover:text-primary">Download</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-border bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-xs uppercase tracking-widest text-primary">Latest announcement</div>
          {latest && !latest.read && <span className="bg-amber-100 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-amber-800">Unread</span>}
        </div>
        {loadingAnnouncements ? <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading latest update…</div> : latest ? <>
        <div className="mt-5 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>{announcementDate(latest.originalPublishedAt || latest.publishedAt)}</span><span>·</span><span className="text-primary">{latest.category}</span></div>
        <h2 className="mt-4 text-xl font-light leading-snug">{latest.title}</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{latest.summary}</p>
        </> : <p className="mt-4 text-sm text-muted-foreground">No announcements have been published yet.</p>}
        <Link to="/portal/announcements" className="mt-8 inline-flex items-center gap-2 text-sm text-primary">{latest && !latest.read ? "Read latest announcement" : "View announcement archive"} <ChevronRight className="h-4 w-4" /></Link>
      </section>
    </div>
  </div>;
};

const StatusCard = ({ icon: Icon, label, value, note }: { icon: typeof ShieldCheck; label: string; value: string; note: string }) => (
  <div className="border border-border bg-white p-5">
    <div className="flex items-start justify-between"><div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{label}</div><Icon className="h-5 w-5 text-primary" /></div>
    <div className="mt-5 text-3xl font-light text-slate-900">{value}</div>
    <div className="mt-2 text-xs text-muted-foreground">{note}</div>
  </div>
);

type PortalFile = { key: string; size: number; etag: string };
type PortalFolder = { prefix: string; downloadAvailable: boolean };

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${unit}`;
};

const itemName = (key: string) => key.replace(/\/$/, "").split("/").pop() || key;

export const Downloads = ({ demoMode }: { demoMode: boolean }) => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [rootPrefix, setRootPrefix] = useState("NCICT/");
  const [prefix, setPrefix] = useState("NCICT/");
  const [files, setFiles] = useState<PortalFile[]>([]);
  const [folders, setFolders] = useState<PortalFolder[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadFolder = async (nextPrefix: string, nextCursor?: string) => {
    if (demoMode) return;
    setLoading(true);
    setLoadError("");
    try {
      const query = new URLSearchParams({ prefix: nextPrefix });
      if (nextCursor) query.set("cursor", nextCursor);
      const response = await fetch(`/api/files?${query}`, { credentials: "include" });
      if (!response.ok) throw new Error("The file list could not be loaded.");
      const body = await response.json();
      setFiles((current) => nextCursor ? [...current, ...body.objects] : body.objects);
      const nextFolders: PortalFolder[] = (body.folders || []).map((folder: string | PortalFolder) => (
        typeof folder === "string" ? { prefix: folder, downloadAvailable: false } : folder
      ));
      setFolders((current) => nextCursor ? [...current, ...nextFolders] : nextFolders);
      setCursor(body.cursor);
      setPrefix(nextPrefix);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "The file list could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!demoMode) void loadFolder(rootPrefix);
    // rootPrefix is the intentional reload trigger; loadFolder is local to this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, rootPrefix]);

  const chooseTool = (tool: string) => {
    const nextPrefix = `${tool}/`;
    setSearch("");
    if (!demoMode && nextPrefix === rootPrefix) {
      void loadFolder(nextPrefix);
      return;
    }
    setRootPrefix(nextPrefix);
    setPrefix(nextPrefix);
    if (demoMode) {
      toast({ title: "Local preview", description: `${tool} files will be loaded from private R2 storage in the test deployment.` });
    }
  };

  const goUp = () => {
    if (prefix === rootPrefix) return;
    const parent = `${prefix.slice(0, -1).split("/").slice(0, -1).join("/")}/`;
    void loadFolder(parent.startsWith(rootPrefix) ? parent : rootPrefix);
  };

  const downloadFile = (file: PortalFile) => {
    window.location.assign(`/api/download?key=${encodeURIComponent(file.key)}`);
  };

  const downloadFolder = (folder: PortalFolder) => {
    if (!folder.downloadAvailable) return;
    window.location.assign(`/api/folder-download?prefix=${encodeURIComponent(folder.prefix)}`);
  };

  const normalizedSearch = search.trim().toLowerCase();
  const visibleFolders = folders.filter((folder) => itemName(folder.prefix).toLowerCase().includes(normalizedSearch));
  const visibleFiles = files.filter((file) => itemName(file.key).toLowerCase().includes(normalizedSearch));
  const selectedTool = rootPrefix.replace(/\/$/, "");
  const selectedManualUrl = toolManualUrls[selectedTool];
  const supportsFolderDownloads = selectedTool === "PHANTOM" || selectedTool === "DCC";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border border-border bg-white p-5 sm:flex-row sm:items-center">
        <div><div className="text-sm font-medium text-slate-800">Approved research distributions</div><p className="mt-1 text-xs text-muted-foreground">Files are delivered from private NCI Dose Tools storage after each access check.</p></div>
        <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search this folder" className="rounded-none pl-9" /></div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {portalReleases.map((release) => (
          <button key={release.id} type="button" onClick={() => chooseTool(release.tool)} className={cn("border px-4 py-3 text-left transition-colors", rootPrefix === `${release.tool}/` ? "border-primary bg-primary text-white" : "border-border bg-white text-slate-700 hover:border-primary hover:text-primary")}>
            <div className="font-mono text-xs uppercase tracking-wider">{release.tool}</div>
            <div className={cn("mt-1 truncate text-xs", rootPrefix === `${release.tool}/` ? "text-white/75" : "text-muted-foreground")}>{release.name}</div>
          </button>
        ))}
      </div>

      <section className="border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {prefix !== rootPrefix && <Button type="button" variant="outline" size="sm" onClick={goUp} className="shrink-0 rounded-none"><ArrowLeft className="h-4 w-4" /> Up</Button>}
            <div className="min-w-0 truncate font-mono text-xs text-slate-600">/{prefix}</div>
          </div>
          <div className="flex items-center gap-4">
            {!demoMode && <div className="font-mono text-xs text-muted-foreground">{folders.length} folders · {files.length} files</div>}
            {selectedManualUrl && (
              <a href={selectedManualUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                <BookOpen className="h-4 w-4" /> View {selectedTool} manual <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {demoMode ? (
          <div className="p-10 text-center"><Folder className="mx-auto h-9 w-9 text-primary" /><h3 className="mt-4 text-lg font-light">Live file browser ready for test deployment</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">The local preview does not request protected files. After email login, this panel lists the actual contents of the {rootPrefix.replace("/", "")} folder in R2.</p></div>
        ) : loading && files.length === 0 && folders.length === 0 ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading files…</div>
        ) : loadError ? (
          <div className="p-8 text-center"><p className="text-sm text-destructive">{loadError}</p><Button type="button" variant="outline" onClick={() => void loadFolder(prefix)} className="mt-4 rounded-none">Try again</Button></div>
        ) : (
          <div className="divide-y divide-border">
            {visibleFolders.map((folder) => (
              <div key={folder.prefix} className="flex flex-col gap-3 px-6 py-4 hover:bg-slate-50 sm:flex-row sm:items-center">
                <button type="button" onClick={() => void loadFolder(folder.prefix)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-slate-50"><Folder className="h-5 w-5 text-primary" /></div>
                  <div><div className="text-sm font-medium text-slate-800">{itemName(folder.prefix)}</div><div className="mt-1 text-xs text-muted-foreground">Folder</div></div>
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </button>
                {supportsFolderDownloads && (
                  <Button type="button" variant="outline" disabled={!folder.downloadAvailable} onClick={() => downloadFolder(folder)} className="shrink-0 rounded-none">
                    <Download className="h-4 w-4" /> {folder.downloadAvailable ? "Download folder" : "Folder download pending"}
                  </Button>
                )}
              </div>
            ))}
            {visibleFiles.map((file) => (
              <div key={file.key} className="flex flex-col justify-between gap-4 px-6 py-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-slate-50"><FileArchive className="h-5 w-5 text-primary" /></div><div className="min-w-0"><div className="break-words text-sm font-medium text-slate-800">{itemName(file.key)}</div><div className="mt-1 text-xs text-muted-foreground">{formatBytes(file.size)}</div></div></div>
                <Button type="button" onClick={() => downloadFile(file)} className="shrink-0 rounded-none"><Download className="h-4 w-4" /> Download</Button>
              </div>
            ))}
            {!loading && visibleFolders.length === 0 && visibleFiles.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">No files found in this folder.</div>}
          </div>
        )}
        {cursor && !loadError && <div className="border-t border-border p-4 text-center"><Button type="button" variant="outline" disabled={loading} onClick={() => void loadFolder(prefix, cursor)} className="rounded-none">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Load more</Button></div>}
      </section>
    </div>
  );
};

type LiveAnnouncement = {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: "Release" | "Maintenance" | "Access";
  audience: "approved_users" | "public";
  status: "draft" | "published";
  originalPublishedAt: string | null;
  publishedAt: string | null;
  sourceUrl: string | null;
  read: boolean;
  emailDelivery: {
    status: "queued" | "sent" | "failed";
    recipientCount: number | null;
    providerBroadcastId: string | null;
  } | null;
};

const announcementDate = (value: string | null) => {
  if (!value) return "Date not specified";
  const normalized = value.length === 10 ? `${value}T12:00:00` : value.includes(" ") ? `${value.replace(" ", "T")}Z` : value;
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(new Date(normalized));
};

const portalTimestamp = (value: string) => {
  const normalized = value.includes(" ") ? `${value.replace(" ", "T")}Z` : value;
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const latestPortalTimestamp = (left: string | null | undefined, right: string | null | undefined) => {
  if (!left) return right || null;
  if (!right) return left;
  return portalTimestamp(right) > portalTimestamp(left) ? right : left;
};

const activityDate = (value: string) => {
  const normalized = value.includes(" ") ? `${value.replace(" ", "T")}Z` : value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(normalized));
};

const Announcements = ({ demoMode }: { demoMode: boolean }) => {
  const [announcements, setAnnouncements] = useState<LiveAnnouncement[]>([]);
  const [loading, setLoading] = useState(!demoMode);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (demoMode) return;
    fetch("/api/announcements", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Announcements could not be loaded.");
        const body = await response.json();
        setAnnouncements(body.announcements);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Announcements could not be loaded."))
      .finally(() => setLoading(false));
  }, [demoMode]);

  const demoAnnouncements: LiveAnnouncement[] = portalAnnouncements.map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    summary: announcement.summary,
    body: announcement.summary,
    category: announcement.category,
    audience: announcement.audience === "Public" ? "public" : "approved_users",
    status: "published",
    originalPublishedAt: announcement.date,
    publishedAt: null,
    sourceUrl: null,
    read: !announcement.unread,
    emailDelivery: null,
  }));
  const items = demoMode ? demoAnnouncements : announcements;
  const selected = items.find((announcement) => announcement.id === selectedId) || items[0];

  useEffect(() => {
    if (!selectedId && items[0]) setSelectedId(items[0].id);
  }, [items, selectedId]);

  useEffect(() => {
    if (demoMode || !selected || selected.read) return;
    const id = selected.id;
    setAnnouncements((current) => current.map((announcement) => announcement.id === id ? { ...announcement, read: true } : announcement));
    fetch(`/api/announcements/${encodeURIComponent(id)}/read`, {
      method: "POST",
      credentials: "include",
    }).then((response) => {
      if (!response.ok) throw new Error("Announcement could not be marked as read.");
    }).catch(() => {
      setAnnouncements((current) => current.map((announcement) => announcement.id === id ? { ...announcement, read: false } : announcement));
    });
  }, [demoMode, selected]);

  const selectAnnouncement = (id: string) => {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      window.setTimeout(() => document.getElementById("announcement-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    }
  };

  const dateLabel = (announcement: LiveAnnouncement) => demoMode
    ? announcement.originalPublishedAt
    : announcementDate(announcement.originalPublishedAt || announcement.publishedAt);

  return (
    <div>
      {loading ? <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading announcements…</div>
        : error ? <div className="p-10 text-center text-sm text-destructive">{error}</div>
          : items.length === 0 ? <div className="border border-border bg-white p-12 text-center"><Megaphone className="mx-auto h-8 w-8 text-primary" /><h2 className="mt-4 text-lg font-light">No announcements have been published yet.</h2><p className="mt-2 text-sm text-muted-foreground">New portal announcements will appear here.</p></div>
            : <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start">
              <section className="border border-border bg-white">
                <div className="border-b border-border px-5 py-4"><div className="font-mono text-xs uppercase tracking-widest text-primary">Announcement archive</div><p className="mt-2 text-xs text-muted-foreground">Select an announcement to read the full post.</p></div>
                <div className="divide-y divide-border">
                  {items.map((announcement, index) => (
                    <button key={announcement.id} type="button" onClick={() => selectAnnouncement(announcement.id)} className={cn("block w-full px-5 py-5 text-left transition-colors", selected?.id === announcement.id ? "bg-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]" : "hover:bg-slate-50")}>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>{dateLabel(announcement)}</span><span>·</span><span className="text-primary">{announcement.category}</span><span className="ml-auto flex items-center gap-2">{!announcement.read && <span className="bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">Unread</span>}{index === 0 && <span className="bg-primary px-2 py-0.5 text-[10px] text-white">Latest</span>}</span></div>
                      <h2 className={cn("mt-2 text-sm leading-snug", selected?.id === announcement.id ? "font-medium text-slate-900" : "text-slate-700")}>{announcement.title}</h2>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{announcement.summary}</p>
                    </button>
                  ))}
                </div>
              </section>

              {selected && <article id="announcement-detail" className="scroll-mt-24 border border-border bg-white p-6 sm:p-8 xl:sticky xl:top-24">
                <div className="flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-wider text-muted-foreground"><span>{dateLabel(selected)}</span><span className="border border-primary/20 bg-primary/5 px-2 py-1 text-primary">{selected.category}</span></div>
                <h2 className="mt-5 text-2xl font-light leading-tight text-slate-900 sm:text-3xl">{selected.title}</h2>
                <div className="mt-6 space-y-4 border-t border-border pt-6 text-sm leading-7 text-slate-700"><AnnouncementBody>{selected.body}</AnnouncementBody></div>
                <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-border pt-5 font-mono text-xs uppercase tracking-wider text-slate-400"><span>{selected.audience === "approved_users" ? "Approved users" : "Public"}</span>{selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Original Google Groups post <ExternalLink className="h-3 w-3" /></a>}</div>
              </article>}
            </div>}
    </div>
  );
};

const PortalDiscussionReply = ({ answer, depth, onReply }: { answer: QuestionAnswerThread; depth: number; onReply?: (answer: QuestionAnswerThread) => void }) => (
  <div className={cn(depth > 0 && "ml-4 border-l border-slate-200 pl-4 sm:ml-7 sm:pl-5")}>
    <div className={cn("border p-4", answer.responseType === "team" ? "border-sky-200 bg-sky-50" : "border-border bg-white")}>
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-wider"><span className="normal-case text-primary">{questionAnswerLabel(answer)}</span><span className="text-slate-400">{announcementDate(answer.createdAt)}</span></div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{answer.body}</p>
      {answer.attachments.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{answer.attachments.map((attachment) => <a key={attachment.id} href={`/api/attachments/${attachment.id}`} className="inline-flex items-center gap-2 border border-border bg-white px-3 py-2 text-xs text-primary"><Paperclip className="h-3.5 w-3.5" /> {attachment.fileName}</a>)}</div>}
      {onReply && <button type="button" onClick={() => onReply(answer)} className="mt-4 text-xs font-medium text-primary hover:underline">Reply to this message</button>}
    </div>
    {answer.children.length > 0 && <div className="mt-3 space-y-3">{answer.children.map((child) => <PortalDiscussionReply key={child.id} answer={child} depth={depth + 1} onReply={onReply} />)}</div>}
  </div>
);

const PortalQuestions = ({ demoMode }: { demoMode: boolean }) => {
  const { toast } = useToast();
  const location = useLocation();
  const requestedDiscussion = new URLSearchParams(location.search).get("discussion");
  const [questions, setQuestions] = useState<ManagedQuestion[]>([]);
  const [loading, setLoading] = useState(!demoMode);
  const [submitting, setSubmitting] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [requestType, setRequestType] = useState<QuestionRequestType>("technical_question");
  const [tool, setTool] = useState<QuestionTool>("General");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<QuestionVisibility>("public_after_review");
  const [files, setFiles] = useState<File[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(requestedDiscussion);
  const [replyParent, setReplyParent] = useState<QuestionAnswerThread | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [query, setQuery] = useState("");

  const loadDiscussions = async () => {
    const response = await fetch("/api/questions", { credentials: "include" });
    if (!response.ok) throw new Error("Discussions could not be loaded.");
    const payload = await response.json();
    setQuestions(payload.questions || []);
    return payload.questions || [];
  };

  useEffect(() => {
    if (demoMode) return;
    loadDiscussions()
      .then((items) => setSelectedQuestionId((current) => current || items[0]?.id || null))
      .catch((error) => toast({ title: "Unable to load discussions", description: error instanceof Error ? error.message : undefined, variant: "destructive" }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode]);

  const submitQuestion = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    const fileError = qaAttachmentError(files);
    if (fileError) return void toast({ title: "Check attachments", description: fileError, variant: "destructive" });
    if (demoMode) return void toast({ title: "Local preview", description: "Approved users can publish this discussion." });
    setSubmitting(true);
    try {
      const response = await fetch("/api/questions", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestType, tool: requestType === "feature_request" ? "General" : tool, title, body, visibility }) });
      const payload = await response.json();
      if (!response.ok) throw new Error("The discussion could not be posted.");
      const uploaded = [];
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const attachmentResponse = await fetch(`/api/questions/${payload.question.id}/attachments`, { method: "POST", credentials: "include", body: form });
        if (!attachmentResponse.ok) throw new Error(`The discussion was posted, but ${file.name} could not be attached.`);
        uploaded.push((await attachmentResponse.json()).attachment);
      }
      payload.question.attachments = uploaded;
      setQuestions((current) => [payload.question, ...current.filter((item) => item.id !== payload.question.id)]);
      setSelectedQuestionId(payload.question.id);
      setTitle(""); setBody(""); setTool("General"); setRequestType("technical_question"); setVisibility("public_after_review"); setFiles([]);
      toast({ title: visibility === "team_only" ? "Private discussion sent" : "Discussion published", description: visibility === "team_only" ? "Only you and the NCI Dose Team can view and reply." : "The discussion is now readable publicly; only approved users can reply." });
    } catch (error) {
      toast({ title: "Unable to post discussion", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const submitReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedQuestionId || !replyBody.trim()) return;
    const fileError = qaAttachmentError(replyFiles);
    if (fileError) return void toast({ title: "Check attachments", description: fileError, variant: "destructive" });
    if (demoMode) return void toast({ title: "Local preview", description: "The reply would be added to this discussion." });
    setSubmittingReply(true);
    try {
      const response = await fetch(`/api/questions/${selectedQuestionId}/replies`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: replyBody, parentAnswerId: replyParent?.id || null }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error === "discussion_not_available" ? "This discussion is closed." : "The reply could not be posted.");
      const uploaded = [];
      for (const file of replyFiles) {
        const form = new FormData();
        form.append("file", file);
        const attachmentResponse = await fetch(`/api/questions/${selectedQuestionId}/replies/${payload.answer.id}/attachments`, { method: "POST", credentials: "include", body: form });
        if (!attachmentResponse.ok) throw new Error(`The reply was posted, but ${file.name} could not be attached.`);
        uploaded.push((await attachmentResponse.json()).attachment);
      }
      payload.answer.attachments = uploaded;
      payload.question.answers = payload.question.answers.map((answer: QuestionAnswerThread) => answer.id === payload.answer.id ? payload.answer : answer);
      setQuestions((current) => current.map((question) => question.id === payload.question.id ? payload.question : question));
      setReplyBody(""); setReplyParent(null); setReplyFiles([]);
      toast({ title: "Reply posted" });
    } catch (error) {
      toast({ title: "Unable to post reply", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSubmittingReply(false);
    }
  };

  const selected = questions.find((question) => question.id === selectedQuestionId);
  const filtered = questions.filter((question) => !query.trim() || `${question.title} ${question.body}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="space-y-8">
      <section className="border border-border bg-white p-6 sm:p-8">
        <div className="flex items-start gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary text-primary"><MessageCircleQuestion className="h-5 w-5" /></div><div><div className="font-mono text-xs uppercase tracking-widest text-primary">Approved-user community</div><h2 className="mt-2 text-xl font-light">Start a discussion</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Post a technical question, bug report, or feature request. Public discussions can be read by anyone, but only approved users can post or reply.</p></div></div>
        <form onSubmit={submitQuestion} className="mt-7 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Discussion type</span><select value={requestType} onChange={(event) => setRequestType(event.target.value as QuestionRequestType)} className="mt-2 h-11 w-full rounded-none border border-input bg-white px-3 text-sm">{questionRequestTypes.map((item) => <option key={item} value={item}>{questionRequestTypeLabels[item]}</option>)}</select></label>{requestType !== "feature_request" && <label className="block"><span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Tool</span><select value={tool} onChange={(event) => setTool(event.target.value as QuestionTool)} className="mt-2 h-11 w-full rounded-none border border-input bg-white px-3 text-sm">{questionTools.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}</select></label>}</div>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} placeholder="Discussion title" className="h-11 rounded-none" required />
          <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={12000} placeholder={requestType === "bug_report" ? "Describe the problem, software version, steps to reproduce it, and any error message." : requestType === "feature_request" ? "Describe the proposed feature, use case, and how it would improve your work." : "Describe your question and any relevant inputs or software version."} className="min-h-40 w-full border border-input bg-background p-3 text-sm outline-none focus:border-primary" required />
          <fieldset className="border border-border bg-slate-50 p-4"><legend className="px-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">Visibility</legend><div className="grid gap-3 sm:grid-cols-2"><label className={cn("cursor-pointer border bg-white p-4", visibility === "public_after_review" ? "border-primary ring-1 ring-primary" : "border-border")}><span className="flex items-start gap-3"><input type="radio" checked={visibility === "public_after_review"} onChange={() => setVisibility("public_after_review")} className="mt-1 accent-sky-600" /><span><span className="block text-sm font-medium text-slate-800">Public discussion</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Published immediately. Anyone can read; approved users can reply.</span></span></span></label><label className={cn("cursor-pointer border bg-white p-4", visibility === "team_only" ? "border-primary ring-1 ring-primary" : "border-border")}><span className="flex items-start gap-3"><input type="radio" checked={visibility === "team_only"} onChange={() => setVisibility("team_only")} className="mt-1 accent-sky-600" /><span><span className="block text-sm font-medium text-slate-800">NCI Dose Team only</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Visible only to you and designated NCI Dose Team members.</span></span></span></label></div></fieldset>
          <div className="border border-dashed border-sky-200 bg-sky-50/50 p-4"><label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary"><Paperclip className="h-4 w-4" /> Attach files<input type="file" multiple accept={qaAttachmentAccept} className="sr-only" onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, qaAttachmentMaximumCount))} /></label><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Up to 3 files, 10 MB each. Do not include patient information or confidential data.</p>{files.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{files.map((file) => <span key={`${file.name}-${file.size}`} className="border border-sky-200 bg-white px-2 py-1 text-xs text-slate-600">{file.name} · {attachmentSize(file.size)}</span>)}</div>}</div>
          <div className="flex justify-end"><Button type="submit" disabled={submitting || !title.trim() || !body.trim()} className="rounded-none">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Post discussion</Button></div>
        </form>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
        <section className="border border-border bg-white"><div className="border-b border-border p-5"><div className="font-mono text-xs uppercase tracking-widest text-primary">Discussion board</div><h2 className="mt-2 text-xl font-light">Community conversations</h2><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search discussions" className="mt-4 rounded-none" /></div>{loading ? <div className="flex items-center justify-center gap-3 p-10 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading discussions…</div> : filtered.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No matching discussions.</div> : <div className="max-h-[760px] divide-y divide-border overflow-y-auto">{filtered.map((question) => <button key={question.id} type="button" onClick={() => { setSelectedQuestionId(question.id); setReplyParent(null); setReplyBody(""); }} className={cn("block w-full p-5 text-left hover:bg-sky-50", selectedQuestionId === question.id && "bg-sky-50")}><div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase text-primary"><span>{question.pinned && <Pin className="mr-1 inline h-3 w-3" />}{questionRequestTypeLabels[question.requestType]}</span><span className={question.visibility === "team_only" ? "text-violet-700" : "text-slate-400"}>{question.visibility === "team_only" ? "Team only" : `${question.answers.length} replies`}</span></div><div className="mt-2 text-sm font-medium text-slate-800">{question.title}</div><div className="mt-2 text-xs text-muted-foreground">{questionAuthorLabel(question)}</div></button>)}</div>}</section>

        <section className="border border-border bg-white p-6 sm:p-8">{!selected ? <div className="flex min-h-[320px] flex-col items-center justify-center text-center"><MessageCircleQuestion className="h-8 w-8 text-slate-300" /><p className="mt-4 text-sm text-muted-foreground">Select a discussion to read and reply.</p></div> : <div>{selected.visibility === "team_only" && <div className="mb-5 border border-violet-200 bg-violet-50 p-3 text-xs text-violet-800">Private conversation — visible only to the author and NCI Dose Team members.</div>}<div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-primary"><span>{questionRequestTypeLabels[selected.requestType]}</span>{selected.requestType !== "feature_request" && <span>{selected.tool}</span>}<span className="text-slate-400">{announcementDate(selected.createdAt)}</span><span className="normal-case">{questionAuthorLabel(selected)}</span></div><h2 className="mt-4 text-2xl font-light text-slate-950">{selected.title}</h2><p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">{selected.body}</p>{selected.attachments.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{selected.attachments.map((attachment) => <a key={attachment.id} href={`/api/attachments/${attachment.id}`} className="inline-flex items-center gap-2 border border-border bg-slate-50 px-3 py-2 text-xs text-primary"><Paperclip className="h-3.5 w-3.5" /> {attachment.fileName}</a>)}</div>}<button type="button" onClick={() => { setReplyParent(null); setReplyBody(""); }} className="mt-5 text-sm font-medium text-primary hover:underline">Reply to discussion</button><div className="mt-8 space-y-4 border-t border-border pt-6">{buildAnswerThreads(selected.answers).map((answer) => <PortalDiscussionReply key={answer.id} answer={answer} depth={0} onReply={(item) => { setReplyParent(item); setReplyBody(""); }} />)}{selected.answers.length === 0 && <p className="text-sm text-muted-foreground">No replies yet. Approved users can start the conversation below.</p>}</div><form onSubmit={submitReply} className="mt-8 border border-sky-200 bg-sky-50/40 p-5"><div className="flex items-center justify-between gap-3"><div><div className="font-mono text-xs uppercase tracking-widest text-primary">{replyParent ? "Reply to message" : "Reply to discussion"}</div>{replyParent && <p className="mt-1 text-xs text-muted-foreground">Responding to {questionAnswerLabel(replyParent)}</p>}</div>{replyParent && <button type="button" onClick={() => setReplyParent(null)} className="text-xs text-slate-500 hover:text-primary">Reply to main post instead</button>}</div><textarea value={replyBody} onChange={(event) => setReplyBody(event.target.value)} maxLength={20000} placeholder="Write your reply" className="mt-4 min-h-32 w-full border border-input bg-white p-3 text-sm outline-none focus:border-primary" required /><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="inline-flex cursor-pointer items-center gap-2 text-xs text-primary"><Paperclip className="h-4 w-4" /> Attach files<input type="file" multiple accept={qaAttachmentAccept} className="sr-only" onChange={(event) => setReplyFiles(Array.from(event.target.files || []).slice(0, qaAttachmentMaximumCount))} /></label><Button type="submit" disabled={submittingReply || !replyBody.trim()} className="rounded-none">{submittingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Post reply</Button></div>{replyFiles.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{replyFiles.map((file) => <span key={`${file.name}-${file.size}`} className="border border-sky-200 bg-white px-2 py-1 text-xs text-slate-600">{file.name} · {attachmentSize(file.size)}</span>)}</div>}</form>{selected.status === "published" && <a href={`${publicSiteUrl}discussions/${selected.id}`} className="mt-6 inline-flex text-xs text-primary hover:underline">Open public discussion</a>}</div>}</section>
      </div>
    </div>
  );
};

const Account = ({
  user,
  setUser,
  demoMode,
  onSignOut,
}: {
  user: PortalUser;
  setUser: (user: PortalUser) => void;
  demoMode: boolean;
  onSignOut: () => Promise<void>;
}) => {
  const { toast } = useToast();
  const [newEmail, setNewEmail] = useState("");
  const [profileName, setProfileName] = useState(user.name);
  const [profileInstitution, setProfileInstitution] = useState(user.institution);
  const [profileCountry, setProfileCountry] = useState(user.country || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [removingEmailId, setRemovingEmailId] = useState<string | null>(null);
  const [changingPrimaryEmailId, setChangingPrimaryEmailId] = useState<string | null>(null);
  const additionalIdentity = user.identities.find((identity) => !identity.primary);

  const saveProfile = async () => {
    if (demoMode) {
      setUser({ ...user, name: profileName.trim() || user.primaryEmail.split("@")[0], institution: profileInstitution.trim(), country: profileCountry.trim() });
      toast({ title: "Profile updated" });
      return;
    }
    setSavingProfile(true);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: profileName, institution: profileInstitution, country: profileCountry }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error("The profile could not be saved.");
      setUser({ ...user, name: body.profile.name || user.primaryEmail.split("@")[0], institution: body.profile.institution || "", country: body.profile.country || "" });
      toast({ title: "Profile updated", description: "Your information is now visible in the administrator directory." });
    } catch (error) {
      toast({ title: "Unable to update profile", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const addEmail = async () => {
    if (!newEmail.includes("@")) return;
    if (demoMode) {
      const identity: PortalIdentity = { id: "preview-email", provider: "Added email", email: newEmail.trim().toLowerCase(), verified: false, primary: false };
      setUser({ ...user, identities: [...user.identities, identity] });
      setNewEmail("");
      return;
    }
    setSavingEmail(true);
    try {
      const response = await fetch("/api/account/emails", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });
      const body = await response.json();
      if (!response.ok) {
        const message = body.error === "email_in_use" ? "That email is already linked to another account."
          : body.error === "additional_email_limit" ? "Only one additional email can be linked."
            : body.error === "email_already_linked" ? "That email is already linked to your account."
              : "The email could not be added.";
        throw new Error(message);
      }
      setUser({ ...user, identities: [...user.identities, body.identity] });
      setNewEmail("");
      toast({
        title: body.confirmationEmail?.status === "sent" ? "Email added and confirmation sent" : "Email added",
        description: body.confirmationEmail?.status === "failed"
          ? "The email is linked, but the confirmation message could not be sent. Sign out, then sign in with the new email to verify it."
          : "A confirmation message was sent to the new email. Sign out, then sign in with it to verify the address.",
      });
    } catch (error) {
      toast({ title: "Unable to add email", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSavingEmail(false);
    }
  };

  const removeEmail = async (identity: PortalIdentity) => {
    if (demoMode) {
      setUser({ ...user, identities: user.identities.filter((entry) => entry.id !== identity.id) });
      return;
    }
    setRemovingEmailId(identity.id);
    try {
      const response = await fetch(`/api/account/emails/${identity.id}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) throw new Error("The email could not be removed.");
      setUser({ ...user, identities: user.identities.filter((entry) => entry.id !== identity.id) });
      toast({ title: "Additional email removed" });
    } catch (error) {
      toast({ title: "Unable to remove email", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setRemovingEmailId(null);
    }
  };

  const makePrimaryEmail = async (identity: PortalIdentity) => {
    if (!identity.verified || identity.primary) return;
    if (demoMode) {
      const next = selectPrimaryPortalIdentity(user.identities, identity.id);
      if (next) setUser({ ...user, ...next });
      toast({ title: "Primary email updated", description: `${identity.email} is now your primary email.` });
      return;
    }
    setChangingPrimaryEmailId(identity.id);
    try {
      const response = await fetch(`/api/account/emails/${identity.id}/primary`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
      });
      const body = await response.json();
      if (!response.ok) {
        const message = body.error === "email_verification_required"
          ? "Verify this email by signing in with it before making it primary."
          : "The primary email could not be changed.";
        throw new Error(message);
      }
      setUser({ ...user, primaryEmail: body.primaryEmail, identities: body.identities });
      toast({ title: "Primary email updated", description: `${body.primaryEmail} is now your primary email. Both linked emails can still be used to sign in.` });
    } catch (error) {
      toast({ title: "Unable to change primary email", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setChangingPrimaryEmailId(null);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <section className="border border-border bg-white p-6 sm:p-8">
        <div className="flex items-start gap-4"><div className="flex h-12 w-12 items-center justify-center border border-primary text-primary"><UserRoundCheck className="h-6 w-6" /></div><div><h2 className="text-xl font-light">Approved access</h2><p className="mt-1 text-sm text-muted-foreground">Your existing approval has been carried into the portal.</p></div></div>
        <dl className="mt-8 grid gap-5 border-t border-border pt-6 sm:grid-cols-2">
          <div><dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Status</dt><dd className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-emerald-700"><Check className="h-4 w-4" /> {user.staStatus}</dd></div>
          <div><dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Approved</dt><dd className="mt-2 text-sm text-slate-800">{user.staApprovedOn}</dd></div>
          <div><dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Institution</dt><dd className="mt-2 text-sm text-slate-800">{user.institution || "Not provided"}</dd></div>
          <div><dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Primary email</dt><dd className="mt-2 text-sm text-slate-800">{user.primaryEmail}</dd></div>
        </dl>
      </section>

      <section className="border border-border bg-white p-6 sm:p-8">
        <div className="font-mono text-xs uppercase tracking-widest text-primary">Login methods</div>
        <div className="mt-5 space-y-3">
          {user.identities.map((identity) => (
            <div key={identity.id} className="border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-800">{identity.email}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{identity.primary ? "Primary email" : "Secondary email"} · {identity.verified ? "Verified" : "Verification required"}</div>
                </div>
                <span className={cn("px-2 py-1 font-mono text-xs", identity.primary ? "bg-primary/10 text-primary" : identity.verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>{identity.primary ? "Primary" : identity.verified ? "Verified" : "Pending"}</span>
              </div>
              {!identity.primary && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
                  {identity.verified && (
                    <button type="button" disabled={changingPrimaryEmailId === identity.id} onClick={() => void makePrimaryEmail(identity)} className="font-medium text-primary hover:underline disabled:opacity-50">
                      {changingPrimaryEmailId === identity.id ? "Updating…" : "Make primary"}
                    </button>
                  )}
                  <button type="button" disabled={removingEmailId === identity.id || changingPrimaryEmailId === identity.id} onClick={() => void removeEmail(identity)} className="text-slate-500 hover:text-destructive disabled:opacity-50">
                    {removingEmailId === identity.id ? "Removing…" : "Remove secondary email"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="border border-border bg-white p-6 sm:p-8 xl:col-span-2">
        <div className="flex items-start gap-4"><div className="flex h-10 w-10 items-center justify-center border border-primary text-primary"><CircleUserRound className="h-5 w-5" /></div><div><h2 className="text-lg font-medium">Profile information</h2><p className="mt-1 text-sm text-muted-foreground">Optional. These details help the portal administrator maintain the approved-user directory.</p></div></div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Input value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Full name" disabled={savingProfile} className="rounded-none" />
          <Input value={profileInstitution} onChange={(event) => setProfileInstitution(event.target.value)} placeholder="Institution" disabled={savingProfile} className="rounded-none" />
          <Input value={profileCountry} onChange={(event) => setProfileCountry(event.target.value)} placeholder="Country" disabled={savingProfile} className="rounded-none" />
        </div>
        <div className="mt-4 flex justify-end"><Button type="button" variant="outline" disabled={savingProfile} onClick={() => void saveProfile()} className="rounded-none">{savingProfile && <Loader2 className="h-4 w-4 animate-spin" />} Save profile</Button></div>
      </section>

      <section className="border border-border bg-white p-6 sm:p-8 xl:col-span-2">
        <div className="flex items-start gap-4"><div className="flex h-10 w-10 items-center justify-center border border-primary text-primary"><Mail className="h-5 w-5" /></div><div><h2 className="text-lg font-medium">Add a secondary email</h2><p className="mt-1 text-sm text-muted-foreground">Optional: link one additional work or personal email without changing your STA approval or download history.</p></div></div>
        <div className="mt-6 max-w-xl">
          {!additionalIdentity ? (
            <div className="flex flex-col gap-2 sm:flex-row"><Input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="secondary@email.com" disabled={savingEmail} className="rounded-none" /><Button variant="outline" disabled={!newEmail.includes("@") || savingEmail} onClick={() => void addEmail()} className="shrink-0 rounded-none">{savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add email</Button></div>
          ) : !additionalIdentity.verified ? (
            <div className="border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2 text-sm text-amber-900"><Mail className="mt-0.5 h-4 w-4 shrink-0" /><p>To verify <strong>{additionalIdentity.email}</strong>, sign out and return to the User Portal using that email. A one-time code will be sent to that address.</p></div>
              <Button type="button" variant="outline" onClick={() => void onSignOut()} className="mt-4 rounded-none border-amber-300 bg-white">Sign out to verify</Button>
            </div>
          ) : (
            <div className="flex items-start gap-2 border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><Check className="mt-0.5 h-4 w-4 shrink-0" /><p>{additionalIdentity.email} is verified. You can now sign in with either email.</p></div>
          )}
        </div>
      </section>
    </div>
  );
};

type ManagedPortalUser = {
  id: string;
  name: string | null;
  institution: string | null;
  country: string | null;
  role: "user" | "admin";
  discussionRole: "community" | "team";
  discussionHandle: string | null;
  accessStatus: "active" | "suspended";
  approvalSource: string;
  approvedAt: string | null;
  groupJoinedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  identities: PortalIdentity[];
};

type UnmatchedLoginAttempt = {
  email: string;
  requestCount: number;
  firstRequestedAt: string;
  latestRequestedAt: string;
};

type AdminActivityData = {
  summary: {
    downloadsToday: number;
    downloads7Days: number;
    downloads30Days: number;
    downloadUsers30Days: number;
    logins30Days: number;
  };
  tools: Array<{ tool: string; downloads: number }>;
  files: Array<{ file: string; downloads: number }>;
  recent: Array<{ id: string; userId: string | null; eventType: "login" | "download"; file: string | null; occurredAt: string; name: string | null; email: string | null }>;
};

type EmailAudienceStatus = {
  configured: boolean;
  approvedCount: number;
  segmentCount: number;
  pendingAdds: number;
  pendingRemovals: number;
};

type UserSortKey = "name" | "email" | "joined" | "lastLogin";

const emptyAdminActivity: AdminActivityData = {
  summary: { downloadsToday: 0, downloads7Days: 0, downloads30Days: 0, downloadUsers30Days: 0, logins30Days: 0 },
  tools: [],
  files: [],
  recent: [],
};

const AdminQuestions = ({ demoMode }: { demoMode: boolean }) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<ManagedQuestion[]>([]);
  const [loading, setLoading] = useState(!demoMode);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<QuestionRequestType>("technical_question");
  const [pinned, setPinned] = useState(false);
  const [tool, setTool] = useState<QuestionTool>("General");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerFiles, setAnswerFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "submitted" | "published" | "archived">("submitted");

  const load = async () => {
    if (demoMode) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/admin/questions", { credentials: "include" });
      if (!response.ok) throw new Error("Questions could not be loaded.");
      const payload = await response.json();
      setQuestions(payload.questions || []);
    } catch (error) {
      toast({ title: "Unable to load discussions", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // The admin queue is loaded once when this tab is mounted.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [demoMode]);

  const selectQuestion = (question: ManagedQuestion) => {
    setSelectedId(question.id);
    setRequestType(question.requestType);
    setPinned(question.pinned);
    setTool(question.tool);
    setTitle(question.title);
    setBody(question.body);
    setAnswer("");
    setAnswerFiles([]);
  };

  const save = async (status: ManagedQuestion["status"]) => {
    if (!selectedId || !title.trim() || !body.trim()) return;
    const selectedQuestion = questions.find((item) => item.id === selectedId);
    if (status === "published" && selectedQuestion?.visibility === "team_only") {
      toast({ title: "This conversation must remain private", description: "Save the response as a draft so the submitting user can read it in the User Portal.", variant: "destructive" });
      return;
    }
    const fileError = qaAttachmentError(answerFiles);
    if (fileError) {
      toast({ title: "Check attachments", description: fileError, variant: "destructive" });
      return;
    }
    if (status === "published" && !answer.trim() && !questions.find((item) => item.id === selectedId)?.answers.length) {
      toast({ title: "Add an answer before publishing", variant: "destructive" });
      return;
    }
    if (demoMode) {
      toast({ title: "Local preview", description: `The discussion would be saved as ${status}.` });
      return;
    }
    setSaving(true);
    try {
      if (answer.trim()) {
        const answerResponse = await fetch(`/api/admin/questions/${selectedId}/answer`, {
          method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: answer }),
        });
        if (!answerResponse.ok) throw new Error("The answer could not be saved.");
        const answerPayload = await answerResponse.json();
        const answerId = answerPayload.answer?.id;
        if (!answerId) throw new Error("The new response could not be identified.");
        for (const file of answerFiles) {
          const form = new FormData();
          form.append("file", file);
          const attachmentResponse = await fetch(`/api/questions/${selectedId}/replies/${answerId}/attachments`, { method: "POST", credentials: "include", body: form });
          if (!attachmentResponse.ok) throw new Error(`The answer was saved, but ${file.name} could not be attached.`);
        }
      }
      const response = await fetch(`/api/admin/questions/${selectedId}`, {
        method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestType, pinned, tool: requestType === "feature_request" ? "General" : tool, title, body, status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error === "answer_required_before_publishing" ? "Add a response before publishing." : payload.error === "team_only_question_cannot_be_published" ? "This conversation is restricted to the submitting user and the NCI Dose Team." : "The discussion could not be saved.");
      setQuestions((current) => current.map((item) => item.id === payload.question.id ? payload.question : item));
      selectQuestion(payload.question);
      toast({ title: status === "published" ? "Discussion published" : status === "archived" ? "Discussion archived" : "Discussion saved" });
    } catch (error) {
      toast({ title: "Unable to save discussion", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const visible = questions.filter((question) => filter === "all" || question.status === filter || (filter === "submitted" && question.status === "draft"));
  const selected = questions.find((question) => question.id === selectedId);

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section className="border border-border bg-white">
        <div className="border-b border-border p-5"><div className="font-mono text-xs uppercase tracking-widest text-primary">Moderation</div><h2 className="mt-2 text-xl font-light">Discussions</h2><select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="mt-4 h-10 w-full rounded-none border border-input bg-white px-3 text-sm"><option value="submitted">Needs review</option><option value="published">Published</option><option value="archived">Archived</option><option value="all">All discussions</option></select></div>
        {loading ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          : visible.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No discussions in this view.</div>
            : <div className="max-h-[720px] divide-y divide-border overflow-y-auto">{visible.map((question) => <button key={question.id} type="button" onClick={() => selectQuestion(question)} className={cn("block w-full p-5 text-left transition-colors hover:bg-sky-50", selectedId === question.id && "bg-sky-50")}><div className="flex items-center justify-between gap-3"><span className="font-mono text-[11px] uppercase text-primary">{question.pinned && <Pin className="mr-1 inline h-3 w-3" />}{questionRequestTypeLabels[question.requestType]}{question.requestType !== "feature_request" && ` · ${question.tool}`}</span><span className="font-mono text-[10px] uppercase text-muted-foreground">{question.visibility === "team_only" ? "Team only" : question.status}</span></div><div className="mt-2 text-sm font-medium text-slate-800">{question.title}</div>{question.submitter && <div className="mt-2 truncate text-xs text-muted-foreground">{question.submitter.name || question.submitter.email}{question.submitter.institution ? ` · ${question.submitter.institution}` : ""}</div>}</button>)}</div>}
      </section>

      <section className="border border-border bg-white p-6 sm:p-8">
        {!selected ? <div className="flex min-h-[360px] flex-col items-center justify-center text-center"><MessageCircleQuestion className="h-8 w-8 text-slate-300" /><h2 className="mt-4 text-xl font-light">Select a discussion</h2><p className="mt-2 max-w-sm text-sm text-muted-foreground">Moderate public discussions and respond to private conversations.</p></div>
          : <div className="space-y-5"><div><div className="font-mono text-xs uppercase tracking-widest text-primary">Discussion editor</div><h2 className="mt-2 text-xl font-light">Review and moderate</h2>{selected.submitter && <p className="mt-2 text-xs text-muted-foreground">Submitted by {selected.submitter.name || selected.submitter.email} · contact information remains private.</p>}</div>
            {selected.visibility === "team_only" && <div className="border border-violet-200 bg-violet-50 p-4 text-sm leading-relaxed text-violet-900"><strong>NCI Dose Team only.</strong> The submitting user and designated NCI Dose Team members can view this conversation. It cannot be published publicly.</div>}
            <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Request type</span><select value={requestType} onChange={(event) => setRequestType(event.target.value as QuestionRequestType)} className="mt-2 h-10 w-full rounded-none border border-input bg-white px-3 text-sm">{questionRequestTypes.map((item) => <option key={item} value={item}>{questionRequestTypeLabels[item]}</option>)}</select></label>{requestType !== "feature_request" && <label className="block"><span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Tool</span><select value={tool} onChange={(event) => setTool(event.target.value as QuestionTool)} className="mt-2 h-10 w-full rounded-none border border-input bg-white px-3 text-sm">{questionTools.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}</select></label>}</div>
            {requestType === "feature_request" && <label className="flex items-center gap-3 border border-sky-100 bg-sky-50 p-3 text-sm text-slate-700"><input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} className="h-4 w-4 accent-sky-600" /><Pin className="h-4 w-4 text-primary" /> Pin this feature request at the top of the public list</label>}
            <label className="block"><span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{selected.visibility === "team_only" ? "Discussion title" : "Public title"}</span><Input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 rounded-none" /></label>
            <label className="block"><span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{selected.visibility === "team_only" ? "Discussion" : "Public discussion"}</span><textarea value={body} onChange={(event) => setBody(event.target.value)} className="mt-2 min-h-36 w-full border border-input p-3 text-sm outline-none focus:border-primary" /></label>
            {selected.attachments.length > 0 && <div className="border border-border bg-slate-50 p-4"><div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Submitted attachments</div><div className="mt-3 flex flex-wrap gap-2">{selected.attachments.map((attachment) => <a key={attachment.id} href={`/api/attachments/${attachment.id}`} className="inline-flex items-center gap-2 border border-border bg-white px-3 py-2 text-xs text-primary"><Paperclip className="h-3.5 w-3.5" /> {attachment.fileName} · {attachmentSize(attachment.sizeBytes)}</a>)}</div></div>}
            {selected.answers.length > 0 && <div className="border border-border bg-slate-50 p-4"><div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Conversation history</div><div className="mt-4 space-y-3">{buildAnswerThreads(selected.answers).map((item) => <PortalDiscussionReply key={item.id} answer={item} depth={0} />)}</div></div>}
            <label className="block"><span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">New NCI Dose Team response</span><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={selected.visibility === "team_only" ? "Write a private reply. Earlier messages will remain in the conversation history." : "Write a concise new response suitable for public viewing. Earlier responses will remain in the discussion history."} className="mt-2 min-h-52 w-full border border-input p-3 text-sm outline-none focus:border-primary" /></label>
            <div className="border border-dashed border-sky-200 bg-sky-50/50 p-4"><label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary"><Paperclip className="h-4 w-4" /> Attach files to the new team response<input type="file" multiple accept={qaAttachmentAccept} className="sr-only" onChange={(event) => setAnswerFiles(Array.from(event.target.files || []).slice(0, qaAttachmentMaximumCount))} /></label><p className="mt-2 text-xs text-muted-foreground">Up to 3 files, 10 MB each. Private-discussion attachments remain visible only to the author and NCI Dose Team.</p>{answerFiles.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{answerFiles.map((file) => <span key={`${file.name}-${file.size}`} className="border border-sky-200 bg-white px-2 py-1 text-xs text-slate-600">{file.name} · {attachmentSize(file.size)}</span>)}</div>}</div>
            <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => void save("archived")} className="rounded-none">Archive</Button><Button type="button" variant="outline" disabled={saving} onClick={() => void save("draft")} className="rounded-none">{selected.visibility === "team_only" ? "Save private response" : "Save draft"}</Button><Button type="button" disabled={saving || selected.visibility === "team_only"} onClick={() => void save("published")} className="rounded-none">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Publish discussion</Button></div>
          </div>}
      </section>
    </div>
  );
};

const Admin = ({ demoMode }: { demoMode: boolean }) => {
  const { toast } = useToast();
  const [adminSection, setAdminSection] = useState<"users" | "announcements" | "questions" | "activity">("users");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementCategory, setAnnouncementCategory] = useState<"Release" | "Maintenance" | "Access">("Release");
  const [originalPublishedAt, setOriginalPublishedAt] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [savingAnnouncement, setSavingAnnouncement] = useState<"draft" | "published" | null>(null);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [adminAnnouncements, setAdminAnnouncements] = useState<LiveAnnouncement[]>([]);
  const [loadingAdminAnnouncements, setLoadingAdminAnnouncements] = useState(!demoMode);
  const [managedUsers, setManagedUsers] = useState<ManagedPortalUser[]>([]);
  const [unmatchedLoginAttempts, setUnmatchedLoginAttempts] = useState<UnmatchedLoginAttempt[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(!demoMode);
  const [userSearch, setUserSearch] = useState("");
  const [userSort, setUserSort] = useState<{ key: UserSortKey; direction: "asc" | "desc" }>({ key: "name", direction: "asc" });
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserInstitution, setNewUserInstitution] = useState("");
  const [newUserCountry, setNewUserCountry] = useState("");
  const [newUserApprovedAt, setNewUserApprovedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [creatingUser, setCreatingUser] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [activityData, setActivityData] = useState<AdminActivityData>(emptyAdminActivity);
  const [loadingActivity, setLoadingActivity] = useState(!demoMode);
  const [emailAudience, setEmailAudience] = useState<EmailAudienceStatus | null>(null);
  const [loadingEmailAudience, setLoadingEmailAudience] = useState(!demoMode);
  const [syncingEmailAudience, setSyncingEmailAudience] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [sendAnnouncementEmail, setSendAnnouncementEmail] = useState(false);

  useEffect(() => {
    if (demoMode) {
      setManagedUsers([
        {
          id: demoApprovedUser.id,
          name: demoApprovedUser.name,
          institution: demoApprovedUser.institution,
          country: null,
          role: "user",
          discussionRole: "community",
          discussionHandle: "approvedresearcher",
          accessStatus: "active",
          approvalSource: "google_group",
          approvedAt: demoApprovedUser.staApprovedOn,
          groupJoinedAt: demoApprovedUser.staApprovedOn,
          createdAt: demoApprovedUser.staApprovedOn,
          lastLoginAt: null,
          identities: demoApprovedUser.identities,
        },
      ]);
      setUnmatchedLoginAttempts([
        {
          email: "unlinked.researcher@example.org",
          requestCount: 2,
          firstRequestedAt: "2026-08-25T14:40:00Z",
          latestRequestedAt: "2026-08-25T14:43:00Z",
        },
      ]);
      return;
    }
    fetch("/api/admin/users", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Approved users could not be loaded.");
        const body = await response.json();
        setManagedUsers(body.users);
        setUnmatchedLoginAttempts(body.unmatchedLoginAttempts || []);
      })
      .catch((error) => toast({ title: "Unable to load approved users", description: error instanceof Error ? error.message : undefined, variant: "destructive" }))
      .finally(() => setLoadingUsers(false));
  }, [demoMode, toast]);

  const loadEmailAudience = async () => {
    if (demoMode) {
      setEmailAudience({ configured: true, approvedCount: managedUsers.filter((entry) => entry.accessStatus === "active").length, segmentCount: 0, pendingAdds: 0, pendingRemovals: 0 });
      setLoadingEmailAudience(false);
      return;
    }
    setLoadingEmailAudience(true);
    try {
      const response = await fetch("/api/admin/email-audience", { credentials: "include" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "The email audience could not be loaded.");
      setEmailAudience(body);
    } catch (error) {
      toast({ title: "Unable to load email audience", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setLoadingEmailAudience(false);
    }
  };

  useEffect(() => {
    void loadEmailAudience();
    // The audience is refreshed explicitly after user changes and syncs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode]);

  const syncEmailAudience = async () => {
    if (demoMode) {
      toast({ title: "Local preview", description: "Approved primary emails would be synchronized with Resend." });
      return;
    }
    setSyncingEmailAudience(true);
    let added = 0;
    let removed = 0;
    try {
      for (let pass = 0; pass < 50; pass += 1) {
        const response = await fetch("/api/admin/email-audience/sync", { method: "POST", credentials: "include" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.detail || "The email audience could not be synchronized.");
        added += Number(body.added || 0);
        removed += Number(body.removed || 0);
        if (body.errors?.length) throw new Error(`${body.errors.length} contact update(s) failed. Please try again.`);
        if (!body.remaining) break;
      }
      await loadEmailAudience();
      toast({ title: "Email audience synchronized", description: `${added} added, ${removed} removed. Unsubscribe preferences were preserved.` });
    } catch (error) {
      toast({ title: "Unable to synchronize audience", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSyncingEmailAudience(false);
    }
  };

  const sendTestEmail = async () => {
    if (!announcementTitle.trim() || !announcementBody.trim()) {
      toast({ title: "Write the title and announcement first", variant: "destructive" });
      return;
    }
    if (demoMode) {
      toast({ title: "Local preview", description: "The completed announcement would be emailed only to the signed-in administrator." });
      return;
    }
    setSendingTestEmail(true);
    try {
      const response = await fetch("/api/admin/email-audience/test", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: announcementTitle, body: announcementBody, category: announcementCategory }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "The test email could not be sent.");
      toast({ title: "Announcement preview sent", description: `Only ${body.sentTo} received this preview. Nothing was published.` });
    } catch (error) {
      toast({ title: "Unable to send test email", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const createUser = async () => {
    if (!newUserName.trim() || !newUserEmail.includes("@")) {
      toast({ title: "Name and approved email are required", variant: "destructive" });
      return;
    }
    if (demoMode) {
      toast({ title: "Local preview", description: "The approved user would be added to the production database." });
      return;
    }
    setCreatingUser(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newUserName, email: newUserEmail, institution: newUserInstitution, country: newUserCountry, approvedAt: newUserApprovedAt }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error === "email_in_use" ? "That email is already registered." : "The user could not be added.");
      setManagedUsers((current) => [body.user, ...current]);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserInstitution("");
      setNewUserCountry("");
      setNewUserApprovedAt(new Date().toISOString().slice(0, 10));
      toast({
        title: body.welcomeEmail?.status === "sent" ? "Approved user added and welcome email sent" : "Approved user added",
        description: body.welcomeEmail?.status === "failed"
          ? `${body.user.identities[0].email} can use the portal, but the welcome email could not be sent.`
          : `A welcome message was sent to ${body.user.identities[0].email}.`,
      });
      void loadEmailAudience();
    } catch (error) {
      toast({ title: "Unable to add user", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setCreatingUser(false);
    }
  };

  const changeUserStatus = async (managedUser: ManagedPortalUser) => {
    const accessStatus = managedUser.accessStatus === "active" ? "suspended" : "active";
    if (demoMode) {
      setManagedUsers((current) => current.map((entry) => entry.id === managedUser.id ? { ...entry, accessStatus } : entry));
      return;
    }
    setUpdatingUserId(managedUser.id);
    try {
      const response = await fetch(`/api/admin/users/${managedUser.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessStatus }),
      });
      if (!response.ok) throw new Error("The access status could not be changed.");
      setManagedUsers((current) => current.map((entry) => entry.id === managedUser.id ? { ...entry, accessStatus } : entry));
      toast({ title: accessStatus === "active" ? "User reactivated" : "User suspended" });
      window.setTimeout(() => void loadEmailAudience(), 500);
    } catch (error) {
      toast({ title: "Unable to update user", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const changeDiscussionRole = async (managedUser: ManagedPortalUser) => {
    if (managedUser.role === "admin") return;
    const discussionRole = managedUser.discussionRole === "team" ? "community" : "team";
    if (demoMode) {
      setManagedUsers((current) => current.map((entry) => entry.id === managedUser.id ? { ...entry, discussionRole } : entry));
      return;
    }
    setUpdatingUserId(managedUser.id);
    try {
      const response = await fetch(`/api/admin/users/${managedUser.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ discussionRole }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error("The discussion role could not be changed.");
      setManagedUsers((current) => current.map((entry) => entry.id === managedUser.id ? { ...entry, discussionRole: payload.discussionRole, discussionHandle: payload.discussionHandle } : entry));
      toast({ title: discussionRole === "team" ? "NCI Dose Team role assigned" : "Community role restored", description: discussionRole === "team" ? `New posts will display as NCI Dose Team · @${payload.discussionHandle}.` : "New posts will display as User Community." });
    } catch (error) {
      toast({ title: "Unable to update discussion role", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const deleteUser = async (managedUser: ManagedPortalUser) => {
    if (managedUser.accessStatus !== "suspended" || managedUser.role === "admin") return;
    const primaryEmail = managedUser.identities.find((identity) => identity.primary)?.email || managedUser.identities[0]?.email || managedUser.name || "this user";
    if (!window.confirm(`Permanently delete ${primaryEmail}?\n\nThis removes the portal account and linked emails. This action cannot be undone.`)) return;
    if (demoMode) {
      setManagedUsers((current) => current.filter((entry) => entry.id !== managedUser.id));
      return;
    }
    setDeletingUserId(managedUser.id);
    try {
      const response = await fetch(`/api/admin/users/${managedUser.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error === "user_must_be_suspended" ? "Suspend the user before deleting the account." : "The user could not be deleted.");
      }
      setManagedUsers((current) => current.filter((entry) => entry.id !== managedUser.id));
      toast({ title: "User permanently deleted", description: `${primaryEmail} was removed from the portal.` });
      window.setTimeout(() => void loadEmailAudience(), 500);
    } catch (error) {
      toast({ title: "Unable to delete user", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setDeletingUserId(null);
    }
  };

  const latestLoginByUserId = useMemo(() => {
    const latest = new Map<string, string>();
    for (const managedUser of managedUsers) {
      if (managedUser.lastLoginAt) latest.set(managedUser.id, managedUser.lastLoginAt);
    }
    for (const activity of activityData.recent) {
      if (activity.eventType !== "login" || !activity.userId) continue;
      const current = latest.get(activity.userId);
      const newest = latestPortalTimestamp(current, activity.occurredAt);
      if (newest) latest.set(activity.userId, newest);
    }
    return latest;
  }, [activityData.recent, managedUsers]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    const matchingUsers = query
      ? managedUsers.filter((entry) => [entry.name, entry.institution, entry.country, ...entry.identities.map((identity) => identity.email)].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)))
      : managedUsers;
    const sortValue = (entry: ManagedPortalUser): string | number => {
      const primaryEmail = entry.identities.find((identity) => identity.primary)?.email || entry.identities[0]?.email || "";
      if (userSort.key === "email") return primaryEmail;
      if (userSort.key === "joined") {
        const joinedAt = entry.groupJoinedAt || entry.createdAt;
        return joinedAt ? portalTimestamp(joinedAt) : "";
      }
      if (userSort.key === "lastLogin") {
        const lastLoginAt = latestLoginByUserId.get(entry.id);
        return lastLoginAt ? portalTimestamp(lastLoginAt) : "";
      }
      return entry.name || primaryEmail;
    };
    return [...matchingUsers].sort((left, right) => {
      const leftValue = sortValue(left);
      const rightValue = sortValue(right);
      if (!leftValue && !rightValue) return 0;
      if (!leftValue) return 1;
      if (!rightValue) return -1;
      const comparison = typeof leftValue === "number" && typeof rightValue === "number"
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: "base" });
      return userSort.direction === "asc" ? comparison : -comparison;
    });
  }, [latestLoginByUserId, managedUsers, userSearch, userSort]);

  const changeUserSort = (key: UserSortKey) => {
    setUserSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: key === "joined" || key === "lastLogin" ? "desc" : "asc" });
  };

  const sortHeader = (key: UserSortKey, label: string) => (
    <button type="button" onClick={() => changeUserSort(key)} className={cn("flex items-center gap-1.5 text-left text-xs font-medium uppercase tracking-wide transition-colors hover:text-primary", userSort.key === key ? "text-primary" : "text-slate-500")}>
      {label}<ArrowUpDown className="h-3.5 w-3.5" />
    </button>
  );

  useEffect(() => {
    if (demoMode) return;
    fetch("/api/announcements?includeDrafts=1", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Announcements could not be loaded.");
        const body = await response.json();
        setAdminAnnouncements(body.announcements);
      })
      .catch(() => toast({ title: "Unable to load announcement list", variant: "destructive" }))
      .finally(() => setLoadingAdminAnnouncements(false));
  }, [demoMode, toast]);

  useEffect(() => {
    if (demoMode) return;
    fetch("/api/admin/activity", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Activity data could not be loaded.");
        setActivityData(await response.json());
      })
      .catch((error) => toast({ title: "Unable to load activity", description: error instanceof Error ? error.message : undefined, variant: "destructive" }))
      .finally(() => setLoadingActivity(false));
  }, [demoMode, toast]);

  const clearAnnouncementForm = () => {
    setAnnouncementTitle("");
    setAnnouncementBody("");
    setOriginalPublishedAt("");
    setSourceUrl("");
    setAnnouncementCategory("Release");
    setEditingAnnouncementId(null);
    setSendAnnouncementEmail(false);
  };

  const editAnnouncement = (announcement: LiveAnnouncement) => {
    setEditingAnnouncementId(announcement.id);
    setAnnouncementTitle(announcement.title);
    setAnnouncementBody(announcement.body);
    setAnnouncementCategory(announcement.category);
    setOriginalPublishedAt(announcement.originalPublishedAt?.slice(0, 10) || "");
    setSourceUrl(announcement.sourceUrl || "");
    setSendAnnouncementEmail(false);
    window.setTimeout(() => document.getElementById("announcement-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const saveAnnouncement = async (status: "draft" | "published") => {
    if (!announcementTitle.trim() || !announcementBody.trim()) {
      toast({ title: "Title and body are required", variant: "destructive" });
      return;
    }
    if (demoMode) {
      toast({ title: "Local preview", description: `This announcement would be saved as ${status}.` });
      return;
    }
    const shouldSendEmail = status === "published" && sendAnnouncementEmail;
    if (shouldSendEmail) {
      const recipientCount = emailAudience?.approvedCount ?? "all active";
      const confirmed = window.confirm(`Publish this announcement and email ${recipientCount} approved users?\n\nThis email cannot be recalled, and later edits will not resend it.`);
      if (!confirmed) return;
    }
    setSavingAnnouncement(status);
    try {
      const response = await fetch(editingAnnouncementId ? `/api/admin/announcements/${editingAnnouncementId}` : "/api/admin/announcements", {
        method: editingAnnouncementId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: announcementTitle,
          body: announcementBody,
          category: announcementCategory,
          originalPublishedAt: originalPublishedAt || null,
          sourceUrl: sourceUrl || null,
          status,
          sendEmail: shouldSendEmail,
        }),
      });
      const responseBody = await response.json();
      if (!response.ok) {
        if (responseBody.error === "resend_audience_sync_required") throw new Error("The Resend audience still has pending changes. Use Sync approved users, then publish again.");
        throw new Error(responseBody.detail || "The announcement could not be saved.");
      }
      setAdminAnnouncements((current) => {
        const remaining = current.filter((announcement) => announcement.id !== responseBody.announcement.id);
        return [responseBody.announcement, ...remaining].sort((left, right) => String(right.originalPublishedAt || right.publishedAt || "").localeCompare(String(left.originalPublishedAt || left.publishedAt || "")));
      });
      const wasEditing = Boolean(editingAnnouncementId);
      clearAnnouncementForm();
      const delivery = responseBody.emailDelivery;
      toast({
        title: delivery?.status === "sent" ? "Announcement published and email submitted" : status === "published" ? (wasEditing ? "Published announcement updated" : "Announcement published") : (wasEditing ? "Draft updated" : "Draft saved"),
        description: delivery?.status === "failed" ? `The post was published, but email delivery failed: ${delivery.error || "Unknown Resend error"}` : delivery?.status === "sent" ? `Resend accepted the broadcast for ${delivery.recipientCount} approved users.` : "The announcement is stored in the portal.",
        variant: delivery?.status === "failed" ? "destructive" : undefined,
      });
    } catch (error) {
      toast({ title: "Unable to save announcement", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSavingAnnouncement(null);
    }
  };

  const editingAnnouncement = adminAnnouncements.find((announcement) => announcement.id === editingAnnouncementId) || null;
  const emailOptionDisabled = Boolean(originalPublishedAt || sourceUrl || editingAnnouncement?.emailDelivery);

  return (
    <div className="space-y-8">
      <nav aria-label="Admin sections" className="flex overflow-x-auto border border-border bg-white p-1">
        <button type="button" onClick={() => setAdminSection("users")} className={cn("flex flex-1 items-center justify-center gap-2 whitespace-nowrap px-4 py-3 text-sm transition-colors sm:flex-none", adminSection === "users" ? "bg-primary text-primary-foreground" : "text-slate-600 hover:bg-slate-50 hover:text-primary")}><Users className="h-4 w-4" /> User Management</button>
        <button type="button" onClick={() => setAdminSection("announcements")} className={cn("flex flex-1 items-center justify-center gap-2 whitespace-nowrap px-4 py-3 text-sm transition-colors sm:flex-none", adminSection === "announcements" ? "bg-primary text-primary-foreground" : "text-slate-600 hover:bg-slate-50 hover:text-primary")}><Megaphone className="h-4 w-4" /> Announcements</button>
        <button type="button" onClick={() => setAdminSection("questions")} className={cn("flex flex-1 items-center justify-center gap-2 whitespace-nowrap px-4 py-3 text-sm transition-colors sm:flex-none", adminSection === "questions" ? "bg-primary text-primary-foreground" : "text-slate-600 hover:bg-slate-50 hover:text-primary")}><MessageCircleQuestion className="h-4 w-4" /> Discussions</button>
        <button type="button" onClick={() => setAdminSection("activity")} className={cn("flex flex-1 items-center justify-center gap-2 whitespace-nowrap px-4 py-3 text-sm transition-colors sm:flex-none", adminSection === "activity" ? "bg-primary text-primary-foreground" : "text-slate-600 hover:bg-slate-50 hover:text-primary")}><BarChart3 className="h-4 w-4" /> Activity</button>
      </nav>

      {adminSection === "questions" && <AdminQuestions demoMode={demoMode} />}

      {adminSection === "users" && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard icon={Users} label="Approved users" value={loadingUsers ? "—" : String(managedUsers.length)} note="All portal accounts" />
        <StatusCard icon={UserRoundCheck} label="Active" value={loadingUsers ? "—" : String(managedUsers.filter((entry) => entry.accessStatus === "active").length)} note="Can access downloads" />
        <StatusCard icon={ShieldCheck} label="Suspended" value={loadingUsers ? "—" : String(managedUsers.filter((entry) => entry.accessStatus === "suspended").length)} note="Access retained but disabled" />
        <StatusCard icon={Mail} label="Unmatched sign-ins" value={loadingUsers ? "—" : String(unmatchedLoginAttempts.reduce((total, entry) => total + entry.requestCount, 0))} note="Code requests in 30 days" />
      </div>}

      {adminSection === "users" && <section className="border border-amber-200 bg-amber-50/40">
        <div className="border-b border-amber-200 px-6 py-5">
          <div className="font-mono text-xs uppercase tracking-widest text-amber-700">Sign-in support</div>
          <h2 className="mt-2 text-xl font-light text-slate-800">Unmatched sign-in requests</h2>
          <p className="mt-2 text-sm text-slate-600">No verification code was created for these addresses because they were not linked to an active account. Compare each address with the approved user directory before contacting the user.</p>
        </div>
        {loadingUsers ? (
          <div className="flex items-center gap-3 px-6 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading sign-in requests…</div>
        ) : unmatchedLoginAttempts.length === 0 ? (
          <div className="px-6 py-6 text-sm text-slate-600">No unmatched sign-in requests were recorded in the last 30 days.</div>
        ) : (
          <div className="divide-y divide-amber-200">{unmatchedLoginAttempts.map((entry) => (
            <div key={entry.email} className="grid gap-2 px-6 py-4 sm:grid-cols-[minmax(0,1fr)_8rem_12rem] sm:items-center">
              <div className="break-all font-mono text-sm text-slate-800">{entry.email}</div>
              <div className="text-xs text-slate-600">{entry.requestCount} request{entry.requestCount === 1 ? "" : "s"}</div>
              <div className="text-xs text-slate-600">Latest: {activityDate(entry.latestRequestedAt)}</div>
            </div>
          ))}</div>
        )}
      </section>}

      {adminSection === "users" && <section className="border border-border bg-white p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary text-primary"><UserRoundCheck className="h-5 w-5" /></div>
          <div><div className="font-mono text-xs uppercase tracking-widest text-primary">New STA approval</div><h2 className="mt-2 text-xl font-light">Add an approved user</h2><p className="mt-2 text-sm text-muted-foreground">Use the email address included in the NCI Technology Transfer approval message. The user can add one alternate email after signing in.</p></div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Input value={newUserName} onChange={(event) => setNewUserName(event.target.value)} placeholder="Full name" className="rounded-none" />
          <Input type="email" value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} placeholder="Approved email" className="rounded-none" />
          <Input value={newUserInstitution} onChange={(event) => setNewUserInstitution(event.target.value)} placeholder="Institution (optional)" className="rounded-none" />
          <Input value={newUserCountry} onChange={(event) => setNewUserCountry(event.target.value)} placeholder="Country (optional)" className="rounded-none" />
          <Input type="date" value={newUserApprovedAt} onChange={(event) => setNewUserApprovedAt(event.target.value)} className="rounded-none" />
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="button" disabled={creatingUser || !newUserName.trim() || !newUserEmail.includes("@")} onClick={() => void createUser()} className="rounded-none">{creatingUser && <Loader2 className="h-4 w-4 animate-spin" />} Add approved user</Button>
        </div>
      </section>}

      {adminSection === "users" && <section className="border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5">
          <div><div className="font-mono text-xs uppercase tracking-widest text-primary">User management</div><h2 className="mt-2 text-xl font-light">Approved user directory</h2></div>
          <div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search name, email, or institution" className="rounded-none pl-9" /></div>
        </div>
        {!loadingUsers && filteredUsers.length > 0 && <div className="hidden border-b border-border bg-slate-50 px-6 py-3 xl:grid xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_9rem_10rem_20rem] xl:items-center xl:gap-4">
          {sortHeader("name", "Name")}
          {sortHeader("email", "Email")}
          {sortHeader("joined", "Joined")}
          {sortHeader("lastLogin", "Last login")}
          <div className="text-right text-xs font-medium uppercase tracking-wide text-slate-500">Actions</div>
        </div>}
        {loadingUsers ? (
          <div className="flex items-center justify-center gap-3 p-10 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading approved users…</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No matching users.</div>
        ) : (
          <div className="divide-y divide-border">
            {filteredUsers.map((managedUser) => {
              const primaryEmail = managedUser.identities.find((identity) => identity.primary)?.email || managedUser.identities[0]?.email || "No email";
              const additionalEmail = managedUser.identities.find((identity) => !identity.primary);
              const lastLoginAt = latestLoginByUserId.get(managedUser.id);
              return (
                <div key={managedUser.id} className="grid gap-4 px-6 py-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_9rem_10rem_20rem] xl:items-center">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><div className="truncate text-sm font-medium text-slate-800">{managedUser.name || primaryEmail.split("@")[0]}</div>{(managedUser.role === "admin" || managedUser.discussionRole === "team") && <span className="bg-sky-50 px-2 py-0.5 font-mono text-[10px] text-primary">NCI Dose Team{managedUser.discussionHandle ? ` · @${managedUser.discussionHandle}` : ""}</span>}</div><div className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground"><Building2 className="h-3.5 w-3.5 shrink-0" /> {[managedUser.institution, managedUser.country].filter(Boolean).join(" · ") || "Profile not provided"}</div></div>
                  <div className="min-w-0"><div className="truncate text-sm text-slate-700">{primaryEmail}</div>{additionalEmail && <div className="mt-1 truncate text-xs text-muted-foreground">+ {additionalEmail.email} · {additionalEmail.verified ? "verified" : "pending"}</div>}</div>
                  <div className="text-xs text-muted-foreground"><span className="xl:hidden">Joined </span>{announcementDate(managedUser.groupJoinedAt || managedUser.createdAt)}</div>
                  <div className="text-xs text-muted-foreground"><span className="xl:hidden">Last login </span>{lastLoginAt ? activityDate(lastLoginAt) : "—"}</div>
                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">{managedUser.role !== "admin" && <Button type="button" variant="outline" disabled={updatingUserId === managedUser.id || deletingUserId === managedUser.id} onClick={() => void changeDiscussionRole(managedUser)} className="rounded-none">{managedUser.discussionRole === "team" ? "Remove team role" : "Make team member"}</Button>}<Button type="button" variant="outline" disabled={updatingUserId === managedUser.id || deletingUserId === managedUser.id || managedUser.role === "admin"} onClick={() => void changeUserStatus(managedUser)} className="rounded-none">{updatingUserId === managedUser.id ? <Loader2 className="h-4 w-4 animate-spin" /> : managedUser.accessStatus === "active" ? "Suspend" : "Reactivate"}</Button>{managedUser.accessStatus === "suspended" && managedUser.role !== "admin" && <Button type="button" variant="outline" disabled={updatingUserId === managedUser.id || deletingUserId === managedUser.id} onClick={() => void deleteUser(managedUser)} className="rounded-none border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800">{deletingUserId === managedUser.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete</Button>}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>}

      {adminSection === "users" && <section className="border border-border bg-white p-6"><div className="flex items-center justify-between"><div><div className="font-mono text-xs uppercase tracking-widest text-primary">New approvals</div><h2 className="mt-2 text-xl font-light">Simple activation workflow</h2></div><Users className="h-5 w-5 text-primary" /></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{["Receive the executed STA approval email from NCI Technology Transfer", "Add the approved email in the form above", "Send the User Portal link to the recipient", "The recipient may verify one secondary email"].map((item, index) => <div key={item} className="flex items-center gap-3 border border-border p-3"><div className="flex h-6 w-6 shrink-0 items-center justify-center bg-primary/10 font-mono text-xs text-primary">{index + 1}</div><span className="text-sm text-slate-700">{item}</span></div>)}</div></section>}

      {adminSection === "activity" && (loadingActivity ? (
        <div className="flex items-center justify-center gap-3 border border-border bg-white p-12 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading activity…</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatusCard icon={Download} label="Today" value={String(activityData.summary.downloadsToday)} note="Downloads in 24 hours" />
            <StatusCard icon={Download} label="Last 7 days" value={String(activityData.summary.downloads7Days)} note="File downloads" />
            <StatusCard icon={Download} label="Last 30 days" value={String(activityData.summary.downloads30Days)} note="File downloads" />
            <StatusCard icon={Users} label="Downloading users" value={String(activityData.summary.downloadUsers30Days)} note="Unique users in 30 days" />
            <StatusCard icon={ShieldCheck} label="Portal sign-ins" value={String(activityData.summary.logins30Days)} note="Sign-ins in 30 days" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="border border-border bg-white">
              <div className="border-b border-border px-6 py-5"><div className="font-mono text-xs uppercase tracking-widest text-primary">Last 30 days</div><h2 className="mt-2 text-xl font-light">Downloads by tool</h2></div>
              {activityData.tools.length === 0 ? <div className="p-8 text-sm text-muted-foreground">No downloads recorded.</div> : <div className="divide-y divide-border">{activityData.tools.map((entry) => <div key={entry.tool} className="flex items-center justify-between px-6 py-4"><span className="text-sm font-medium text-slate-800">{entry.tool}</span><span className="font-mono text-sm text-primary">{entry.downloads}</span></div>)}</div>}
            </section>
            <section className="border border-border bg-white">
              <div className="border-b border-border px-6 py-5"><div className="font-mono text-xs uppercase tracking-widest text-primary">Last 30 days</div><h2 className="mt-2 text-xl font-light">Most downloaded files</h2></div>
              {activityData.files.length === 0 ? <div className="p-8 text-sm text-muted-foreground">No downloads recorded.</div> : <div className="divide-y divide-border">{activityData.files.slice(0, 10).map((entry) => <div key={entry.file} className="flex items-start justify-between gap-4 px-6 py-4"><span className="min-w-0 break-words text-sm text-slate-700">{entry.file}</span><span className="shrink-0 font-mono text-sm text-primary">{entry.downloads}</span></div>)}</div>}
            </section>
          </div>

          <section className="border border-border bg-white">
            <div className="border-b border-border px-6 py-5"><div className="font-mono text-xs uppercase tracking-widest text-primary">Audit history</div><h2 className="mt-2 text-xl font-light">Recent logins and downloads</h2></div>
            {activityData.recent.length === 0 ? <div className="p-8 text-sm text-muted-foreground">No activity recorded.</div> : <div className="divide-y divide-border">{activityData.recent.map((entry) => <div key={entry.id} className="grid gap-2 px-6 py-4 md:grid-cols-[150px_minmax(0,1fr)_minmax(0,1.2fr)] md:items-center"><div><span className={cn("inline-flex px-2 py-1 font-mono text-[11px] uppercase", entry.eventType === "download" ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600")}>{entry.eventType}</span></div><div className="min-w-0"><div className="truncate text-sm text-slate-800">{entry.name || entry.email || "Unknown user"}</div>{entry.name && <div className="mt-1 truncate text-xs text-muted-foreground">{entry.email}</div>}</div><div className="min-w-0 text-xs text-muted-foreground"><div className="truncate">{entry.file || "Portal sign-in"}</div><div className="mt-1">{activityDate(entry.occurredAt)}</div></div></div>)}</div>}
          </section>
        </>
      ))}

      {adminSection === "announcements" && <section className="border border-border bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-primary">Email audience</div>
            <h2 className="mt-2 text-xl font-light">Resend announcement list</h2>
            <p className="mt-2 text-sm text-muted-foreground">One primary email per active approved user. Secondary emails are not added, and unsubscribe preferences are preserved.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={syncingEmailAudience || loadingEmailAudience} onClick={() => void syncEmailAudience()} className="rounded-none">
              {(syncingEmailAudience || loadingEmailAudience) && <Loader2 className="h-4 w-4 animate-spin" />} Sync approved users
            </Button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatusCard icon={UserRoundCheck} label="Active approved users" value={loadingEmailAudience ? "—" : String(emailAudience?.approvedCount ?? "—")} note="Primary email addresses" />
          <StatusCard icon={Mail} label="Resend audience" value={loadingEmailAudience ? "—" : String(emailAudience?.segmentCount ?? "—")} note="Current segment contacts" />
          <StatusCard icon={Send} label="Pending changes" value={loadingEmailAudience ? "—" : String((emailAudience?.pendingAdds || 0) + (emailAudience?.pendingRemovals || 0))} note={emailAudience ? `${emailAudience.pendingAdds} to add · ${emailAudience.pendingRemovals} to remove` : "Audience status"} />
        </div>
      </section>}

      {adminSection === "announcements" && <section id="announcement-editor" className="scroll-mt-24 border border-border bg-white p-6 sm:p-8">
          <div className="flex items-center justify-between"><div><div className="font-mono text-xs uppercase tracking-widest text-primary">Announcements</div><h2 className="mt-2 text-xl font-light">{editingAnnouncementId ? "Edit announcement" : "Publish an update"}</h2></div><Megaphone className="h-5 w-5 text-primary" /></div>
          {editingAnnouncementId && <div className="mt-3 inline-flex bg-amber-50 px-2 py-1 font-mono text-xs text-amber-800">Editing existing announcement</div>}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Write an update for approved NCI Dose Tools users. You can publish it in the portal only or publish and send it by email.</p>
          <div className="mt-6 space-y-3">
            <Input value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} placeholder="Announcement title" className="rounded-none" />
            <label className="block max-w-sm"><span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Category</span><select value={announcementCategory} onChange={(event) => setAnnouncementCategory(event.target.value as typeof announcementCategory)} className="mt-2 h-10 w-full rounded-none border border-input bg-white px-3 text-sm"><option>Release</option><option>Maintenance</option><option>Access</option></select></label>
            <textarea value={announcementBody} onChange={(event) => setAnnouncementBody(event.target.value)} className="min-h-44 w-full border border-input bg-background p-3 text-sm outline-none focus:border-primary" placeholder="Write the announcement…" />
            <label className={cn("flex items-start gap-3 border p-4", emailOptionDisabled ? "border-slate-200 bg-slate-50 text-slate-400" : "border-sky-200 bg-sky-50 text-slate-700")}>
              <input type="checkbox" checked={sendAnnouncementEmail} disabled={emailOptionDisabled} onChange={(event) => setSendAnnouncementEmail(event.target.checked)} className="mt-1 h-4 w-4 accent-sky-600" />
              <span>
                <span className="block text-sm font-medium">Email approved users when publishing</span>
                <span className="mt-1 block text-xs leading-relaxed">Sends once to each active user's primary email through Resend. Publishing edits does not send again.</span>
                {emailOptionDisabled && <span className="mt-1 block text-xs">Email is unavailable for older imported posts and announcements that were already emailed.</span>}
              </span>
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              {editingAnnouncementId && <Button type="button" variant="ghost" disabled={savingAnnouncement !== null} onClick={clearAnnouncementForm} className="rounded-none">Cancel edit</Button>}
              <Button type="button" variant="outline" disabled={savingAnnouncement !== null || sendingTestEmail || !announcementTitle.trim() || !announcementBody.trim()} onClick={() => void sendTestEmail()} className="rounded-none">{sendingTestEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send preview to me</Button>
              <Button type="button" variant="outline" disabled={savingAnnouncement !== null} onClick={() => void saveAnnouncement("draft")} className="rounded-none">{savingAnnouncement === "draft" && <Loader2 className="h-4 w-4 animate-spin" />} {editingAnnouncementId ? "Save as draft" : "Save draft"}</Button>
              <Button type="button" disabled={savingAnnouncement !== null} onClick={() => void saveAnnouncement("published")} className="rounded-none">{savingAnnouncement === "published" && <Loader2 className="h-4 w-4 animate-spin" />} {sendAnnouncementEmail ? "Publish and email users" : editingAnnouncementId ? "Update and publish" : "Publish"}</Button>
            </div>
          </div>
      </section>}

      {adminSection === "announcements" && <section className="border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5"><div><div className="font-mono text-xs uppercase tracking-widest text-primary">Announcement management</div><h2 className="mt-2 text-xl font-light">Published posts and drafts</h2></div><div className="font-mono text-xs text-muted-foreground">{adminAnnouncements.length} posts</div></div>
        {loadingAdminAnnouncements ? <div className="flex items-center justify-center gap-3 p-10 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading announcement list…</div>
          : adminAnnouncements.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No announcements have been saved.</div>
            : <div className="divide-y divide-border">
              {adminAnnouncements.map((announcement) => (
                <div key={announcement.id} className="grid gap-4 px-6 py-5 md:grid-cols-[170px_minmax(0,1fr)_auto] md:items-center">
                  <div><div className="font-mono text-xs text-muted-foreground">{announcementDate(announcement.originalPublishedAt || announcement.publishedAt)}</div><div className="mt-2 flex flex-wrap gap-1"><span className={cn("inline-flex px-2 py-1 font-mono text-[11px] uppercase", announcement.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>{announcement.status}</span>{announcement.emailDelivery && <span className={cn("inline-flex px-2 py-1 font-mono text-[11px] uppercase", announcement.emailDelivery.status === "sent" ? "bg-sky-50 text-sky-700" : announcement.emailDelivery.status === "failed" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600")}>email {announcement.emailDelivery.status}</span>}</div></div>
                  <div className="min-w-0"><div className="text-sm font-medium text-slate-800">{announcement.title}</div><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{announcement.summary}</p></div>
                  <Button type="button" variant="outline" onClick={() => editAnnouncement(announcement)} className="rounded-none">Edit</Button>
                </div>
              ))}
            </div>}
      </section>}
    </div>
  );
};

export default Portal;
