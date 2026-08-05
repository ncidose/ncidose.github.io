export type PortalAnnouncement = {
  id: string;
  title: string;
  summary: string;
  date: string;
  category: "Release" | "Maintenance" | "Access";
  audience: "Public" | "Approved users";
  unread?: boolean;
};

export type PortalRelease = {
  id: string;
  tool: string;
  name: string;
  version: string;
  released: string;
  description: string;
  assets: Array<{
    id: string;
    platform: string;
    filename: string;
    size: string;
  }>;
};

export const portalAnnouncements: PortalAnnouncement[] = [
  {
    id: "ncict-4-20260502",
    title: "NCICT 4 release files are available",
    summary:
      "Approved research users can download the May 2026 macOS and Windows builds from the new portal.",
    date: "May 2, 2026",
    category: "Release",
    audience: "Approved users",
    unread: true,
  },
  {
    id: "ncinm-ncirf-20260510",
    title: "NCINM 3 and NCIRF 4 updated",
    summary:
      "New macOS and Windows packages, batch examples, and recommended citations have been added.",
    date: "May 10, 2026",
    category: "Release",
    audience: "Approved users",
    unread: true,
  },
  {
    id: "portal-preview",
    title: "NCI Dose Tools user portal preview",
    summary:
      "The User Portal now provides controlled downloads, release announcements, account management, and approved-user discussions in one place.",
    date: "August 1, 2026",
    category: "Access",
    audience: "Public",
  },
];

export const portalReleases: PortalRelease[] = [
  {
    id: "ncict-4",
    tool: "NCICT",
    name: "Computed Tomography",
    version: "4.20260502",
    released: "May 2, 2026",
    description: "Current research distribution for CT organ-dose estimation.",
    assets: [
      { id: "ncict-mac", platform: "macOS", filename: "NCICT4.20260502_mac.dmg", size: "213 MB" },
      { id: "ncict-win", platform: "Windows", filename: "NCICT4.20260502_windows.exe", size: "205 MB" },
    ],
  },
  {
    id: "ncinm-3",
    tool: "NCINM",
    name: "Nuclear Medicine",
    version: "3.20260510",
    released: "May 10, 2026",
    description: "Current research distribution for nuclear medicine dosimetry.",
    assets: [
      { id: "ncinm-mac", platform: "macOS", filename: "NCINM3.20260510_mac.dmg", size: "397 MB" },
      { id: "ncinm-win", platform: "Windows", filename: "NCINM3.20260510_windows.exe", size: "268 MB" },
    ],
  },
  {
    id: "ncirf-4",
    tool: "NCIRF",
    name: "Radiography & Fluoroscopy",
    version: "4.20260510",
    released: "May 10, 2026",
    description: "Current research distribution for projection imaging dose estimation.",
    assets: [
      { id: "ncirf-mac", platform: "macOS", filename: "NCIRF4.20260510_mac.dmg", size: "328 MB" },
      { id: "ncirf-win", platform: "Windows", filename: "NCIRF4.20260510_windows.exe", size: "310 MB" },
    ],
  },
  {
    id: "phantom-library",
    tool: "PHANTOM",
    name: "Computational Phantom Library",
    version: "Current library",
    released: "May 10, 2026",
    description: "Reference, size-dependent, and pregnant computational phantom resources.",
    assets: [
      { id: "phantom-library", platform: "Library", filename: "Browse approved PHANTOM files", size: "Multiple files" },
    ],
  },
  {
    id: "dcc-library",
    tool: "DCC",
    name: "DCC",
    version: "Current library",
    released: "Current distribution",
    description: "Current dose conversion coefficient data and supporting publications.",
    assets: [
      { id: "dcc-library", platform: "Library", filename: "Browse DCC files", size: "Multiple files" },
    ],
  },
];

export const demoApprovedUser = {
  id: "demo-approved-user",
  name: "Approved Researcher",
  primaryEmail: "approved.user@gmail.com",
  institution: "Example University",
  role: "user" as const,
  discussionRole: "community" as const,
  discussionHandle: "approvedresearcher",
  staStatus: "Approved" as const,
  staApprovedOn: "June 18, 2024",
  identities: [
    {
      id: "google-demo",
      provider: "Google",
      email: "approved.user@gmail.com",
      verified: true,
      primary: true,
    },
  ],
};

export const demoAdminUser = {
  ...demoApprovedUser,
  id: "demo-admin-user",
  name: "Portal Administrator",
  primaryEmail: "portal.admin@nih.gov",
  institution: "National Cancer Institute",
  role: "admin" as const,
  discussionRole: "team" as const,
  discussionHandle: "choonsiklee",
  identities: [
    {
      id: "google-admin",
      provider: "Google",
      email: "portal.admin@nih.gov",
      verified: true,
      primary: true,
    },
  ],
};
