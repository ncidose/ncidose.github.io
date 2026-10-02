import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname, hash, key, state } = useLocation();

  useEffect(() => {
    if (state?.preserveScroll) return;
    // If there's a hash, let the browser handle scrolling to the anchor
    if (hash) {
      const timer = setTimeout(() => {
        const element = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (element) {
          element.scrollIntoView({ behavior: hash === "#stay-updated" ? "instant" : "smooth" });
        }
        if (hash === "#stay-updated") window.dispatchEvent(new Event("ncidose:subscribe"));
      }, 0);
      return () => clearTimeout(timer);
    } else {
      // Otherwise, scroll to top
      window.scrollTo(0, 0);
    }
  }, [pathname, hash, key, state]);

  return null;
};
