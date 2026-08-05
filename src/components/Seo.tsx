import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { findSeoRoute } from "@/data/seoRoutes";
import { applyPageSeo } from "@/lib/seo";

export const Seo = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const route = findSeoRoute(pathname);
    if (!route) {
      applyPageSeo({
        pathname,
        title: "Page Not Found | NCI Dose Tools",
        description: "The requested NCI Dose Tools page could not be found.",
        noindex: true,
      });
      return;
    }

    applyPageSeo({
      pathname,
      title: route.title,
      heading: route.heading,
      description: route.description,
      schemaType: route.schemaType,
    });
  }, [pathname]);

  return null;
};
