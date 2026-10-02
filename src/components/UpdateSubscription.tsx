import { type FormEvent, useEffect, useId, useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const UpdateSubscription = ({ source = "homepage", compact = false, collapsible = false }: { source?: "homepage" | "sta" | "vendor"; compact?: boolean; collapsible?: boolean }) => {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!compact || source !== "homepage") return;
    const openFromLink = () => {
      if (window.location.hash === "#stay-updated") setOpen(true);
    };
    openFromLink();
    window.addEventListener("hashchange", openFromLink);
    window.addEventListener("ncidose:subscribe", openFromLink);
    return () => {
      window.removeEventListener("hashchange", openFromLink);
      window.removeEventListener("ncidose:subscribe", openFromLink);
    };
  }, [compact, source]);

  const subscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("https://portal.ncidosetools.com/api/public/subscriptions", {
        method: "POST",
        credentials: "omit",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source, website, consent: true }),
      });
      if (!response.ok) throw new Error(response.status === 429
        ? "Too many requests. Please wait and try again later."
        : "We could not register your subscription. Please try again shortly.");
      setSubmitted(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again shortly.");
    } finally {
      setBusy(false);
    }
  };

  const content = (
    <section id={!compact && source === "homepage" ? "stay-updated" : undefined} aria-labelledby={`${id}-heading`} className={compact || collapsible ? "" : "scroll-mt-24 border border-primary/30 bg-sky-50/70 p-6 sm:p-7"}>
      <div className="flex items-start gap-3">
        <Mail className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-heading`} className={compact ? "text-lg font-medium" : "text-xl font-medium"}>{compact ? "Stay updated" : "Stay updated on NCI Dose Tools"}</h2>
          <p id={`${id}-description`} className="mt-2 text-sm leading-relaxed text-slate-600">
            {compact ? "Scientific updates by email. No STA or license required." : "Get scientific updates on dose calculations, models, and data. No STA or license agreement required to subscribe."}
          </p>
        </div>
      </div>
      {submitted ? (
        <div role="status" className="mt-5 flex gap-3 border border-emerald-200 bg-white p-4 text-sm text-emerald-900">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p>Check your inbox to confirm your subscription. We will send a welcome email once you confirm. If you already subscribe, you are all set.</p>
        </div>
      ) : (
        <form onSubmit={subscribe} className="mt-5" aria-label="Subscribe to scientific updates">
          <div className={`flex flex-col gap-3 ${source === "homepage" && !compact ? "sm:flex-row sm:items-end" : ""}`}>
            <div className="min-w-0 flex-1">
              <label htmlFor={`${id}-email`} className="mb-2 block text-sm font-medium">Email address</label>
              <Input id={`${id}-email`} type="email" autoComplete="email" maxLength={254} required disabled={busy} value={email} onChange={(event) => setEmail(event.target.value)} aria-describedby={`${id}-description ${id}-terms`} placeholder="you@example.org" className="h-11 rounded-none bg-white" />
            </div>
            <div className="hidden" aria-hidden="true"><label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label></div>
            <Button type="submit" disabled={busy} className="h-11 rounded-none px-6">{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{busy ? "Subscribing…" : "Subscribe"}</Button>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
          <p id={`${id}-terms`} className="mt-3 text-xs leading-relaxed text-slate-500">{compact ? "Scientific updates only. Unsubscribe anytime." : "By subscribing, you agree to receive scientific update emails. Maintenance updates are excluded. Unsubscribe anytime."}</p>
        </form>
      )}
    </section>
  );

  if (collapsible) return (
    <details className="border border-primary/25 bg-sky-50/50 p-4">
      <summary className="cursor-pointer text-sm font-medium text-primary">Stay updated — scientific updates by email</summary>
      <div className="mt-4">{content}</div>
    </details>
  );

  return compact ? (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button id="stay-updated" type="button" className="inline-flex h-8 scroll-mt-24 items-center gap-2 border border-primary/25 bg-background/95 px-3 text-xs font-medium text-primary transition-colors hover:border-primary hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <Mail className="h-3.5 w-3.5" aria-hidden="true" /> Stay updated
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(22rem,calc(100vw-2rem))] rounded-none bg-white p-5 shadow-lg">
        {content}
      </PopoverContent>
    </Popover>
  ) : content;
};
