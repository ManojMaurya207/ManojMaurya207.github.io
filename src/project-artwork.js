import { escapeHtml as esc } from "./utils.js";

export function getProjectVisualKind(project) {
  const category = String(project.category || "").toLowerCase();
  const technologies = (project.technologies || []).join(" ").toLowerCase();
  if (category.includes("research") || category.includes("publication")) {
    return "research";
  }
  if (category.includes("game") || technologies.includes("unity"))
    return "game";
  if (category.includes("python") || category.includes("machine learning")) {
    return "data";
  }
  if (/android|ios|mobile/.test(`${category} ${technologies}`)) return "mobile";
  return "web";
}

export function projectArtwork(project, index = 0) {
  if (project.coverImage) {
    return `<img class="project-cover-image" src="${esc(project.coverImage)}" loading="lazy" alt="${esc(project.coverImageAlt || `${project.title} project image`)}"><span class="cover-category">${esc(project.category || "PROJECT")}</span>`;
  }

  const kind = getProjectVisualKind(project);
  const tech = (project.technologies || []).slice(0, 2).join(" · ");

  return `<div class="project-visual visual-${kind}" aria-hidden="true">
    <div class="visual-header"><span>MM / ${String(index + 1).padStart(2, "0")}</span><span>${esc(project.category || "PROJECT")}</span></div>
    ${projectIllustration(project)}
    <div class="visual-footer"><span>${esc(tech || "INDEPENDENT PROJECT")}</span><span>0${index + 1}</span></div>
  </div>`;
}

function projectIllustration(project) {
  const slug = String(project.slug || "").toLowerCase();
  const title = String(project.title || "").toLowerCase();

  if (slug.includes("stealthshield") || title.includes("stealthshield")) {
    return stealthShieldIllustration();
  }
  if (slug.includes("signify") || title.includes("signify")) {
    return signifyIllustration();
  }
  if (slug.includes("geminsky") || title.includes("geminsky")) {
    return gemInSkyIllustration();
  }
  if (slug.includes("cilika") || title.includes("cilika")) {
    return cilikaIllustration();
  }
  if (slug.includes("pacman") || title.includes("pacman")) {
    return pacmanIllustration();
  }
  if (slug.includes("dino") || title.includes("dino")) {
    return dinoIllustration();
  }
  if (slug.includes("digit-recognizer") || title.includes("digit recognizer")) {
    return digitRecognizerIllustration();
  }
  if (slug.includes("edutrack") || title.includes("edutrack")) {
    return eduTrackIllustration();
  }

  return genericIllustration();
}

function stealthShieldIllustration() {
  return `<svg class="artwork-svg" viewBox="0 0 360 210">
    <path class="art-line art-dashed" d="M40 157c49-7 38-83 93-83 49 0 48 60 102 60 29 0 44-18 83-45"/>
    <circle class="art-muted" cx="134" cy="74" r="6"/><circle class="art-muted" cx="235" cy="134" r="6"/>
    <circle class="art-ring" cx="134" cy="74" r="35"/><path class="art-accent-fill" d="M134 58c-10 0-18 8-18 18 0 13 18 31 18 31s18-18 18-31c0-10-8-18-18-18Z"/><circle cx="134" cy="76" r="4" fill="var(--art-paper)"/>
    <path class="art-line" d="m245 45 29 12v24c0 22-13 39-29 47-16-8-29-25-29-47V57l29-12Z"/><path class="art-accent" d="m233 81 9 9 17-20"/>
  </svg>`;
}

function signifyIllustration() {
  return `<svg class="artwork-svg" viewBox="0 0 360 210">
    <path class="art-line" d="m113 171-8-58c-2-12 14-16 18-4l8 23-4-61c-1-13 16-15 19-2l8 49-1-67c0-13 18-14 20 0l4 67 4-45c1-13 19-12 19 2v49l8-19c5-12 20-5 17 7l-14 44c-4 13-14 20-28 20h-41c-14 0-25-7-29-25Z"/>
    <path class="art-accent" d="M85 53c-13 13-19 28-19 45m211-44c13 13 19 28 19 45"/><path class="art-dashed art-muted" d="M87 115c17 9 28 9 42 2m104-2c14 7 25 7 40-2"/>
    <circle class="art-accent-fill" cx="180" cy="40" r="5"/><circle class="art-muted" cx="68" cy="46" r="3"/><circle class="art-muted" cx="292" cy="46" r="3"/>
  </svg>`;
}

function gemInSkyIllustration() {
  return `<svg class="artwork-svg" viewBox="0 0 360 210">
    <circle class="art-ring" cx="117" cy="87" r="34"/><circle class="art-accent-fill" cx="117" cy="87" r="22"/>
    <path class="art-muted" d="M117 34V19m0 136v-15M64 87H49m136 0h-15M80 50 69 39m96 96-11-11m0-74 11-11M69 135l11-11"/>
    <path class="art-line" d="M82 139c0-15 12-27 27-27 5-18 29-25 44-12 17-6 36 7 35 25 14 2 23 15 19 28-3 11-12 17-24 17h-75c-15 0-26-12-26-26 0-2 0-4 1-5Z"/>
    <path class="art-dashed art-accent" d="M233 55c17 7 29 19 37 36m-37 16c16 6 27 17 33 30"/>
  </svg>`;
}

function cilikaIllustration() {
  return `<svg class="artwork-svg" viewBox="0 0 360 210">
    <ellipse class="art-cell" cx="174" cy="106" rx="69" ry="49" transform="rotate(-22 174 106)"/><ellipse class="art-cell-inner" cx="174" cy="106" rx="34" ry="20" transform="rotate(-22 174 106)"/>
    <ellipse class="art-cell art-cell-small" cx="73" cy="62" rx="28" ry="19" transform="rotate(28 73 62)"/><ellipse class="art-cell-inner" cx="73" cy="62" rx="12" ry="8" transform="rotate(28 73 62)"/>
    <ellipse class="art-cell art-cell-small" cx="278" cy="150" rx="36" ry="23" transform="rotate(-14 278 150)"/><ellipse class="art-cell-inner" cx="278" cy="150" rx="15" ry="9" transform="rotate(-14 278 150)"/>
    <path class="art-dashed art-muted" d="m215 77 43-37"/><circle class="art-accent-fill" cx="258" cy="40" r="4"/><circle class="art-muted" cx="114" cy="169" r="3"/>
  </svg>`;
}

function pacmanIllustration() {
  return `<svg class="artwork-svg" viewBox="0 0 360 210">
    <path class="art-line" d="M61 39h238v132H61zM61 83h54v44H61m54-44h49V39m0 44v44h52V83h82m-134 44v44m52-44v44m52-88V39m0 132v-44h30"/>
    <path class="art-accent-fill" d="m152 104 29-16a34 34 0 1 0 0 32Z"/>
    <path class="art-muted" d="M237 91c0-12 9-21 21-21s21 9 21 21v41l-11-8-10 8-10-8-11 8V91Z"/><circle cx="251" cy="89" r="2.5" fill="var(--art-paper)"/><circle cx="265" cy="89" r="2.5" fill="var(--art-paper)"/>
    <circle class="art-accent-fill" cx="129" cy="61" r="3"/><circle class="art-accent-fill" cx="231" cy="151" r="3"/>
  </svg>`;
}

function dinoIllustration() {
  return `<svg class="artwork-svg" viewBox="0 0 360 210">
    <path class="art-line" d="M38 166h284"/><path class="art-dashed art-muted" d="M43 173h275"/>
    <path class="art-accent" d="M88 140h17v-31h16V91h18V74h35v16h19v27h18v23h-23v18h-54v-16h-18v16H99v-15H88Z"/>
    <circle cx="160" cy="99" r="3.5" fill="var(--art-ink)"/><path class="art-line" d="M193 117h18m-61 42v10m54-10v10"/>
    <path class="art-muted" d="M260 166v-42h10v-14h17v14h10v42m-50 0v-24h8v-10h12v10h7v24"/>
    <circle class="art-accent-fill" cx="237" cy="65" r="4"/><circle class="art-muted" cx="261" cy="49" r="3"/>
  </svg>`;
}

function digitRecognizerIllustration() {
  return `<svg class="artwork-svg" viewBox="0 0 360 210">
    <path class="art-accent" d="M86 67c13-8 24-15 35-25h10v113m-27 0h57"/>
    <path class="art-line" d="m185 64 64-28m-64 28 64 39m-64-39 64 79m-64-39 64-40m-64 40 64 39m-64-39 64-79"/>
    <g class="art-node"><circle cx="185" cy="64" r="6"/><circle cx="185" cy="103" r="6"/><circle cx="185" cy="143" r="6"/><circle cx="258" cy="36" r="7"/><circle cx="258" cy="64" r="7"/><circle cx="258" cy="103" r="7"/><circle cx="258" cy="143" r="7"/></g>
    <path class="art-dashed art-muted" d="M76 172h83"/>
  </svg>`;
}

function eduTrackIllustration() {
  return `<svg class="artwork-svg" viewBox="0 0 360 210">
    <path class="art-line" d="m62 89 91-43 91 43-91 43-91-43Zm34 17v40c33 28 81 28 114 0v-40m34-17v57"/>
    <path class="art-accent" d="M153 88v44m-24-21 24 12 24-12"/><circle class="art-accent-fill" cx="250" cy="161" r="5"/>
    <path class="art-muted" d="M278 120c14 0 25 11 25 25v21h-50v-21c0-14 11-25 25-25Zm-11-14a11 11 0 1 0 22 0 11 11 0 0 0-22 0Z"/>
    <path class="art-dashed art-muted" d="M45 173h265"/>
  </svg>`;
}

function genericIllustration() {
  return `<svg class="artwork-svg" viewBox="0 0 360 210"><circle class="art-ring" cx="180" cy="105" r="57"/><circle class="art-ring art-ring-inner" cx="180" cy="105" r="39"/><path class="art-accent" d="M180 76v58m-18-14 18 14 18-14"/><circle class="art-accent-fill" cx="180" cy="105" r="4"/></svg>`;
}
