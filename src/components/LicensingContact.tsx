import { useState } from "react";
import { Copy, Mail } from "lucide-react";
import { createLicensingMailto, createLicensingMessage, LICENSING_EMAIL } from "@/lib/licensing";

export const LicensingContact = ({ product, tool = "suite", location = "vendor_commercial_access" }: { product?: string; tool?: string; location?: string }) => {
  const [status, setStatus] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const { subject, body } = createLicensingMessage(product);
  const message = `To: ${LICENSING_EMAIL}\nSubject: ${subject}\n\n${body}`;
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`${label} copied.`);
    } catch {
      setShowMessage(true);
      setStatus("Select and copy the email address or message below.");
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">Contact Dr. Kevin Chang at the NCI Technology Transfer Center about licensing, deployment scale, or commercial integration.</p>
      <a href={createLicensingMailto(product)} className="btn-precision inline-flex items-center justify-center gap-2" data-analytics-location={location} data-analytics-tool={tool} data-analytics-audience="vendor" data-analytics-action="email_licensing">
        <Mail className="h-4 w-4 shrink-0" /> Email Dr. Kevin Chang
      </a>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="select-all break-all font-medium text-slate-800">{LICENSING_EMAIL}</span>
        <button type="button" onClick={() => copy(LICENSING_EMAIL, "Email address")} className="inline-flex items-center gap-1 text-primary underline underline-offset-4"><Copy className="h-3.5 w-3.5" /> Copy email address</button>
      </div>
      <details open={showMessage} onToggle={(event) => setShowMessage(event.currentTarget.open)} className="text-sm">
        <summary className="cursor-pointer text-primary">Use webmail or view the prepared inquiry</summary>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Paste this template into your email service and fill in the details you know.</p>
        <textarea aria-label="Prepared licensing inquiry" readOnly value={message} rows={11} className="mt-3 w-full resize-y border border-border bg-slate-50 p-3 text-xs leading-relaxed text-slate-800" />
        <button type="button" onClick={() => copy(message, "Inquiry")} className="mt-2 inline-flex items-center gap-2 text-primary underline underline-offset-4"><Copy className="h-3.5 w-3.5" /> Copy inquiry</button>
      </details>
      <p role="status" className="text-xs text-slate-600">{status}</p>
    </div>
  );
};
