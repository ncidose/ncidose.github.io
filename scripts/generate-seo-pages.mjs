import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import {
  canonicalUrl,
  manualSeoPages,
  seoRoutes,
  siteName,
  siteOrigin,
  toolSeoPages,
} from "../src/data/seoRoutes.js";

const projectRoot = process.cwd();
const distRoot = path.join(projectRoot, "dist");
const templatePath = path.join(distRoot, "index.html");
const discussionsApi = "https://portal.ncidosetools.com/api/public/questions";

const manualSources = {
  ncict: "NCICT-User-Manual.md",
  ncinm: "NCINM-User-Manual.md",
  ncirf: "NCIRF-User-Manual.md",
  phantom: "PHANTOM-User-Manual.md",
  "ncict-api": "NCICTAPI-User-Manual.md",
  "ncinm-api": "NCINMAPI-User-Manual.md",
  "ncirf-api": "NCIRFAPI-User-Manual.md",
};

const releaseSources = {
  ncict: "NCICT-Version-History.md",
  ncinm: "NCINM-Version-History.md",
  ncirf: "NCIRF-Version-History.md",
  phantom: "PHANTOM-Version-History.md",
};

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const plainText = (value = "") => String(value)
  .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
  .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
  .replace(/[#*_`>~]/g, "")
  .replace(/\s+/g, " ")
  .trim();

const schemaDate = (value) => value && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
  ? `${value.replace(" ", "T")}Z`
  : value;

const pageHref = (pathname) => canonicalUrl(pathname).replace(siteOrigin, "");

const renderMarkdown = (markdown, imageBase = null) => {
  const normalized = imageBase
    ? markdown.replace(/\]\(images\//g, `](${imageBase}/`)
    : markdown;
  return renderToStaticMarkup(
    React.createElement(
      ReactMarkdown,
      { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] },
      normalized,
    ),
  );
};

const shellNav = `
  <nav aria-label="Primary navigation">
    <a href="/">NCI Dose Tools</a>
    <a href="/tools/">Our Tools</a>
    <a href="/researchers/">For Researchers</a>
    <a href="/vendors/">For Vendors</a>
    <a href="/manuals/">Manuals</a>
    <a href="/discussions/">Discussions</a>
    <a href="/literature/">Literature Registry</a>
  </nav>`;

const wrapShell = (route, content) => `
  <div class="seo-shell">
    ${shellNav}
    <main>
      <article>
        <h1>${escapeHtml(route.heading)}</h1>
        <p class="seo-lead">${escapeHtml(route.description)}</p>
        ${content}
      </article>
    </main>
    <footer>
      <p>This public technical site complements the official National Cancer Institute website.</p>
      <a href="https://dceg.cancer.gov/tools/radiation-dosimetry-tools">Official NCI radiation dosimetry resources</a>
    </footer>
  </div>`;

const cards = (items) => `<div class="seo-grid">${items.map((item) => `
  <section>
    <h2><a href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a></h2>
    <p>${escapeHtml(item.description)}</p>
  </section>`).join("")}</div>`;

const defaultContent = (route) => {
  if (route.path === "/") {
    return cards(toolSeoPages.map((tool) => ({
      href: pageHref(`/tools/${tool.id}`),
      title: tool.name,
      description: tool.description,
    })));
  }
  if (route.path === "/tools") {
    return cards(toolSeoPages.map((tool) => ({
      href: pageHref(`/tools/${tool.id}`),
      title: `${tool.name}: ${tool.fullName}`,
      description: tool.description,
    })));
  }
  if (route.tool) {
    return `
      <p>${escapeHtml(route.tool.description)}</p>
      <ul>
        <li><a href="${pageHref(`/manuals/${route.tool.id}`)}">Read the ${escapeHtml(route.tool.name)} manual</a></li>
        <li><a href="${pageHref(`/versions/${route.tool.id}`)}">Review ${escapeHtml(route.tool.name)} release history</a></li>
        <li><a href="${pageHref(`/literature/${route.tool.id}`)}">Browse ${escapeHtml(route.tool.name)} publications</a></li>
      </ul>`;
  }
  if (route.path === "/manuals") {
    return cards(manualSeoPages.map((manual) => ({
      href: pageHref(`/manuals/${manual.id}`),
      title: manual.title,
      description: manual.description,
    })));
  }
  return `
    <p>Explore the current public technical information and supporting resources for NCI Dose Tools.</p>
    <p><a href="/tools/">Browse all NCI Dose Tools</a> or <a href="/manuals/">open the documentation library</a>.</p>`;
};

const buildStructuredData = (route) => {
  if (route.jsonLd) return route.jsonLd;
  const entity = {
    "@type": route.schemaType || "WebPage",
    name: route.heading,
    description: route.description,
    url: canonicalUrl(route.path),
    isPartOf: { "@id": `${siteOrigin}/#website` },
    publisher: {
      "@type": "Organization",
      name: "National Cancer Institute",
      url: "https://www.cancer.gov/",
    },
  };
  if (route.schemaType === "SoftwareApplication") {
    entity.applicationCategory = "ScientificApplication";
    entity.operatingSystem = "Windows, macOS, Linux";
    entity.offers = {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "No charge for approved non-commercial research use under the applicable agreement.",
    };
  }

  const segments = route.path.split("/").filter(Boolean);
  const graph = [
    {
      "@type": "WebSite",
      "@id": `${siteOrigin}/#website`,
      name: siteName,
      url: `${siteOrigin}/`,
    },
    entity,
  ];
  if (segments.length) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: siteName, item: `${siteOrigin}/` },
        ...segments.map((segment, index) => ({
          "@type": "ListItem",
          position: index + 2,
          name: segment.replace(/[-_]+/g, " "),
          item: canonicalUrl(`/${segments.slice(0, index + 1).join("/")}`),
        })),
      ],
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
};

const shellStyles = `<style data-ncidose-seo-shell="true">
  .js .seo-shell{display:none}.seo-shell{font-family:Inter,Arial,sans-serif;color:#0f172a;background:#f8fafc;min-height:100vh}.seo-shell>nav{display:flex;flex-wrap:wrap;gap:1.25rem;padding:1.25rem max(1.5rem,calc((100vw - 1180px)/2));border-bottom:1px solid #e2e8f0;background:#fff}.seo-shell a{color:#0284c7;text-decoration:none}.seo-shell a:hover{text-decoration:underline}.seo-shell main{max-width:1180px;margin:0 auto;padding:4rem 1.5rem}.seo-shell article{max-width:960px}.seo-shell h1{font-size:clamp(2.5rem,7vw,5rem);font-weight:300;letter-spacing:-.04em;line-height:1.05;margin:0 0 1.5rem}.seo-shell h2{font-size:1.2rem;margin:0 0 .65rem}.seo-shell p,.seo-shell li{line-height:1.75;color:#475569}.seo-shell .seo-lead{font-size:1.15rem;max-width:800px}.seo-shell .seo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;margin-top:2.5rem}.seo-shell .seo-grid section{border:1px solid #e2e8f0;background:#fff;padding:1.4rem}.seo-shell article>section{margin-top:2.5rem}.seo-shell footer{border-top:1px solid #e2e8f0;background:#fff;padding:2rem max(1.5rem,calc((100vw - 1180px)/2));font-size:.85rem}
</style>`;

const cleanHead = (html) => html
  .replace(/\s*<meta\s+(?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+)"[^>]*>/gi, "")
  .replace(/\s*<link\s+rel="canonical"[^>]*>/gi, "")
  .replace(/\s*<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, "")
  .replace(/\s*<style\s+data-ncidose-seo-shell="true"[^>]*>[\s\S]*?<\/style>/gi, "");

const renderDocument = (template, route, content, noindex = false) => {
  const url = canonicalUrl(route.path);
  const robots = noindex
    ? "noindex,nofollow"
    : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";
  const schema = JSON.stringify(buildStructuredData(route)).replaceAll("<", "\\u003c");
  const head = `
    <meta name="description" content="${escapeHtml(route.description)}" />
    <meta name="robots" content="${robots}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:site_name" content="${siteName}" />
    <meta property="og:type" content="${route.schemaType === "TechArticle" || route.schemaType === "DiscussionForumPosting" ? "article" : "website"}" />
    <meta property="og:title" content="${escapeHtml(route.title)}" />
    <meta property="og:description" content="${escapeHtml(route.description)}" />
    <meta property="og:url" content="${url}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(route.title)}" />
    <meta name="twitter:description" content="${escapeHtml(route.description)}" />
    ${noindex ? "" : `<script type="application/ld+json" data-ncidose-seo="true">${schema}</script>`}
    ${shellStyles}`;

  return cleanHead(template)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(route.title)}</title>`)
    .replace("</head>", `${head}\n  </head>`)
    .replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${wrapShell(route, content)}</div>`);
};

const writeRoute = async (template, route, content, noindex = false) => {
  const relative = route.path === "/" ? "" : route.path.replace(/^\//, "");
  const directory = path.join(distRoot, relative);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), renderDocument(template, route, content, noindex));
};

const loadLiterature = async () => {
  try {
    return JSON.parse(await readFile(path.join(projectRoot, "public/literature.json"), "utf8"));
  } catch {
    return null;
  }
};

const literatureContent = (route, literature) => {
  if (!literature) return defaultContent(route);
  if (!route.literature) {
    return cards(literature.tools.map((tool) => ({
      href: pageHref(`/literature/${tool.id}`),
      title: `${tool.tool} Publications`,
      description: `${tool.counts.displayedArticles} peer-reviewed papers. ${tool.summary}`,
    })));
  }
  const tool = literature.tools.find((candidate) => candidate.id === route.literature.id);
  if (!tool) return defaultContent(route);
  return tool.years.map((year) => `
    <section>
      <h2>${escapeHtml(year.year)} publications</h2>
      <ol>${year.articles.map((article) => `
        <li>
          <h3><a href="${escapeHtml(article.pubmedUrl)}">${escapeHtml(article.title)}</a></h3>
          <p>${escapeHtml(article.authors.join(", "))}. ${escapeHtml(article.journal)}. ${escapeHtml(article.pubdate)}.</p>
        </li>`).join("")}</ol>
    </section>`).join("");
};

const loadDiscussions = async () => {
  try {
    const response = await fetch(discussionsApi, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    return Array.isArray(payload.questions) ? payload.questions : [];
  } catch (error) {
    console.warn(`SEO snapshot: discussions unavailable (${error instanceof Error ? error.message : error})`);
    return [];
  }
};

const discussionRoute = (question) => {
  const description = plainText(question.body).slice(0, 220);
  const published = question.publishedAt || question.createdAt;
  return {
    path: `/discussions/${question.id}`,
    title: `${question.title} | NCI Dose Tools Discussions`,
    heading: question.title,
    description,
    schemaType: "DiscussionForumPosting",
    lastmod: question.updatedAt || published,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "DiscussionForumPosting",
      headline: question.title,
      articleBody: plainText(question.body),
      datePublished: schemaDate(published),
      dateModified: schemaDate(question.updatedAt || published),
      url: canonicalUrl(`/discussions/${question.id}`),
      author: {
        "@type": question.authorType === "team" ? "Organization" : "Person",
        name: question.authorName || (question.authorType === "team" ? "NCI Dose Team" : "User Community"),
      },
      publisher: {
        "@type": "Organization",
        name: "National Cancer Institute",
        url: "https://www.cancer.gov/",
      },
      commentCount: Array.isArray(question.answers) ? question.answers.length : 0,
      comment: (question.answers || []).map((answer) => ({
        "@type": "Comment",
        text: plainText(answer.body),
        dateCreated: schemaDate(answer.createdAt),
        author: {
          "@type": answer.responseType === "team" ? "Organization" : "Person",
          name: answer.responseType === "team"
            ? `NCI Dose Team${answer.authorName ? ` · ${answer.authorName}` : ""}`
            : `User Community${answer.authorName ? ` · ${answer.authorName}` : ""}`,
        },
      })),
    },
  };
};

const discussionContent = (question) => `
  <div class="seo-discussion">${renderMarkdown(question.body || "")}</div>
  ${(question.answers || []).map((answer) => `
    <section>
      <h2>${escapeHtml(answer.responseType === "team" ? "NCI Dose Team response" : "Community reply")}</h2>
      ${renderMarkdown(answer.body || "")}
    </section>`).join("")}`;

const sitemapXml = (routes) => {
  const unique = new Map(routes.map((route) => [canonicalUrl(route.path), route]));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Array.from(unique.entries()).map(([url, route]) => `  <url>
    <loc>${escapeHtml(url)}</loc>${route.lastmod ? `
    <lastmod>${escapeHtml(String(route.lastmod).slice(0, 10))}</lastmod>` : ""}
  </url>`).join("\n")}
</urlset>
`;
};

const main = async () => {
  const template = await readFile(templatePath, "utf8");
  const literature = await loadLiterature();
  const discussions = await loadDiscussions();
  const discussionRoutes = discussions
    .filter((question) => question?.id && /^[A-Za-z0-9._~-]+$/.test(question.id))
    .map(discussionRoute);

  for (const route of seoRoutes) {
    let content = defaultContent(route);
    if (route.manual) {
      const source = manualSources[route.manual.id];
      const markdown = await readFile(path.join(projectRoot, "src/content/manuals", source), "utf8");
      content = renderMarkdown(markdown, "/manuals/images");
    } else if (route.release) {
      const source = releaseSources[route.release.id];
      const markdown = await readFile(path.join(projectRoot, "src/content/releases", source), "utf8");
      content = renderMarkdown(markdown);
    } else if (route.path === "/literature" || route.literature) {
      content = literatureContent(route, literature);
    } else if (route.path === "/discussions" && discussions.length) {
      content = cards(discussions.map((question) => ({
        href: pageHref(`/discussions/${question.id}`),
        title: question.title,
        description: plainText(question.body).slice(0, 180),
      })));
    }
    await writeRoute(template, route, content);
  }

  for (const route of discussionRoutes) {
    const question = discussions.find((candidate) => candidate.id === route.path.split("/").pop());
    await writeRoute(template, route, discussionContent(question));
  }

  const portalRoute = {
    path: "/portal",
    title: "NCI Dose Tools User Portal",
    heading: "NCI Dose Tools User Portal",
    description: "Secure access for approved NCI Dose Tools users.",
    schemaType: "WebPage",
  };
  await writeRoute(
    template,
    portalRoute,
    "<p>Continue to the secure <a href=\"https://portal.ncidosetools.com\">NCI Dose Tools User Portal</a>.</p>",
    true,
  );

  const notFoundRoute = {
    path: "/404",
    title: "Page Not Found | NCI Dose Tools",
    heading: "Page not found",
    description: "The requested NCI Dose Tools page could not be found.",
    schemaType: "WebPage",
  };
  await writeFile(
    path.join(distRoot, "404.html"),
    renderDocument(template, notFoundRoute, "<p>Return to the <a href=\"/\">NCI Dose Tools home page</a>.</p>", true),
  );
  await writeFile(path.join(distRoot, "sitemap.xml"), sitemapXml([...seoRoutes, ...discussionRoutes]));
  console.log(`Generated ${seoRoutes.length} public SEO routes, ${discussionRoutes.length} discussion routes, and sitemap.xml.`);
};

await main();
