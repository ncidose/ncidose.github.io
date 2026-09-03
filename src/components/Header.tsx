import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {Menu} from "lucide-react";
import { portalLinks } from "@/data/nciDoseTools";

const isActivePath = (pathname: string, href: string) =>
  pathname === href || (href !== "/" && pathname.startsWith(href));

type NavItem = {
  label: string;
  href: string;
  analyticsEvent?: string;
  analyticsAudience?: string;
  analyticsAction?: string;
};

const navItems: NavItem[] = [
  { label: "Tools", href: "/tools" },
  {
    label: "Manuals",
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
];

export const Header = () => {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
 
  return (
    <motion.header
      initial={{ opacity: 1, y: 0 }}
      // animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md"
    >
      <div className="container mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            {/* <div className="relative w-8 h-8">
              <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
                <rect x="2" y="2" width="28" height="28" stroke="currentColor" strokeWidth="1" className="text-primary" />
                <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="1" className="text-primary" />
                <line x1="16" y1="4" x2="16" y2="10" stroke="currentColor" strokeWidth="1" className="text-primary" />
                <line x1="16" y1="22" x2="16" y2="28" stroke="currentColor" strokeWidth="1" className="text-primary" />
                <line x1="4" y1="16" x2="10" y2="16" stroke="currentColor" strokeWidth="1" className="text-primary" />
                <line x1="22" y1="16" x2="28" y2="16" stroke="currentColor" strokeWidth="1" className="text-primary" />
              </svg>
            </div> */}
            <span className="text-lg font-light tracking-tight">
              NCI Dose Tools
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
            {navItems.map((item, index) => (
              <motion.div
                key={item.label}
                // initial={{ opacity: 0, y: -10 }}
                // animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.4, 
                  delay: index * 0.1,
                  ease: [0.16, 1, 0.3, 1] 
                }}
              >
                <Link
                  to={item.href}
                  data-analytics-event={item.analyticsEvent}
                  data-analytics-location={item.analyticsEvent ? "site_header" : undefined}
                  data-analytics-tool={item.analyticsEvent ? "suite" : undefined}
                  data-analytics-audience={item.analyticsAudience}
                  data-analytics-action={item.analyticsAction}
                  className={`relative text-sm transition-colors duration-300 border-animate ${
                    isActivePath(pathname, item.href)
                      ? "text-foreground border-animate-active"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              </motion.div>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-2 lg:flex">
            <a
              href={portalLinks.userPortal}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Approved User Portal (opens in a new tab)"
              className="btn-precision inline-block text-sm"
              data-analytics-event="portal_login_click"
              data-analytics-location="site_header"
              data-analytics-tool="suite"
              data-analytics-audience="approved_user"
              data-analytics-action="open_user_portal"
            >
              Approved User Portal
            </a>
          </div>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                className="flex h-11 w-11 items-center justify-center lg:hidden"
                aria-label="Toggle menu"
              >
               <Menu className="w-6 h-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="text-left font-normal">
                  NCI Dose Tools
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-6 mt-8">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    data-analytics-event={item.analyticsEvent}
                    data-analytics-location={item.analyticsEvent ? "mobile_menu" : undefined}
                    data-analytics-tool={item.analyticsEvent ? "suite" : undefined}
                    data-analytics-audience={item.analyticsAudience}
                    data-analytics-action={item.analyticsAction}
                    className={`text-sm transition-colors duration-300 ${
                      isActivePath(pathname, item.href)
                        ? "text-primary font-medium"
                        : "text-foreground hover:text-primary"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="pt-6 border-t border-border">
                  <a
                    href={portalLinks.userPortal}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Approved User Portal (opens in a new tab)"
                    onClick={() => setIsOpen(false)}
                    className="btn-precision inline-block w-full text-center text-sm"
                    data-analytics-event="portal_login_click"
                    data-analytics-location="mobile_menu"
                    data-analytics-tool="suite"
                    data-analytics-audience="approved_user"
                    data-analytics-action="open_user_portal"
                  >
                    Approved User Portal
                  </a>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.header>
  );
};
