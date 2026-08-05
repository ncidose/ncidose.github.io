import { canonicalUrl, siteName, siteOrigin } from "@/data/seoRoutes";

type JsonLd = Record<string, unknown> | Array<Record<string, unknown>>;

export type PageSeo = {
  title: string;
  description: string;
  pathname: string;
  heading?: string;
  schemaType?: string;
  noindex?: boolean;
  jsonLd?: JsonLd;
};

const upsertMeta = (selector: string, attributes: Record<string, string>) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([name, value]) => element?.setAttribute(name, value));
};

const upsertCanonical = (href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = href;
};

const breadcrumbName = (segment: string) => {
  const names: Record<string, string> = {
    tools: "Our Tools",
    manuals: "Manuals",
    versions: "Release History",
    literature: "Literature Registry",
    discussions: "Discussions",
    researchers: "For Researchers",
    vendors: "For Vendors",
    resources: "Links and Resources",
    ncict: "NCICT",
    ncirf: "NCIRF",
    ncinm: "NCINM",
    phantom: "PHANTOM",
    "ncict-api": "NCICT API",
    "ncirf-api": "NCIRF API",
    "ncinm-api": "NCINM API",
  };
  return names[segment] || segment.replace(/[-_]+/g, " ");
};

const breadcrumbSchema = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return null;

  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: siteName,
        item: `${siteOrigin}/`,
      },
      ...segments.map((segment, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: breadcrumbName(segment),
        item: canonicalUrl(`/${segments.slice(0, index + 1).join("/")}`),
      })),
    ],
  };
};

const defaultStructuredData = (seo: PageSeo) => {
  const url = canonicalUrl(seo.pathname);
  const entity: Record<string, unknown> = {
    "@type": seo.schemaType || "WebPage",
    name: seo.heading || seo.title.replace(/\s*\|.*$/, ""),
    description: seo.description,
    url,
    isPartOf: { "@id": `${siteOrigin}/#website` },
    publisher: {
      "@type": "Organization",
      name: "National Cancer Institute",
      url: "https://www.cancer.gov/",
    },
  };

  if (seo.schemaType === "SoftwareApplication") {
    entity.applicationCategory = "ScientificApplication";
    entity.operatingSystem = "Windows, macOS, Linux";
    entity.offers = {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "No charge for approved non-commercial research use under the applicable agreement.",
    };
  }

  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebSite",
      "@id": `${siteOrigin}/#website`,
      name: siteName,
      url: `${siteOrigin}/`,
      description:
        "Public technical documentation and user-support resources for NCI-developed radiation dosimetry tools.",
    },
    entity,
  ];
  const breadcrumbs = breadcrumbSchema(seo.pathname);
  if (breadcrumbs) graph.push(breadcrumbs);

  return { "@context": "https://schema.org", "@graph": graph };
};

export const applyPageSeo = (seo: PageSeo) => {
  const url = canonicalUrl(seo.pathname);
  const robots = seo.noindex
    ? "noindex,nofollow"
    : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";

  document.title = seo.title;
  document.documentElement.lang = "en";
  upsertCanonical(url);
  upsertMeta('meta[name="description"]', { name: "description", content: seo.description });
  upsertMeta('meta[name="robots"]', { name: "robots", content: robots });
  upsertMeta('meta[property="og:title"]', { property: "og:title", content: seo.title });
  upsertMeta('meta[property="og:description"]', { property: "og:description", content: seo.description });
  upsertMeta('meta[property="og:url"]', { property: "og:url", content: url });
  upsertMeta('meta[property="og:type"]', {
    property: "og:type",
    content: seo.schemaType === "TechArticle" || seo.schemaType === "DiscussionForumPosting" ? "article" : "website",
  });
  upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: siteName });
  upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary" });
  upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: seo.title });
  upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: seo.description });

  document.head.querySelectorAll('script[data-ncidose-seo="true"]').forEach((element) => element.remove());
  if (!seo.noindex) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.ncidoseSeo = "true";
    script.textContent = JSON.stringify(seo.jsonLd || defaultStructuredData(seo));
    document.head.appendChild(script);
  }
};
