import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  isAnalyticsCtaEvent,
  trackCtaEvent,
  trackLicensingEmailClick,
  trackPageView,
  type AnalyticsEventMetadata,
} from "@/lib/analytics";

const licensingEmail = "kevin.chang@nih.gov";

const metadataFor = (element: HTMLElement | null): AnalyticsEventMetadata => ({
  ctaLocation: element?.dataset.analyticsLocation,
  tool: element?.dataset.analyticsTool,
  audience: element?.dataset.analyticsAudience,
  action: element?.dataset.analyticsAction,
});

export const Analytics = () => {
  const { pathname, search } = useLocation();
  const pagePath = `${pathname}${search}`;

  useEffect(() => {
    trackPageView(pagePath);
  }, [pagePath]);

  useEffect(() => {
    const trackAnalyticsClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;

      const analyticsTarget = event.target.closest<HTMLElement>("[data-analytics-event]");
      const eventName = analyticsTarget?.dataset.analyticsEvent;
      if (isAnalyticsCtaEvent(eventName)) {
        trackCtaEvent(eventName, pagePath, metadataFor(analyticsTarget));
      }

      const link = event.target.closest<HTMLAnchorElement>('a[href^="mailto:"]');
      const href = link?.getAttribute("href");
      if (!href) return;

      const recipient = href.slice("mailto:".length).split("?", 1)[0].trim().toLowerCase();
      if (recipient === licensingEmail) {
        trackLicensingEmailClick(pagePath, metadataFor(analyticsTarget ?? link));
      }
    };

    document.addEventListener("click", trackAnalyticsClick);
    return () => document.removeEventListener("click", trackAnalyticsClick);
  }, [pagePath]);

  return null;
};
