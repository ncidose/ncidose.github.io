import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackLicensingEmailClick, trackPageView } from "@/lib/analytics";

const licensingEmail = "kevin.chang@nih.gov";

export const Analytics = () => {
  const { pathname, search } = useLocation();
  const pagePath = `${pathname}${search}`;

  useEffect(() => {
    trackPageView(pagePath);
  }, [pagePath]);

  useEffect(() => {
    const trackLicensingLink = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href^="mailto:"]');
      const href = link?.getAttribute("href");
      if (!href) return;

      const recipient = href.slice("mailto:".length).split("?", 1)[0].trim().toLowerCase();
      if (recipient === licensingEmail) trackLicensingEmailClick(pagePath);
    };

    document.addEventListener("click", trackLicensingLink);
    return () => document.removeEventListener("click", trackLicensingLink);
  }, [pagePath]);

  return null;
};
