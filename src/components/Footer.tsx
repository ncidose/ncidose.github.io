import { Link } from "react-router-dom";
import { portalLinks } from "@/data/nciDoseTools";

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
  analyticsEvent?: string;
  analyticsAudience?: string;
  analyticsAction?: string;
};

export const Footer = () => {
  const links: Record<string, FooterLink[]> = {
    Product: [
      { label: "Tools", href: "/tools" },
      {
        label: "Manuals & API Documentation",
        href: "/manuals",
        analyticsEvent: "documentation_click",
        analyticsAudience: "general",
        analyticsAction: "browse_manuals",
      },
      {
        label: "For Researchers",
        href: "/researchers",
      },
      {
        label: "For Vendors",
        href: "/vendors",
      },
      { label: "Discussions", href: "/discussions" },
      { label: "Literature Registry", href: "/literature" },
      { label: "Links & Resources", href: "/resources" },
    ],
    Resources: [
      { label: "Official NCI Resources", href: "https://dceg.cancer.gov/tools/radiation-dosimetry-tools", external: true },
      {
        label: "Approved User Portal",
        href: portalLinks.userPortal,
        external: true,
        analyticsEvent: "portal_login_click",
        analyticsAudience: "approved_user",
        analyticsAction: "open_user_portal",
      },
      { label: "GitHub Development Repository", href: "https://github.com/ncidose/ncidosetools", external: true },
      { label: "Professional Updates", href: "https://www.linkedin.com/in/choonsiklee/", external: true },
    ],
  };

  return (
    <footer className="border-t border-border py-16">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Logo & Description */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              
              <span className="text-lg font-light tracking-tight">
                NCI Dose Tools
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Documentation and user-support resources for NCI-developed radiation
              dosimetry tools.
            </p>
          </div>

          <div ></div> 

          {/* Links */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-xs font-mono text-primary uppercase tracking-widest mb-4">
                {category}
              </h4>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.label}>
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={item.label === "Approved User Portal" ? `${item.label} (opens in a new tab)` : undefined}
                        data-analytics-event={item.analyticsEvent}
                        data-analytics-location={item.analyticsEvent ? "site_footer" : undefined}
                        data-analytics-tool={item.analyticsEvent ? "suite" : undefined}
                        data-analytics-audience={item.analyticsAudience}
                        data-analytics-action={item.analyticsAction}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        to={item.href}
                        data-analytics-event={item.analyticsEvent}
                        data-analytics-location={item.analyticsEvent ? "site_footer" : undefined}
                        data-analytics-tool={item.analyticsEvent ? "suite" : undefined}
                        data-analytics-audience={item.analyticsAudience}
                        data-analytics-action={item.analyticsAction}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-6">
          <p className="max-w-4xl text-xs leading-relaxed text-muted-foreground">
            This public technical site provides manuals, release histories, literature,
            and user-support discussions for NCI Dose Tools. The official NCI/DCEG
            information page remains the authoritative institutional source. Software
            downloads are available only through the secure User Portal to users covered
            by an approved Software Transfer Agreement or commercial licensing agreement.
          </p>
        </div>

        {/* Bottom bar */}
        {/* <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground font-mono">
            © 2024 National Cancer Institute. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Accessibility
            </a>
          </div>
        </div> */}
      </div>
    </footer>
  );
};
