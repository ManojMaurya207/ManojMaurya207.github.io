import {
  blogCard,
  experiencePreview,
  projectCard,
  sectionLabel,
} from "../components.js";
import { escapeHtml as esc, published } from "../utils.js";

const arrow = '<span aria-hidden="true" class="arrow">↗</span>';

export function homePage(data) {
  const projects = published(data.projects)
    .filter((project) => project.featured || project.isFeatured)
    .slice(0, 3);
  const socials = data.profile.socials
    .filter((social) => social.url)
    .map(
      (social) =>
        `<a href="${esc(social.url)}" target="_blank" rel="noreferrer">${esc(social.label)} ${arrow}</a>`,
    )
    .join("");

  const projectSection = projects.length
    ? `<section class="section wrap" id="projects">${sectionLabel("01", "SELECTED WORK")}<div class="section-heading"><h2>Things I’ve<br>been building<span class="accent-dot">.</span></h2><a class="text-link" href="/projects">All projects <span>↗</span></a></div><div class="project-grid">${projects.map(projectCard).join("")}</div></section>`
    : "";
  const experienceSection = published(data.experience).length
    ? experiencePreview(data)
    : "";
  const achievementsSection = renderAchievements(data);
  const writingSection = renderWriting(data);

  return `<main>
    ${renderHero(data, socials)}
    ${renderIntro(data)}
    ${projectSection}
    ${renderSkills(data)}
    ${experienceSection}
    ${achievementsSection}
    ${writingSection}
    ${renderContactCallout()}
  </main>`;
}

function renderHero(data, socials) {
  const portrait = data.profile.profileImage
    ? `<img class="portrait-photo" src="${esc(data.profile.profileImage)}" alt="Manoj Mourya in his workspace" fetchpriority="high">`
    : `<div class="portrait-grid"></div><div class="portrait-monogram">${esc(data.profile.initials)}</div><span class="portrait-note">ANDROID · MOBILE · PRODUCT</span><span class="orbit orbit-one"></span><span class="orbit orbit-two"></span>`;
  const resumeLink = data.profile.resumeUrl
    ? `<a class="button button-plain" href="${esc(data.profile.resumeUrl)}" target="_blank">Résumé ${arrow}</a>`
    : "";

  return `<section class="hero wrap">
    <div class="hero-copy">
      <div class="eyebrow"><span class="status-dot"></span>${esc(data.profile.role)}</div>
      <h1>Building mobile<br>experiences with<br><span>Kotlin & Compose.</span></h1>
      <p class="hero-intro">${esc(data.profile.intro)}</p>
      <div class="hero-ctas"><a class="button button-dark" href="/projects">Explore projects <span>↓</span></a>${resumeLink}</div>
      <div class="hero-socials">${socials}</div>
    </div>
    <div class="hero-aside">
      <div class="portrait-frame">${portrait}</div>
      <div class="aside-note"><span class="mono">CURRENT FOCUS</span><span>${esc(data.profile.currentlyBuilding)}</span></div>
    </div>
    <div class="hero-index mono">MM / PORTFOLIO<br>2026 — NOW</div>
  </section>`;
}

function renderIntro(data) {
  return `<section class="intro-strip wrap"><span class="mono">01 / A LITTLE CONTEXT</span><p>${esc(data.profile.bio)}</p><a href="/about">More about me <span>↗</span></a></section>`;
}

function renderSkills(data) {
  return `<section class="stack-section"><div class="wrap stack-wrap">${sectionLabel("02", "TOOLS OF THE TRADE")}<div class="section-heading"><h2>My everyday<br>toolkit<span class="accent-dot">.</span></h2><p>A practical set of tools for designing, building, and shipping mobile software.</p></div><div class="skill-wall">${data.skillCategories.map((category, index) => `<div class="skill-group reveal"><span class="mono">0${index + 1} / ${esc(category.name.toUpperCase())}</span><div>${category.items.map((tool) => `<span class="skill-chip">${esc(tool)}</span>`).join("")}</div></div>`).join("")}</div></div></section>`;
}

function renderAchievements(data) {
  const achievements = published(data.achievements);
  if (!achievements.length) return "";

  return `<section class="section wrap">${sectionLabel("03", "MILESTONES")}<div class="section-heading"><h2>Recognition<span class="accent-dot">.</span></h2></div><div class="achievement-row">${achievements.map((item) => `<div class="achievement"><span class="mono">${esc(item.year || "MILESTONE")}</span><h3>${esc(item.title)}</h3>${item.organization ? `<p>${esc(item.organization)}</p>` : ""}</div>`).join("")}</div></section>`;
}

function renderWriting(data) {
  const posts = published(data.blogs).slice(0, 3);
  if (!posts.length) return "";

  return `<section class="section wrap">${sectionLabel("04", "NOTES & IDEAS")}<div class="section-heading"><h2>Writing<span class="accent-dot">.</span></h2><a class="text-link" href="/blog">All writing ↗</a></div><div class="blog-list">${posts.map(blogCard).join("")}</div></section>`;
}

function renderContactCallout() {
  return `<section class="contact-band wrap"><div><span class="mono">HAVE SOMETHING IN MIND?</span><h2>Let’s make it<br>useful<span class="accent-dot">.</span></h2></div><a class="button button-light" href="/contact">Get in touch <span>↗</span></a></section>`;
}
