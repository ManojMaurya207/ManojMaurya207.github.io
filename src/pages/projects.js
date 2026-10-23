import { pageIntro, projectCard, sectionLabel } from "../components.js";
import { getProjectVisualKind, projectArtwork } from "../project-artwork.js";
import { escapeHtml as esc, published, slugify } from "../utils.js";

const arrow = '<span aria-hidden="true" class="arrow">↗</span>';

export function projectsPage(data) {
  const projects = published(data.projects);
  const categories = [
    ...new Set(
      projects
        .map((project) => project.category?.split("·")[0].trim())
        .filter(Boolean),
    ),
  ];

  return `<main>${pageIntro("SELECTED WORK / 01", "Projects", "A collection of mobile applications, experiments, and software built with curiosity.")}
    <section class="wrap project-listing">
      <div class="filter-bar">
        <label class="search-box"><span>⌕</span><input id="project-search" type="search" placeholder="Search projects…" aria-label="Search projects"></label>
        <div class="filters" role="group" aria-label="Filter projects"><button class="filter active" data-filter="All">All <span>${projects.length}</span></button>${categories.map((category) => `<button class="filter" data-filter="${esc(category)}">${esc(category)}</button>`).join("")}</div>
      </div>
      <div class="project-grid listing-grid" id="project-grid">${projects.map(projectCard).join("")}</div>
      <p class="empty-state" hidden>No projects match that search.</p>
    </section>
  </main>`;
}

export function projectDetailPage(data, slug) {
  const projects = published(data.projects);
  const project = projects.find(
    (item) => (item.slug || slugify(item.title)) === slug,
  );
  if (!project) return null;

  const index = projects.indexOf(project);
  const links = project.links || {};
  const researchUrl = links.article || links.paper || links.research;
  const liveAction = links.live
    ? `<a class="button button-dark" href="${esc(links.live)}" target="_blank" rel="noreferrer">${esc(links.liveLabel || "Open live project")} ${arrow}</a>`
    : "";
  const repoAction = links.github
    ? `<a class="button button-outline" href="${esc(links.github)}" target="_blank" rel="noreferrer">View repository ${arrow}</a>`
    : "";
  const researchAction = researchUrl
    ? `<a class="button button-outline" href="${esc(researchUrl)}" target="_blank" rel="noreferrer">Read publication ${arrow}</a>`
    : "";

  return `<main>
    <div class="detail-top wrap"><a class="back-link" href="/projects">← All projects</a><span class="mono">${esc(project.category || "PROJECT")}${project.year ? ` · ${esc(project.year)}` : ""}</span></div>
    <section class="detail-hero wrap">
      <div><span class="mono">PROJECT / ${String(index + 1).padStart(2, "0")}</span><h1>${esc(project.title)}<span class="accent-dot">.</span></h1><p>${esc(project.summary || "")}</p><div class="detail-actions">${liveAction}${repoAction}${researchAction}</div></div>
      <div class="detail-art visual-${getProjectVisualKind(project)}${project.coverImage ? " has-cover" : ""}">${projectArtwork(project, index)}</div>
    </section>
    <section class="detail-body wrap">
      <div class="detail-copy"><span class="mono">OVERVIEW</span><h2>Designed to solve<br>a real problem.</h2><p>${esc(project.description || project.summary || "")}</p>${project.highlights?.length ? `<h3>Highlights</h3><ul>${project.highlights.map((highlight) => `<li>${esc(highlight)}</li>`).join("")}</ul>` : ""}</div>
      <aside><span class="mono">${project.category?.startsWith("Research") ? "PUBLICATION" : "BUILT WITH"}</span><div class="tag-list">${(project.technologies || []).map((technology) => `<span>${esc(technology)}</span>`).join("")}</div>${links.github ? `<a class="text-link" href="${esc(links.github)}" target="_blank" rel="noreferrer">View repository ↗</a>` : ""}${researchUrl ? `<a class="text-link" href="${esc(researchUrl)}" target="_blank" rel="noreferrer">Read publication ↗</a>` : ""}</aside>
    </section>
  </main>`;
}

export function certificatesPage(data) {
  const certificates = published(data.certificates);
  const workshops = published(data.workshops);
  const certificateCards = certificates
    .map(
      (certificate) =>
        `<article class="credential"><span class="mono">${esc(certificate.issuedAt || certificate.year || "CERTIFICATE")}</span><h3>${esc(certificate.name || certificate.title || "")}</h3><p>${esc(certificate.issuer || "")}</p>${certificate.url ? `<a class="text-link" href="${esc(certificate.url)}" target="_blank">View credential ↗</a>` : ""}</article>`,
    )
    .join("");
  const workshopCards = workshops
    .map(
      (workshop) =>
        `<article class="achievement"><span class="mono">${esc(workshop.year || "EVENT")}</span><h3>${esc(workshop.title || workshop.name || "")}</h3>${workshop.organization ? `<p>${esc(workshop.organization)}</p>` : ""}</article>`,
    )
    .join("");
  const emptyMessage =
    !certificates.length && !workshops.length
      ? `<div class="quiet-empty"><span class="mono">LEARNING LOG</span><h2>Always room<br>to learn more.</h2><p>Certificates and events will be listed here as they’re added.</p></div>`
      : "";

  return `<main>${pageIntro("CREDENTIALS / 04", "Certificates & learning", "Courses, certifications, and events that have shaped my practice.")}<section class="wrap page-content">${certificates.length ? `<div class="credential-grid">${certificateCards}</div>` : ""}${workshops.length ? `<div class="subsection">${sectionLabel("", "WORKSHOPS & EVENTS")}<div class="achievement-row">${workshopCards}</div></div>` : ""}${emptyMessage}</section></main>`;
}
