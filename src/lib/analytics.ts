const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();

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
  if (!measurementId || typeof window.gtag !== "function") return;

  window.gtag("event", "page_view", {
    page_title: document.title,
    page_location: new URL(path, window.location.origin).href,
    page_path: path,
  });
};

export const trackPageNotFound = (path: string) => {
  if (!measurementId || typeof window.gtag !== "function") return;

  window.gtag("event", "page_not_found", {
    page_location: new URL(path, window.location.origin).href,
    page_path: path,
    page_referrer: document.referrer,
  });
};

export const trackLicensingEmailClick = (path: string) => {
  if (!measurementId || typeof window.gtag !== "function") return;

  window.gtag("event", "licensing_email_click", {
    page_location: new URL(path, window.location.origin).href,
    page_path: path,
    contact_type: "commercial_licensing",
  });
};
