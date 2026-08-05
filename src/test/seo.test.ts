import { canonicalUrl, findSeoRoute, seoRoutes } from "@/data/seoRoutes";
import { applyPageSeo } from "@/lib/seo";

describe("public-site SEO", () => {
  it("assigns every indexable screen a unique clean URL", () => {
    const paths = seoRoutes.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every((pathname) => !pathname.includes("#"))).toBe(true);
    expect(paths).toContain("/tools/ncict");
    expect(paths).toContain("/manuals/ncict");
    expect(paths).toContain("/versions/ncict");
    expect(paths).toContain("/literature/ncict");
  });

  it("uses stable trailing-slash canonical URLs", () => {
    expect(canonicalUrl("/")).toBe("https://ncidose.github.io/");
    expect(canonicalUrl("/manuals/ncict")).toBe("https://ncidose.github.io/manuals/ncict/");
    expect(findSeoRoute("/manuals/ncict/")?.title).toContain("NCICT 4 User Manual");
  });

  it("updates document metadata without changing page markup", () => {
    document.head.innerHTML = "";
    document.body.innerHTML = '<div id="root"><p>Visible website</p></div>';

    applyPageSeo({
      pathname: "/tools/ncict",
      title: "NCICT Test Title",
      description: "NCICT test description.",
      schemaType: "SoftwareApplication",
    });

    expect(document.title).toBe("NCICT Test Title");
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href"))
      .toBe("https://ncidose.github.io/tools/ncict/");
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content"))
      .toContain("index,follow");
    expect(document.querySelector('script[type="application/ld+json"]')?.textContent)
      .toContain("SoftwareApplication");
    expect(document.querySelector("#root")?.textContent).toContain("Visible website");
  });
});
