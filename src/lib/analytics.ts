const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();

export const analyticsCtaEvents = [
  "portal_login_click",
  "research_access_start",
  "vendor_evaluation_start",
  "documentation_click",
] as const;

export type AnalyticsCtaEvent = (typeof analyticsCtaEvents)[number];

export type AnalyticsEventMetadata = {
  ctaLocation?: string;
  tool?: string;
  audience?: string;
  action?: string;
};

const analyticsCtaEventSet = new Set<string>(analyticsCtaEvents);
const safeDimensionPattern = /^[a-z0-9_]{1,64}$/;
const audienceAliases: Record<string, string> = {
  all: "general",
  general: "general",
  approved_user: "approved_user",
  research: "researcher",
  researcher: "researcher",
  vendor: "vendor",
};

export const isAnalyticsCtaEvent = (
  value: string | undefined,
): value is AnalyticsCtaEvent => Boolean(value && analyticsCtaEventSet.has(value));

const safeDimension = (value: string | undefined) => {
  const normalized = value?.trim().toLowerCase();
  return normalized && safeDimensionPattern.test(normalized)
    ? normalized
    : "unspecified";
};

const safeAudience = (value: string | undefined) =>
  audienceAliases[value?.trim().toLowerCase() ?? ""] ?? "unspecified";

const eventContext = (path: string, metadata: AnalyticsEventMetadata) => ({
  page_location: new URL(path, window.location.origin).href,
  page_path: path,
  cta_location: safeDimension(metadata.ctaLocation),
  tool: safeDimension(metadata.tool),
  audience: safeAudience(metadata.audience),
  cta_action: safeDimension(metadata.action),
});

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export const initializeAnalytics = () => {
  if (!measurementId || typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // Google Tag expects each queued command to retain the function's Arguments object.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
};

export const trackPageView = (path: string) => {
  if (!measurementId || typeof window === "undefined" || typeof window.gtag !== "function") return;

  window.gtag("event", "page_view", {
    page_title: document.title,
    page_location: new URL(path, window.location.origin).href,
    page_path: path,
  });
};

export const trackPageNotFound = (path: string) => {
  if (!measurementId || typeof window === "undefined" || typeof window.gtag !== "function") return;

  window.gtag("event", "page_not_found", {
    page_location: new URL(path, window.location.origin).href,
    page_path: path,
    page_referrer: document.referrer,
  });
};

export const trackCtaEvent = (
  eventName: AnalyticsCtaEvent,
  path: string,
  metadata: AnalyticsEventMetadata = {},
) => {
  if (
    !isAnalyticsCtaEvent(eventName)
    || !measurementId
    || typeof window === "undefined"
    || typeof window.gtag !== "function"
  ) return;

  window.gtag("event", eventName, eventContext(path, metadata));
};

export const trackLicensingEmailClick = (
  path: string,
  metadata: AnalyticsEventMetadata = {},
) => {
  if (!measurementId || typeof window === "undefined" || typeof window.gtag !== "function") return;

  window.gtag("event", "licensing_email_click", {
    ...eventContext(path, metadata),
    contact_type: "commercial_licensing",
  });
};

export const trackResearchAccessPdfPrepared = (
  path: string,
  metadata: AnalyticsEventMetadata = {},
) => {
  if (!measurementId || typeof window === "undefined" || typeof window.gtag !== "function") return;

  window.gtag("event", "research_access_pdf_prepared", eventContext(path, metadata));
};
