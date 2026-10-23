import {
  escapeHtml as esc,
  formatBlogDate,
  published,
  slugify,
} from "./utils.js";
import { getProjectVisualKind, projectArtwork } from "./project-artwork.js";

export const arrow = '<span aria-hidden="true" class="arrow">↗</span>';

export function header(data, currentPath) {
  const items = [
    ["/projects", "01", "Projects"],
    ["/experience", "02", "Experience"],
    ["/about", "03", "About"],
    ["/blog", "04", "Blog"],
    ["/contact", "05", "Contact"],
  ];
  const navItem = ([href, number, label], mobile = false) => {
    const active = currentPath === href || currentPath.startsWith(`${href}/`);
    return `<a href="${href}" class="${active ? "is-active" : ""}"${active ? ' aria-current="page"' : ""}>${number}${mobile ? " &nbsp; " : ` <span>${label}</span>`}${mobile ? label : ""}</a>`;
  };

  return `<header class="site-header"><a class="wordmark" href="/" aria-label="Manoj Mourya home">${esc(data.profile.initials)}<span class="wordmark-dot">.</span></a><nav class="desktop-nav" aria-label="Main navigation">${items.map((item) => navItem(item)).join("")}</nav><div class="header-actions"><button class="theme-toggle" aria-label="Toggle color theme" title="Toggle theme"><span>◐</span></button><button class="menu-toggle" aria-expanded="false" aria-label="Open menu"><i></i><i></i></button></div><nav class="mobile-nav" aria-label="Mobile navigation">${items.map((item) => navItem(item, true)).join("")}</nav></header>`;
}

export function footer(data) {
  const socials = data.profile.socials
    .filter((social) => social.url)
    .map(
      (social) =>
        `<a href="${esc(social.url)}" target="_blank" rel="noreferrer">${esc(social.label)}</a>`,
    )
    .join("");

  return `<footer class="site-footer"><div><a class="wordmark" href="/">${esc(data.profile.initials)}<span class="wordmark-dot">.</span></a><p>Mobile developer making useful things for real people.</p><a class="footer-admin-link" href="/admin">Admin</a></div><div class="footer-links">${socials}<a href="${esc(data.profile.resumeUrl)}" target="_blank" rel="noreferrer">Résumé</a><a href="/contact">Get in touch</a></div><div class="copyright">© ${new Date().getFullYear()} ${esc(data.profile.name)}<span>Designed & built with care.</span></div></footer>`;
}

export function sectionLabel(number, label) {
  return `<div class="section-label"><span>${number}</span><span>${label}</span></div>`;
}

export function pageIntro(kicker, title, description) {
  return `<section class="page-intro wrap"><span class="mono">${kicker}</span><h1>${title}<span class="accent-dot">.</span></h1>${description ? `<p>${description}</p>` : ""}</section>`;
}

export function projectCard(project, index) {
  const detailUrl = `/projects/${esc(project.slug || slugify(project.title))}`;
  const thumbnailKind = getProjectVisualKind(project);
  const thumbnail = projectArtwork(project, index);
  const articleUrl =
    project.links?.article || project.links?.paper || project.links?.research;
  const articleLabel =
    project.links?.articleLabel ||
    project.links?.paperLabel ||
    project.links?.researchLabel ||
    (String(project.category || "")
      .toLowerCase()
      .includes("research")
      ? "Read research"
      : "Read article");
  const actions = [
    project.links?.github && {
      url: project.links.github,
      label: project.links.githubLabel || "View repository",
    },
    articleUrl && { url: articleUrl, label: articleLabel },
    project.links?.live && {
      url: project.links.live,
      label: project.links.liveLabel || "View live project",
    },
  ].filter(Boolean);

  return `<article class="project-card reveal"><a class="project-card-main" href="${detailUrl}"><div class="project-art visual-${thumbnailKind}${project.coverImage ? " has-cover" : ""}">${thumbnail}</div><div class="project-meta"><span>${esc(project.category || "PROJECT")}</span>${project.year ? `<span>${esc(project.year)}</span>` : ""}</div><h3>${esc(project.title)} <span class="card-arrow">↗</span></h3><p>${esc(project.summary || project.shortDescription || "")}</p><div class="tag-list">${(
    project.technologies || []
  )
    .slice(0, 4)
    .map((technology) => `<span>${esc(technology)}</span>`)
    .join(
      "",
    )}</div></a>${actions.length ? `<div class="project-card-actions">${actions.map((action) => `<a class="button button-outline" href="${esc(action.url)}" target="_blank" rel="noopener noreferrer">${esc(action.label)} <span aria-hidden="true">↗</span></a>`).join("")}</div>` : ""}</article>`;
}

export function timeline(items) {
  return `<div class="timeline">${items.map((item) => `<article class="timeline-item"><div class="timeline-date mono">${esc(item.startDate || item.location || "")} ${item.endDate ? `— ${esc(item.endDate)}` : ""}</div><div class="timeline-node"></div><div class="timeline-content"><span class="mono">${esc(item.employmentType || "EXPERIENCE")}</span><h3>${esc(item.role || item.title || "")}</h3><p class="timeline-company">${esc(item.company || item.institution || "")}</p>${item.description ? `<p>${esc(item.description)}</p>` : ""}<div class="tag-list">${(item.technologies || []).map((technology) => `<span>${esc(technology)}</span>`).join("")}</div></div></article>`).join("")}</div>`;
}

export function blogCard(post) {
  return `<a class="blog-row" href="/blog/${esc(post.slug || slugify(post.title))}"><span class="blog-row-visual">${post.coverImage ? `<img src="${esc(post.coverImage)}" alt="${esc(post.coverImageAlt || "")}" loading="lazy">` : '<span class="mono">MM / NOTES</span>'}</span><span class="mono">${esc(post.category || "ARTICLE")}</span><h3>${esc(post.title)}</h3><span>${esc(formatBlogDate(post.date || post.publishedAt || post.updatedAt || post.createdAt))}${post.readingTime ? ` · ${esc(post.readingTime)} MIN READ` : ""} ${arrow}</span></a>`;
}

export function experiencePreview(data) {
  return `<section class="section wrap">${sectionLabel("03", "EXPERIENCE")}<div class="section-heading"><h2>Where I’ve<br>made an impact<span class="accent-dot">.</span></h2><a class="text-link" href="/experience">Full experience ↗</a></div>${timeline(published(data.experience).slice(0, 2))}</section>`;
}
