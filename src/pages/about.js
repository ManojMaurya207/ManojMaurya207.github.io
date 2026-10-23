import { pageIntro, sectionLabel, timeline } from "../components.js";
import { escapeHtml as esc, published } from "../utils.js";

export function aboutPage(data) {
  const skills = renderSkillGroups(data, false);
  const education = published(data.education);
  const educationSection = education.length
    ? `<section class="section wrap">${sectionLabel("03", "EDUCATION")}<div class="education-list">${education.map((item) => `<article><span class="mono">${esc(item.startDate || "")}</span><div><h3>${esc(item.degree || item.title || "")}</h3><p>${esc(item.institution || "")}</p>${item.description ? `<p>${esc(item.description)}</p>` : ""}</div></article>`).join("")}</div></section>`
    : "";

  return `<main>${pageIntro("A LITTLE ABOUT ME / 02", "Building with<br>purpose", "Mobile development is where thoughtful interfaces meet the details that make software dependable.")}
    <section class="about-body wrap">
      <div class="about-lead"><span class="mono">01 / MY APPROACH</span><p>${esc(data.profile.bio)}</p><p>I care about clear interfaces, maintainable architecture, and building for the way people actually use their devices.</p></div>
      <figure class="about-portrait"><img src="/assets/profile-pic-cutout.png" alt="Manoj working at his laptop" loading="lazy"></figure>
      <div class="about-facts"><div><span class="mono">FOCUS</span><strong>${esc(data.profile.role)}</strong></div><div><span class="mono">PRIMARY</span><strong>Android · Kotlin</strong></div><div><span class="mono">INTERESTS</span><strong>Mobile · AI · Computer vision</strong></div></div>
    </section>
    <section class="stack-section"><div class="wrap stack-wrap">${sectionLabel("02", "TECHNICAL TOOLKIT")}<div class="skill-wall">${skills}</div></div></section>
    ${educationSection}
  </main>`;
}

export function experiencePage(data) {
  const experience = published(data.experience);
  const education = published(data.education);
  const experienceContent = experience.length
    ? timeline(experience)
    : `<div class="quiet-empty"><span class="mono">IN PROGRESS</span><h2>The next chapter<br>is being written.</h2><p>More details will appear here as experience is added.</p></div>`;
  const educationContent = education.length
    ? `<div class="subsection">${sectionLabel("", "EDUCATION")}${education.map((item) => `<article class="education-row"><span class="mono">${esc(item.startDate || "")}</span><div><h3>${esc(item.degree || item.title || "")}</h3><p>${esc(item.institution || "")}</p></div></article>`).join("")}</div>`
    : "";

  return `<main>${pageIntro("CAREER / 03", "Experience", "A timeline of roles and learning, presented as the story grows.")}<section class="wrap page-content">${experienceContent}${educationContent}</section></main>`;
}

function renderSkillGroups(data, includeReveal = true) {
  return data.skillCategories
    .map(
      (category, index) =>
        `<div class="skill-group${includeReveal ? " reveal" : ""}"><span class="mono">0${index + 1} / ${esc(category.name.toUpperCase())}</span><div>${category.items.map((tool) => `<span class="skill-chip">${esc(tool)}</span>`).join("")}</div></div>`,
    )
    .join("");
}
