import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
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
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Megaphone,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
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
import { portalLinks } from "@/data/nciDoseTools";
import { cn } from "@/lib/utils";

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
  institution: string;
  role: "user" | "admin";
  staStatus: "Approved";
  staApprovedOn: string;
  identities: PortalIdentity[];
};
type PortalSection = "overview" | "downloads" | "announcements" | "account" | "admin";

const portalNav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "downloads", label: "Downloads", icon: Download },
  { id: "announcements", label: "Announcements", icon: Bell },
  { id: "account", label: "Account", icon: CircleUserRound },
] satisfies Array<{ id: PortalSection; label: string; icon: typeof LayoutDashboard }>;

const publicSiteUrl = "https://ncidose.github.io/";

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
  const standalonePortal = import.meta.env.VITE_PORTAL_STANDALONE === "true";
  const demoMode = !standalonePortal && (import.meta.env.DEV || import.meta.env.VITE_PORTAL_DEMO_MODE === "true");
  const [user, setUser] = useState<PortalUser | null>(() => demoMode ? getStoredUser() : null);
  const [authState, setAuthState] = useState<"loading" | "ready" | "denied">(demoMode ? "ready" : "loading");
  const pathSection = location.pathname.split("/")[2] as PortalSection | undefined;
  const validSections: PortalSection[] = ["overview", "downloads", "announcements", "account", "admin"];
  const section: PortalSection = pathSection && validSections.includes(pathSection) ? pathSection : "overview";
  const isAccessRequest = location.pathname === "/portal/request-access";

  useEffect(() => {
    if (demoMode || publicLanding || isAccessRequest) return;
    const controller = new AbortController();
    fetch("/api/me", { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 403 ? "denied" : "authentication");
        const body = await response.json();
        const apiUser = body.user;
        const email = apiUser.signed_in_email;
        const displayName = apiUser.display_name || email.split("@")[0];
        setUser({
          id: apiUser.id,
          name: displayName,
          primaryEmail: email,
          institution: apiUser.institution || "Not specified",
          role: apiUser.role,
          staStatus: "Approved",
          staApprovedOn: apiUser.approved_at || "Existing approval",
          identities: [{ id: `access-${apiUser.id}`, provider: "Verified email", email, verified: true, primary: true }],
        });
        setAuthState("ready");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setAuthState("denied");
      });
    return () => controller.abort();
  }, [demoMode, publicLanding, isAccessRequest]);

  const signIn = (role: "user" | "admin") => {
    const nextUser = role === "admin" ? demoAdminUser : demoApprovedUser;
    window.sessionStorage.setItem("ncidose-portal-demo-user", role);
    setUser(nextUser);
    navigate("/portal");
  };

  if (publicLanding) {
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

  const signOut = () => {
    if (!demoMode) {
      const returnTo = encodeURIComponent(publicSiteUrl);
      window.location.assign(`/cdn-cgi/access/logout?returnTo=${returnTo}`);
      return;
    }
    window.sessionStorage.removeItem("ncidose-portal-demo-user");
    setUser(null);
    navigate("/portal");
  };

  if (isAccessRequest && !user) {
    return <AccessRequest />;
  }

  if (!demoMode && authState === "loading") {
    return <PortalLoading />;
  }

  if (!user) {
    return <PortalSignIn demoMode={demoMode} accessDenied={authState === "denied"} onSignIn={signIn} />;
  }

  if (section === "admin" && user.role !== "admin") {
    return <Navigate to="/portal" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-foreground">
      <PortalTopbar user={user} onSignOut={signOut} />
      <PortalMobileNav section={section} isAdmin={user.role === "admin"} />
      <div className="mx-auto flex max-w-[1500px]">
        <PortalSidebar section={section} isAdmin={user.role === "admin"} />
        <main className="min-w-0 flex-1 px-5 pb-20 pt-36 sm:px-8 lg:px-12 lg:pt-24">
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
                  {section === "account" && "Account and access"}
                  {section === "admin" && "Portal administration"}
                </h1>
              </div>
              <div className="inline-flex items-center gap-2 border border-amber-200 bg-amber-50 px-3 py-2 font-mono text-xs text-amber-800">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                {demoMode ? "Local preview — no live downloads" : "Secure portal — live downloads"}
              </div>
            </div>

            {section === "overview" && <Overview user={user} />}
            {section === "downloads" && <Downloads demoMode={demoMode} />}
            {section === "announcements" && <Announcements demoMode={demoMode} />}
            {section === "account" && <Account user={user} setUser={setUser} />}
            {section === "admin" && <Admin demoMode={demoMode} />}
          </div>
        </main>
      </div>
    </div>
  );
};

const PortalSignIn = ({
  demoMode,
  accessDenied,
  onSignIn,
  securePortalUrl,
}: {
  demoMode: boolean;
  accessDenied: boolean;
  onSignIn: (role: "user" | "admin") => void;
  securePortalUrl?: string;
}) => {
  const [email, setEmail] = useState("");
  const [emailStep, setEmailStep] = useState<"idle" | "sent">("idle");
  const beginSecureSignIn = () => {
    if (securePortalUrl) {
      window.location.assign(securePortalUrl);
      return;
    }
    onSignIn("user");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-border bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link to="/" className="text-lg font-light tracking-tight">NCI Dose Tools</Link>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to public site
          </Link>
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
            <h2 className="text-2xl font-light">Sign in</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Existing approved users can continue with the Gmail address previously used for the ncidose Google Group.
            </p>
          </div>

          {!demoMode && accessDenied && (
            <div className="mb-6 border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
              This email is not currently linked to approved portal access. If you are an existing user, sign in with the Gmail address used for the ncidose Google Group.
            </div>
          )}

          <Button
            className="h-12 w-full rounded-none bg-white text-slate-900 shadow-none border border-slate-300 hover:bg-slate-50"
            disabled={!demoMode && !securePortalUrl}
            onClick={beginSecureSignIn}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 font-semibold text-[#4285F4]">G</span>
            {securePortalUrl ? "Continue with approved Gmail" : "Continue with Google"}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">Recommended for existing ncidose Google Group members</p>

          <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <label htmlFor="portal-email" className="font-mono text-xs uppercase tracking-wider text-slate-600">Sign in with an email code</label>
          <div className="mt-2 flex gap-2">
            <Input
              id="portal-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@institution.edu"
              className="h-11 rounded-none"
              disabled={emailStep === "sent"}
            />
            <Button
              variant="outline"
              className="h-11 rounded-none"
              disabled={(!demoMode && !securePortalUrl) || !email.includes("@")}
              onClick={() => {
                if (securePortalUrl) {
                  window.location.assign(securePortalUrl);
                  return;
                }
                setEmailStep("sent");
              }}
            >
              {securePortalUrl ? "Continue" : "Send code"}
            </Button>
          </div>
          {securePortalUrl && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Email verification is completed on the secure Cloudflare Access screen. A one-time code will be sent there.
            </p>
          )}
          {emailStep === "sent" && (
            <div className="mt-3 border border-primary/20 bg-primary/5 p-3 text-sm text-slate-700">
              Preview: a one-time sign-in code would be sent to <strong>{email}</strong>.
            </div>
          )}

          <div className="mt-7 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
            First-time users still need an approved Software Transfer Agreement. Existing approvals will be carried over without re-registration.
          </div>

          <div className="mt-4 flex items-start gap-2 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            After signing in, this browser can remain signed in for up to 30 days. A new code is normally needed only on a new browser, after signing out, or when the session expires.
          </div>

          <Link
            to="/portal/request-access"
            className="mt-5 flex items-center justify-center gap-2 border border-primary px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-white"
          >
            Request access as a new user <ChevronRight className="h-4 w-4" />
          </Link>

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
            The NCI Technology Transfer Center remains responsible for reviewing and executing the Software Transfer Agreement. The portal keeps your request status and account activation in one place.
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
        <Link to="/" className="text-lg font-light tracking-tight">NCI Dose Tools</Link>
        <div className="hidden border-l border-border pl-6 font-mono text-xs uppercase tracking-widest text-primary sm:block">User Portal</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <div className="text-sm font-medium text-slate-800">{user.name}</div>
          <div className="text-xs text-muted-foreground">{user.primaryEmail}</div>
        </div>
        <button type="button" onClick={onSignOut} className="flex h-9 w-9 items-center justify-center border border-border text-muted-foreground hover:border-primary hover:text-primary" aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  </header>
);

const PortalSidebar = ({ section, isAdmin }: { section: PortalSection; isAdmin: boolean }) => (
  <aside className="sticky top-16 z-30 hidden h-[calc(100vh-4rem)] w-64 shrink-0 self-start border-r border-border bg-white px-4 py-6 lg:block">
    <nav className="space-y-1">
      {portalNav.map((item) => (
        <PortalNavLink key={item.id} item={item} active={section === item.id} />
      ))}
      {isAdmin && (
        <>
          <div className="my-5 border-t border-border" />
          <PortalNavLink item={{ id: "admin", label: "Admin", icon: Settings }} active={section === "admin"} />
        </>
      )}
    </nav>
    <div className="absolute bottom-6 left-4 right-4 border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-800"><ShieldCheck className="h-4 w-4 text-primary" /> Access approved</div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Software access is governed by your approved agreement.</p>
    </div>
  </aside>
);

const PortalMobileNav = ({ section, isAdmin }: { section: PortalSection; isAdmin: boolean }) => (
  <nav className="fixed inset-x-0 top-16 z-40 flex overflow-x-auto border-b border-border bg-white px-3 py-2 lg:hidden">
    {[...portalNav, ...(isAdmin ? [{ id: "admin" as const, label: "Admin", icon: Settings }] : [])].map((item) => (
      <PortalNavLink key={item.id} item={item} active={section === item.id} />
    ))}
  </nav>
);

const PortalNavLink = ({ item, active }: { item: { id: PortalSection; label: string; icon: typeof LayoutDashboard }; active: boolean }) => (
  <Link to={item.id === "overview" ? "/portal" : `/portal/${item.id}`} className={cn("flex items-center gap-3 px-4 py-3 text-sm transition-colors", active ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50 hover:text-primary")}>
    <item.icon className="h-4 w-4" /> {item.label}
  </Link>
);

const Overview = ({ user }: { user: PortalUser }) => (
  <div className="space-y-8">
    <div className="grid gap-4 md:grid-cols-3">
      <StatusCard icon={FileCheck2} label="STA status" value={user.staStatus} note={`Approved ${user.staApprovedOn}`} />
      <StatusCard icon={FileArchive} label="Available products" value="5" note="Current research distributions" />
      <StatusCard icon={Bell} label="Unread updates" value="2" note="Release announcements" />
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
        <div className="font-mono text-xs uppercase tracking-widest text-primary">Latest announcement</div>
        <h2 className="mt-4 text-xl font-light leading-snug">{portalAnnouncements[1].title}</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{portalAnnouncements[1].summary}</p>
        <div className="mt-6 text-xs font-mono text-slate-400">{portalAnnouncements[1].date}</div>
        <Link to="/portal/announcements" className="mt-8 inline-flex items-center gap-2 text-sm text-primary">Read announcements <ChevronRight className="h-4 w-4" /></Link>
      </section>
    </div>
  </div>
);

const StatusCard = ({ icon: Icon, label, value, note }: { icon: typeof ShieldCheck; label: string; value: string; note: string }) => (
  <div className="border border-border bg-white p-5">
    <div className="flex items-start justify-between"><div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{label}</div><Icon className="h-5 w-5 text-primary" /></div>
    <div className="mt-5 text-3xl font-light text-slate-900">{value}</div>
    <div className="mt-2 text-xs text-muted-foreground">{note}</div>
  </div>
);

type PortalFile = { key: string; size: number; etag: string };

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

const Downloads = ({ demoMode }: { demoMode: boolean }) => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [rootPrefix, setRootPrefix] = useState("NCICT/");
  const [prefix, setPrefix] = useState("NCICT/");
  const [files, setFiles] = useState<PortalFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
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
      setFolders((current) => nextCursor ? [...current, ...body.folders] : body.folders);
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

  const normalizedSearch = search.trim().toLowerCase();
  const visibleFolders = folders.filter((folder) => itemName(folder).toLowerCase().includes(normalizedSearch));
  const visibleFiles = files.filter((file) => itemName(file.key).toLowerCase().includes(normalizedSearch));

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
          {!demoMode && <div className="font-mono text-xs text-muted-foreground">{folders.length} folders · {files.length} files</div>}
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
              <button key={folder} type="button" onClick={() => void loadFolder(folder)} className="flex w-full items-center gap-4 px-6 py-4 text-left hover:bg-slate-50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-slate-50"><Folder className="h-5 w-5 text-primary" /></div>
                <div><div className="text-sm font-medium text-slate-800">{itemName(folder)}</div><div className="mt-1 text-xs text-muted-foreground">Folder</div></div>
                <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </button>
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
};

const announcementDate = (value: string | null) => {
  if (!value) return "Date not specified";
  const normalized = value.length === 10 ? `${value}T12:00:00` : value.includes(" ") ? `${value.replace(" ", "T")}Z` : value;
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(new Date(normalized));
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
  }));
  const items = demoMode ? demoAnnouncements : announcements;
  const selected = items.find((announcement) => announcement.id === selectedId) || items[0];

  useEffect(() => {
    if (!selectedId && items[0]) setSelectedId(items[0].id);
  }, [items, selectedId]);

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
          : items.length === 0 ? <div className="border border-border bg-white p-12 text-center"><Megaphone className="mx-auto h-8 w-8 text-primary" /><h2 className="mt-4 text-lg font-light">No announcements have been published yet.</h2><p className="mt-2 text-sm text-muted-foreground">Historical Google Groups announcements can be added from the administrator screen.</p></div>
            : <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start">
              <section className="border border-border bg-white">
                <div className="border-b border-border px-5 py-4"><div className="font-mono text-xs uppercase tracking-widest text-primary">Announcement archive</div><p className="mt-2 text-xs text-muted-foreground">Select an announcement to read the full post.</p></div>
                <div className="divide-y divide-border">
                  {items.map((announcement, index) => (
                    <button key={announcement.id} type="button" onClick={() => selectAnnouncement(announcement.id)} className={cn("block w-full px-5 py-5 text-left transition-colors", selected?.id === announcement.id ? "bg-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]" : "hover:bg-slate-50")}>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>{dateLabel(announcement)}</span><span>·</span><span className="text-primary">{announcement.category}</span>{index === 0 && <span className="ml-auto bg-primary px-2 py-0.5 text-[10px] text-white">Latest</span>}</div>
                      <h2 className={cn("mt-2 text-sm leading-snug", selected?.id === announcement.id ? "font-medium text-slate-900" : "text-slate-700")}>{announcement.title}</h2>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{announcement.summary}</p>
                    </button>
                  ))}
                </div>
              </section>

              {selected && <article id="announcement-detail" className="scroll-mt-24 border border-border bg-white p-6 sm:p-8 xl:sticky xl:top-24">
                <div className="flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-wider text-muted-foreground"><span>{dateLabel(selected)}</span><span className="border border-primary/20 bg-primary/5 px-2 py-1 text-primary">{selected.category}</span></div>
                <h2 className="mt-5 text-2xl font-light leading-tight text-slate-900 sm:text-3xl">{selected.title}</h2>
                <div className="mt-6 border-t border-border pt-6"><p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{selected.body}</p></div>
                <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-border pt-5 font-mono text-xs uppercase tracking-wider text-slate-400"><span>{selected.audience === "approved_users" ? "Approved users" : "Public"}</span>{selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Original Google Groups post <ExternalLink className="h-3 w-3" /></a>}</div>
              </article>}
            </div>}
    </div>
  );
};

const Account = ({ user, setUser }: { user: PortalUser; setUser: (user: PortalUser) => void }) => {
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"idle" | "sent" | "verified">("idle");
  const identities = useMemo(
    () => step === "verified" && !user.identities.some((identity) => identity.email === newEmail)
      ? [...user.identities, { id: "new-email", provider: "Email", email: newEmail, verified: true, primary: false }]
      : user.identities,
    [newEmail, step, user.identities],
  );

  const makePrimary = (email: string) => {
    setUser({ ...user, primaryEmail: email, identities: identities.map((identity) => ({ ...identity, primary: identity.email === email })) } as PortalUser);
    setStep("idle");
    setCode("");
    setNewEmail("");
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <section className="border border-border bg-white p-6 sm:p-8">
        <div className="flex items-start gap-4"><div className="flex h-12 w-12 items-center justify-center border border-primary text-primary"><UserRoundCheck className="h-6 w-6" /></div><div><h2 className="text-xl font-light">Approved access</h2><p className="mt-1 text-sm text-muted-foreground">Your existing approval has been carried into the portal.</p></div></div>
        <dl className="mt-8 grid gap-5 border-t border-border pt-6 sm:grid-cols-2">
          <div><dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Status</dt><dd className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-emerald-700"><Check className="h-4 w-4" /> {user.staStatus}</dd></div>
          <div><dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Approved</dt><dd className="mt-2 text-sm text-slate-800">{user.staApprovedOn}</dd></div>
          <div><dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Institution</dt><dd className="mt-2 text-sm text-slate-800">{user.institution}</dd></div>
          <div><dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Primary email</dt><dd className="mt-2 text-sm text-slate-800">{user.primaryEmail}</dd></div>
        </dl>
      </section>

      <section className="border border-border bg-white p-6 sm:p-8">
        <div className="font-mono text-xs uppercase tracking-widest text-primary">Login methods</div>
        <div className="mt-5 space-y-3">
          {identities.map((identity) => (
            <div key={identity.id} className="border border-border p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-medium text-slate-800">{identity.email}</div><div className="mt-1 text-xs text-muted-foreground">{identity.provider} · Verified</div></div>{identity.primary && <span className="bg-primary/10 px-2 py-1 font-mono text-xs text-primary">Primary</span>}</div>{!identity.primary && <button type="button" onClick={() => makePrimary(identity.email)} className="mt-3 text-xs text-primary hover:underline">Make primary</button>}</div>
          ))}
        </div>
      </section>

      <section className="border border-border bg-white p-6 sm:p-8 xl:col-span-2">
        <div className="flex items-start gap-4"><div className="flex h-10 w-10 items-center justify-center border border-primary text-primary"><Mail className="h-5 w-5" /></div><div><h2 className="text-lg font-medium">Use your institutional email</h2><p className="mt-1 text-sm text-muted-foreground">Optional: add and verify another email without changing your STA approval or download history.</p></div></div>
        <div className="mt-6 max-w-xl">
          <div className="flex gap-2"><Input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="name@institution.edu" disabled={step !== "idle"} className="rounded-none" /><Button variant="outline" disabled={!newEmail.includes("@") || step !== "idle"} onClick={() => setStep("sent")} className="rounded-none"><Plus className="h-4 w-4" /> Add email</Button></div>
          {step === "sent" && <div className="mt-4 border border-border bg-slate-50 p-4"><p className="text-sm text-slate-700">Enter the verification code sent to {newEmail}. Preview code: <strong>246810</strong></p><div className="mt-3 flex gap-2"><Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="6-digit code" className="max-w-48 rounded-none" /><Button disabled={code !== "246810"} onClick={() => setStep("verified")} className="rounded-none">Verify</Button></div></div>}
          {step === "verified" && <div className="mt-4 flex items-center gap-2 border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><Check className="h-4 w-4" /> {newEmail} is verified. You may make it your primary login above.</div>}
        </div>
      </section>
    </div>
  );
};

const Admin = ({ demoMode }: { demoMode: boolean }) => {
  const { toast } = useToast();
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementCategory, setAnnouncementCategory] = useState<"Release" | "Maintenance" | "Access">("Release");
  const [originalPublishedAt, setOriginalPublishedAt] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [savingAnnouncement, setSavingAnnouncement] = useState<"draft" | "published" | null>(null);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [adminAnnouncements, setAdminAnnouncements] = useState<LiveAnnouncement[]>([]);
  const [loadingAdminAnnouncements, setLoadingAdminAnnouncements] = useState(!demoMode);
  const previewAction = (name: string, action: string) => toast({ title: `${action} preview`, description: `${name}'s request would be updated after the production database is connected.` });
  const requests = [
    { id: "NCID-2026-081", name: "Dr. Maya Chen", institution: "Example Medical Center", stage: "Executed STA received", action: "Activate" },
    { id: "NCID-2026-080", name: "Prof. Daniel Rossi", institution: "Example University", stage: "NCI review", action: "View" },
    { id: "NCID-2026-079", name: "Dr. Amina Yusuf", institution: "Research Institute", stage: "Awaiting STA", action: "Remind" },
  ];

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

  const clearAnnouncementForm = () => {
    setAnnouncementTitle("");
    setAnnouncementBody("");
    setOriginalPublishedAt("");
    setSourceUrl("");
    setAnnouncementCategory("Release");
    setEditingAnnouncementId(null);
  };

  const editAnnouncement = (announcement: LiveAnnouncement) => {
    setEditingAnnouncementId(announcement.id);
    setAnnouncementTitle(announcement.title);
    setAnnouncementBody(announcement.body);
    setAnnouncementCategory(announcement.category);
    setOriginalPublishedAt(announcement.originalPublishedAt?.slice(0, 10) || "");
    setSourceUrl(announcement.sourceUrl || "");
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
        }),
      });
      if (!response.ok) throw new Error("The announcement could not be saved.");
      const responseBody = await response.json();
      setAdminAnnouncements((current) => {
        const remaining = current.filter((announcement) => announcement.id !== responseBody.announcement.id);
        return [responseBody.announcement, ...remaining].sort((left, right) => String(right.originalPublishedAt || right.publishedAt || "").localeCompare(String(left.originalPublishedAt || left.publishedAt || "")));
      });
      const wasEditing = Boolean(editingAnnouncementId);
      clearAnnouncementForm();
      toast({ title: status === "published" ? (wasEditing ? "Published announcement updated" : "Announcement published") : (wasEditing ? "Draft updated" : "Draft saved"), description: originalPublishedAt ? "The original Google Groups date was preserved." : "The announcement is stored in the portal." });
    } catch (error) {
      toast({ title: "Unable to save announcement", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSavingAnnouncement(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <StatusCard icon={Users} label="Portal eligible" value="239" note="Current Google Group members" />
        <StatusCard icon={ClipboardCheck} label="Access requests" value="3" note="Preview workflow queue" />
        <StatusCard icon={FileArchive} label="R2 objects" value="2,773" note="9.01 GB verified" />
        <StatusCard icon={Download} label="Downloads" value="—" note="Tracking begins at launch" />
      </div>

      <section className="border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5">
          <div><div className="font-mono text-xs uppercase tracking-widest text-primary">Access workflow</div><h2 className="mt-2 text-xl font-light">STA and account activation</h2></div>
          <Link to="/portal/request-access" className="inline-flex items-center gap-2 text-sm text-primary">Preview request form <ExternalLink className="h-4 w-4" /></Link>
        </div>
        <div className="divide-y divide-border">
          {requests.map((request) => (
            <div key={request.id} className="grid gap-4 px-6 py-5 md:grid-cols-[1fr_1fr_180px_auto] md:items-center">
              <div><div className="font-mono text-xs text-primary">{request.id}</div><div className="mt-1 text-sm font-medium text-slate-800">{request.name}</div></div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="h-4 w-4" /> {request.institution}</div>
              <div><span className={cn("inline-flex px-2 py-1 font-mono text-xs", request.stage === "Executed STA received" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>{request.stage}</span></div>
              <Button variant={request.action === "Activate" ? "default" : "outline"} className="rounded-none" onClick={() => previewAction(request.name, request.action)}>{request.action}</Button>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section id="announcement-editor" className="scroll-mt-24 border border-border bg-white p-6">
          <div className="flex items-center justify-between"><div><div className="font-mono text-xs uppercase tracking-widest text-primary">Announcements</div><h2 className="mt-2 text-xl font-light">{editingAnnouncementId ? "Edit announcement" : "Publish or migrate an update"}</h2></div><Megaphone className="h-5 w-5 text-primary" /></div>
          {editingAnnouncementId && <div className="mt-3 inline-flex bg-amber-50 px-2 py-1 font-mono text-xs text-amber-800">Editing existing announcement</div>}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">For a Google Groups post, copy the original title and body and enter its original date. Leave the historical fields blank for a new portal announcement.</p>
          <div className="mt-6 space-y-3">
            <Input value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} placeholder="Announcement title" className="rounded-none" />
            <div className="grid gap-3 sm:grid-cols-2">
              <label><span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Category</span><select value={announcementCategory} onChange={(event) => setAnnouncementCategory(event.target.value as typeof announcementCategory)} className="mt-2 h-10 w-full rounded-none border border-input bg-white px-3 text-sm"><option>Release</option><option>Maintenance</option><option>Access</option></select></label>
              <label><span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Original post date</span><Input type="date" value={originalPublishedAt} onChange={(event) => setOriginalPublishedAt(event.target.value)} className="mt-2 rounded-none" /></label>
            </div>
            <Input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="Original Google Groups URL (optional)" className="rounded-none" />
            <textarea value={announcementBody} onChange={(event) => setAnnouncementBody(event.target.value)} className="min-h-44 w-full border border-input bg-background p-3 text-sm outline-none focus:border-primary" placeholder="Copy the complete announcement body…" />
            <div className="flex flex-wrap justify-end gap-2">
              {editingAnnouncementId && <Button type="button" variant="ghost" disabled={savingAnnouncement !== null} onClick={clearAnnouncementForm} className="rounded-none">Cancel edit</Button>}
              <Button type="button" variant="outline" disabled={savingAnnouncement !== null} onClick={() => void saveAnnouncement("draft")} className="rounded-none">{savingAnnouncement === "draft" && <Loader2 className="h-4 w-4 animate-spin" />} {editingAnnouncementId ? "Save as draft" : "Save draft"}</Button>
              <Button type="button" disabled={savingAnnouncement !== null} onClick={() => void saveAnnouncement("published")} className="rounded-none">{savingAnnouncement === "published" && <Loader2 className="h-4 w-4 animate-spin" />} {editingAnnouncementId ? "Update and publish" : "Publish"}</Button>
            </div>
          </div>
        </section>
        <section className="border border-border bg-white p-6"><div className="flex items-center justify-between"><div><div className="font-mono text-xs uppercase tracking-widest text-primary">Migration</div><h2 className="mt-2 text-xl font-light">Existing user transition</h2></div><Users className="h-5 w-5 text-primary" /></div><div className="mt-6 space-y-3">{["Import 239 eligible Google Group accounts", "Let existing users sign in without re-registration", "Offer optional institutional email verification", "Run Google Group and portal in parallel"].map((item, index) => <div key={item} className="flex items-center gap-3 border border-border p-3"><div className="flex h-6 w-6 items-center justify-center bg-primary/10 font-mono text-xs text-primary">{index + 1}</div><span className="text-sm text-slate-700">{item}</span></div>)}</div></section>
      </div>

      <section className="border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5"><div><div className="font-mono text-xs uppercase tracking-widest text-primary">Announcement management</div><h2 className="mt-2 text-xl font-light">Published posts and drafts</h2></div><div className="font-mono text-xs text-muted-foreground">{adminAnnouncements.length} posts</div></div>
        {loadingAdminAnnouncements ? <div className="flex items-center justify-center gap-3 p-10 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading announcement list…</div>
          : adminAnnouncements.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No announcements have been saved.</div>
            : <div className="divide-y divide-border">
              {adminAnnouncements.map((announcement) => (
                <div key={announcement.id} className="grid gap-4 px-6 py-5 md:grid-cols-[170px_minmax(0,1fr)_auto] md:items-center">
                  <div><div className="font-mono text-xs text-muted-foreground">{announcementDate(announcement.originalPublishedAt || announcement.publishedAt)}</div><span className={cn("mt-2 inline-flex px-2 py-1 font-mono text-[11px] uppercase", announcement.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>{announcement.status}</span></div>
                  <div className="min-w-0"><div className="text-sm font-medium text-slate-800">{announcement.title}</div><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{announcement.summary}</p></div>
                  <Button type="button" variant="outline" onClick={() => editAnnouncement(announcement)} className="rounded-none">Edit</Button>
                </div>
              ))}
            </div>}
      </section>
    </div>
  );
};

export default Portal;
