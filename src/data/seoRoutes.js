export const siteOrigin = "https://ncidose.github.io";
export const siteName = "NCI Dose Tools";

const toolPages = [
  {
    id: "ncict",
    name: "NCICT",
    fullName: "National Cancer Institute dosimetry system for Computed Tomography",
    modality: "computed tomography",
    description:
      "NCICT estimates organ absorbed dose and effective dose for pediatric, adult, and pregnant patients undergoing computed tomography examinations.",
  },
  {
    id: "ncirf",
    name: "NCIRF",
    fullName: "National Cancer Institute dosimetry system for Radiography and Fluoroscopy",
    modality: "radiography and fluoroscopy",
    description:
      "NCIRF provides geometry-aware Monte Carlo organ and skin dose estimation for radiography and fluoroscopy research workflows.",
  },
  {
    id: "ncinm",
    name: "NCINM",
    fullName: "National Cancer Institute dosimetry system for Nuclear Medicine",
    modality: "nuclear medicine",
    description:
      "NCINM supports radionuclide and radiopharmaceutical absorbed-dose estimation for pediatric, adult, and pregnancy-oriented nuclear medicine research.",
  },
  {
    id: "phantom",
    name: "PHANTOM",
    fullName: "NCI Computational Human Phantom Libraries",
    modality: "computational anatomy",
    description:
      "The NCI computational human phantom libraries provide reference, size-dependent, pediatric, adult, and pregnant anatomical models for radiation dosimetry research.",
  },
];

const manualPages = [
  {
    id: "ncict",
    title: "NCICT 4 User Manual",
    description:
      "Installation, inputs, phantom selection, calculation workflow, batch processing, and result interpretation for NCICT 4.",
  },
  {
    id: "ncinm",
    title: "NCINM 3 User Manual",
    description:
      "Reference documentation for radionuclide and radiopharmaceutical organ-dose calculations with NCINM 3.",
  },
  {
    id: "ncirf",
    title: "NCIRF 4 User Manual",
    description:
      "Exposure geometry, phantom configuration, Monte Carlo calculation, batch processing, and output guidance for NCIRF 4.",
  },
  {
    id: "phantom",
    title: "PHANTOM User Manual",
    description:
      "Guide to the NCI reference, size-dependent, pediatric, adult, and pregnant computational human phantom libraries.",
  },
  {
    id: "ncict-api",
    title: "NCICT API Manual",
    description:
      "REST request structure, authentication, parameters, examples, and response format for the NCICT application programming interface.",
  },
  {
    id: "ncinm-api",
    title: "NCINM API Manual",
    description:
      "REST documentation for radionuclide and radiopharmaceutical dose-calculation workflows using the NCINM API.",
  },
  {
    id: "ncirf-api",
    title: "NCIRF API Manual",
    description:
      "REST requests, Geant4 calculation parameters, output, and integration documentation for the NCIRF API.",
  },
];

const releasePages = toolPages.map((tool) => ({
  id: tool.id,
  title: `${tool.name} Release History`,
  description: `Chronological technical record of ${tool.name} releases, calculation updates, maintenance changes, and compatibility notes.`,
}));

const literaturePages = toolPages.map((tool) => ({
  id: tool.id,
  title: `${tool.name} Publications`,
  description: `Peer-reviewed ${tool.name} and ${tool.modality} publications indexed from PubMed and PubMed Central.`,
}));

export const seoRoutes = [
  {
    path: "/",
    title: "NCI Dose Tools | Radiation Dosimetry Software and Documentation",
    heading: "NCI Dose Tools",
    description:
      "NCI-developed software, manuals, literature, release histories, and user support for CT, nuclear medicine, radiography, fluoroscopy, and computational phantom dosimetry.",
    schemaType: "WebSite",
  },
  {
    path: "/tools",
    title: "Radiation Dosimetry Software Suite | NCI Dose Tools",
    heading: "NCI Dose Tools Suite",
    description:
      "Compare NCICT, NCIRF, NCINM, and NCI computational phantom resources for organ-dose estimation across medical imaging modalities.",
    schemaType: "CollectionPage",
  },
  ...toolPages.map((tool) => ({
    path: `/tools/${tool.id}`,
    title: `${tool.name} | ${tool.fullName}`,
    heading: `${tool.name}: ${tool.fullName}`,
    description: tool.description,
    schemaType: tool.id === "phantom" ? "CollectionPage" : "SoftwareApplication",
    tool,
  })),
  {
    path: "/vendors",
    title: "Vendor Integration and REST APIs | NCI Dose Tools",
    heading: "Vendor Integration",
    description:
      "Technical overview of NCI Dose Tools REST API components, vendor evaluation, commercial integration, and licensing pathways.",
    schemaType: "WebPage",
  },
  {
    path: "/researchers",
    title: "Radiation Dosimetry Tools for Researchers | NCI Dose Tools",
    heading: "NCI Dose Tools for Researchers",
    description:
      "Research-grade organ-dose estimation resources for epidemiology, cohort studies, outcomes research, validation, and uncertainty analysis.",
    schemaType: "WebPage",
  },
  {
    path: "/manuals",
    title: "User Manuals and API Documentation | NCI Dose Tools",
    heading: "Manuals and API Documentation",
    description:
      "Search current NCICT, NCIRF, NCINM, computational phantom, and REST API manuals in the public NCI Dose Tools documentation library.",
    schemaType: "CollectionPage",
  },
  ...manualPages.map((manual) => ({
    path: `/manuals/${manual.id}`,
    title: `${manual.title} | NCI Dose Tools`,
    heading: manual.title,
    description: manual.description,
    schemaType: "TechArticle",
    manual,
  })),
  ...releasePages.map((release) => ({
    path: `/versions/${release.id}`,
    title: `${release.title} | NCI Dose Tools`,
    heading: release.title,
    description: release.description,
    schemaType: "TechArticle",
    release,
  })),
  {
    path: "/literature",
    title: "Radiation Dosimetry Literature Registry | NCI Dose Tools",
    heading: "NCI Dose Tools Publications",
    description:
      "Search a maintained registry of NCICT, NCIRF, NCINM, and computational phantom publications from PubMed and PubMed Central.",
    schemaType: "CollectionPage",
  },
  ...literaturePages.map((literature) => ({
    path: `/literature/${literature.id}`,
    title: `${literature.title} | NCI Dose Tools Literature Registry`,
    heading: literature.title,
    description: literature.description,
    schemaType: "CollectionPage",
    literature,
  })),
  {
    path: "/discussions",
    title: "Technical Discussions, Questions and Support | NCI Dose Tools",
    heading: "NCI Dose Tools Discussions",
    description:
      "Public technical questions, bug reports, feature requests, and community replies for NCI Dose Tools.",
    schemaType: "CollectionPage",
  },
  {
    path: "/resources",
    title: "Official Links and Technical Resources | NCI Dose Tools",
    heading: "NCI Dose Tools Links and Resources",
    description:
      "Official NCI information, public documentation, technical resources, software access, and approved-user portal links for NCI Dose Tools.",
    schemaType: "WebPage",
  },
];

export const portalSeoRoutes = [
  {
    path: "/portal",
    title: "NCI Dose Tools User Portal",
    heading: "NCI Dose Tools User Portal",
    description: "Secure access for approved NCI Dose Tools users.",
    schemaType: "WebPage",
    noindex: true,
  },
  {
    path: "/portal/request-access",
    title: "Request Access | NCI Dose Tools User Portal",
    heading: "Request NCI Dose Tools Access",
    description: "Check eligibility and prepare a Software Transfer Agreement request for NCI Dose Tools access.",
    schemaType: "WebPage",
    noindex: true,
  },
];

const normalizePath = (pathname) => {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "");
};

export const findSeoRoute = (pathname) => {
  const normalized = normalizePath(pathname);
  const exact = [...seoRoutes, ...portalSeoRoutes].find((route) => route.path === normalized);
  if (exact) return exact;
  if (/^\/portal(?:\/.*)?$/.test(normalized)) return portalSeoRoutes[0];
  if (/^\/discussions\/[^/]+$/.test(normalized)) {
    return {
      path: normalized,
      title: "Technical Discussion | NCI Dose Tools",
      heading: "NCI Dose Tools Technical Discussion",
      description:
        "A public technical discussion from the NCI Dose Tools community knowledge base.",
      schemaType: "DiscussionForumPosting",
    };
  }
  return null;
};

export const canonicalUrl = (pathname) => {
  const normalized = normalizePath(pathname);
  return normalized === "/" ? `${siteOrigin}/` : `${siteOrigin}${normalized}/`;
};

export const toolSeoPages = toolPages;
export const manualSeoPages = manualPages;
