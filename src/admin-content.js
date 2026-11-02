import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { execute, field } from "firebase/firestore/pipelines";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { portfolioData } from "./data.js";
import {
  getFirebaseApp,
  getPortfolioDb,
  loadRemoteDocument,
} from "./firebase.js";
import {
  renderAdminFeedback,
  renderAdminFormActions,
  renderAdminSectionHeader,
} from "./admin-ui.js";
import { escapeHtml as esc, slugify } from "./utils.js";

const db = getPortfolioDb();
const storage = getStorage(getFirebaseApp());

export const adminNavigation = [
  {
    label: "PROFILE & SITE",
    sections: [
      { id: "profile", label: "Profile", singleton: true },
      { id: "settings", label: "Site settings", singleton: true },
    ],
  },
  {
    label: "PROJECTS",
    sections: [{ id: "projects", label: "Projects", collection: "projects" }],
  },
  {
    label: "EXPERIENCE & EDUCATION",
    sections: [
      { id: "experience", label: "Experience", collection: "experience" },
      { id: "education", label: "Education", collection: "education" },
    ],
  },
  {
    label: "SKILLS & CREDENTIALS",
    sections: [
      {
        id: "skills",
        label: "Skills",
        collection: "skillCategories",
      },
      { id: "achievements", label: "Recognition", collection: "achievements" },
      { id: "certificates", label: "Certificates", collection: "certificates" },
      { id: "workshops", label: "Workshops", collection: "workshops" },
    ],
  },
];

const definitions = {
  profile: {
    title: "Profile",
    description: "The personal details used across your portfolio.",
    fields: [
      { name: "name", label: "Name", required: true, max: 100 },
      { name: "initials", label: "Monogram", required: true, max: 6 },
      { name: "role", label: "Role", required: true, max: 140 },
      { name: "location", label: "Location", max: 100 },
      { name: "currentlyBuilding", label: "Current focus", max: 180 },
      {
        name: "primary",
        label: "Primary platform or specialty",
        max: 140,
        default: "Android · Kotlin",
      },
      {
        name: "interests",
        label: "Interests",
        max: 180,
        default: "Mobile · AI · Computer vision",
      },
      { name: "intro", label: "Introduction", type: "textarea", max: 500 },
      { name: "bio", label: "About biography", type: "textarea", max: 2000 },
      { name: "email", label: "Public email", type: "email", max: 200 },
      { name: "phone", label: "Public phone (optional)", type: "tel", max: 40 },
      {
        name: "profileImage",
        label: "Profile image",
        type: "asset",
        asset: "image",
        folder: "profile",
        filename: "portrait",
      },
      {
        name: "resumeUrl",
        label: "Résumé PDF",
        type: "asset",
        asset: "pdf",
        folder: "profile",
        filename: "resume",
      },
      {
        name: "socials",
        label: "Social links",
        type: "socials",
        max: 10,
        help: "One per line: label | URL | short handle. Lines set the public display order.",
      },
    ],
  },
  settings: {
    title: "Site settings",
    description:
      "Control your page title, search description, and share image.",
    fields: [
      { name: "siteTitle", label: "Site title", required: true, max: 140 },
      {
        name: "description",
        label: "Search description",
        type: "textarea",
        max: 320,
      },
      {
        name: "ogImage",
        label: "Social sharing image",
        type: "asset",
        asset: "image",
        folder: "profile",
        filename: "social-card",
      },
    ],
  },
  projects: {
    title: "Projects",
    fields: [
      { name: "title", label: "Project name", required: true, max: 120 },
      { name: "slug", label: "URL slug", required: true, max: 140 },
      { name: "category", label: "Category", required: true, max: 60 },
      { name: "summary", label: "Card summary", type: "textarea", max: 320 },
      {
        name: "description",
        label: "Project details",
        type: "textarea",
        max: 4000,
      },
      {
        name: "technologies",
        label: "Technologies",
        type: "list",
        maxItems: 24,
      },
      { name: "highlights", label: "Highlights", type: "list", maxItems: 12 },
      {
        name: "links.github",
        label: "Repository URL",
        type: "url",
        max: 2048,
      },
      {
        name: "links.githubLabel",
        label: "Repository button label",
        max: 60,
      },
      {
        name: "links.paper",
        label: "Article or research URL",
        type: "url",
        max: 2048,
      },
      {
        name: "links.paperLabel",
        label: "Article button label",
        max: 60,
      },
      {
        name: "links.article",
        label: "Alternate article URL",
        type: "url",
        max: 2048,
      },
      { name: "links.articleLabel", label: "Alternate article label", max: 60 },
      { name: "links.research", label: "Research URL", type: "url", max: 2048 },
      { name: "links.researchLabel", label: "Research button label", max: 60 },
      { name: "links.live", label: "Live project URL", type: "url", max: 2048 },
      { name: "links.liveLabel", label: "Live button label", max: 60 },
      {
        name: "coverImage",
        label: "Project cover image",
        type: "asset",
        asset: "image",
        folder: "projects",
        filename: "cover",
        scoped: true,
      },
      { name: "coverImageAlt", label: "Cover image description", max: 180 },
      { name: "featured", label: "Feature on home page", type: "checkbox" },
    ],
  },
  experience: {
    title: "Experience",
    fields: [
      { name: "role", label: "Role", required: true, max: 140 },
      { name: "company", label: "Company", required: true, max: 140 },
      { name: "companyUrl", label: "Company URL", type: "url", max: 2048 },
      { name: "location", label: "Location", max: 120 },
      { name: "employmentType", label: "Employment type", max: 80 },
      { name: "startDate", label: "Start date", max: 80 },
      { name: "endDate", label: "End date", max: 80 },
      { name: "description", label: "Details", type: "textarea", max: 4000 },
      {
        name: "technologies",
        label: "Tools and technologies",
        type: "list",
        maxItems: 24,
      },
    ],
  },
  education: {
    title: "Education",
    fields: [
      { name: "degree", label: "Degree or program", required: true, max: 160 },
      { name: "institution", label: "Institution", required: true, max: 200 },
      { name: "location", label: "Location", max: 140 },
      { name: "startDate", label: "Start date", max: 80 },
      { name: "endDate", label: "End date", max: 80 },
      { name: "description", label: "Details", type: "textarea", max: 1200 },
    ],
  },
  skills: {
    title: "Skills",
    fields: [
      { name: "name", label: "Group name", required: true, max: 80 },
      {
        name: "items",
        label: "Skills in this group",
        type: "list",
        maxItems: 32,
      },
    ],
  },
  achievements: {
    title: "Recognition",
    fields: [
      { name: "title", label: "Award or milestone", required: true, max: 180 },
      { name: "organization", label: "Organization or detail", max: 180 },
      { name: "year", label: "Year", max: 40 },
      { name: "url", label: "More information URL", type: "url", max: 2048 },
    ],
  },
  certificates: {
    title: "Certificates",
    fields: [
      { name: "name", label: "Certificate name", required: true, max: 180 },
      { name: "issuer", label: "Issuing organization", max: 140 },
      { name: "issuedAt", label: "Issue date or year", max: 60 },
      { name: "description", label: "Details", type: "textarea", max: 1200 },
      { name: "url", label: "Credential URL", type: "url", max: 2048 },
      {
        name: "documentUrl",
        label: "Certificate file",
        type: "asset",
        asset: "document",
        folder: "certificates",
        filename: "credential",
        scoped: true,
      },
    ],
  },
  workshops: {
    title: "Workshops & events",
    fields: [
      { name: "title", label: "Workshop or event", required: true, max: 180 },
      { name: "organization", label: "Organization", max: 140 },
      { name: "year", label: "Year", max: 40 },
      { name: "location", label: "Location", max: 140 },
      { name: "description", label: "Details", type: "textarea", max: 1200 },
      { name: "url", label: "More information URL", type: "url", max: 2048 },
      {
        name: "documentUrl",
        label: "Related file",
        type: "asset",
        asset: "document",
        folder: "certificates",
        filename: "workshop",
        scoped: true,
      },
    ],
  },
};

const sectionById = Object.fromEntries(
  adminNavigation
    .flatMap((group) => group.sections)
    .map((section) => [section.id, section]),
);

export function describeAdminError(
  error,
  fallback = "Could not complete this request.",
) {
  const message = error?.message || fallback;
  const code = String(error?.code || "").toLowerCase();
  if (
    code.includes("permission-denied") ||
    /missing or insufficient permissions/i.test(message)
  ) {
    return "Firestore rejected this write. The owner token is verified; confirm the portfolio database has the latest rules and that the entry matches its form fields.";
  }
  if (
    code.includes("unavailable") ||
    code.includes("network-request-failed") ||
    /client is offline/i.test(message)
  ) {
    return "Could not reach Firestore from this browser. Check the connection, then retry.";
  }
  return message;
}

export async function loadAdminContent(sectionIds = ["profile", "settings"]) {
  const content = {};
  const errors = {};
  const sections = [...new Set(sectionIds)]
    .map((id) => sectionById[id])
    .filter(Boolean);
  const reads = sections.map(async (section) => {
    try {
      if (section.singleton) {
        const collectionName =
          section.id === "profile" ? "portfolio" : "settings";
        const remoteRecord = await loadRemoteDocument(collectionName, "public");
        content[section.id] = remoteRecord
          ? { ...remoteRecord, id: "public" }
          : section.id === "profile"
            ? { ...portfolioData.profile, isPublished: true }
            : { ...portfolioData.settings, isPublished: true };
        return;
      }

      const result = await execute(
        db
          .pipeline()
          .collection(section.collection)
          .sort(field("order").ascending()),
      );
      content[section.id] = result.results.map((row) => ({
        ...row.data(),
        id: row.id,
      }));
    } catch (error) {
      console.error("Admin Firestore read failed", JSON.stringify({
        section: section.id,
        code: error?.code,
        message: error?.message,
      }));
      errors[section.id] = describeAdminError(
        error,
        "Could not load this section.",
      );
      content[section.id] = section.singleton ? null : [];
    }
  });

  await Promise.all(reads);
  return { content, errors };
}

function flattenValue(record, fieldName) {
  return fieldName.split(".").reduce((value, key) => value?.[key], record);
}

function renderField(fieldDef, record) {
  const value = flattenValue(record, fieldDef.name) ?? fieldDef.default ?? "";
  const required = fieldDef.required ? "required" : "";
  const maximum = fieldDef.max ? `maxlength="${fieldDef.max}"` : "";
  const label = esc(fieldDef.label);

  if (fieldDef.type === "checkbox") {
    return `<label class="admin-publish-toggle"><input type="checkbox" name="${esc(fieldDef.name)}" ${value ? "checked" : ""}><span><strong>${label}</strong></span></label>`;
  }
  if (fieldDef.type === "asset") {
    const accept =
      fieldDef.asset === "pdf"
        ? "application/pdf"
        : fieldDef.asset === "document"
          ? "application/pdf,image/jpeg,image/png,image/webp"
          : "image/jpeg,image/png,image/webp,image/gif";
    const note =
      fieldDef.asset === "pdf"
        ? "PDF, up to 15 MB."
        : fieldDef.asset === "document"
          ? "PDF or image, up to 15 MB."
          : "JPEG, PNG, WebP, or GIF, up to 8 MB.";
    return `<div class="admin-cover-row"><label>${label} URL<input name="${esc(fieldDef.name)}" type="text" maxlength="2048" value="${esc(value)}" placeholder="https://… or /assets/…"></label><label>Upload ${label.toLowerCase()}<input type="file" name="upload:${esc(fieldDef.name)}" accept="${accept}"><span class="field-help">${note} Uploads are stored in Firebase Storage.</span></label></div>${value ? `<div class="admin-cover-preview"><a href="${esc(value)}" target="_blank" rel="noreferrer">Current ${label.toLowerCase()} ↗</a></div>` : ""}`;
  }
  if (fieldDef.type === "list") {
    return `<label>${label}<textarea name="${esc(fieldDef.name)}" rows="5" ${maximum} placeholder="One item per line">${esc(Array.isArray(value) ? value.join("\n") : "")}</textarea><span class="field-help">One per line, up to ${fieldDef.maxItems} items.</span></label>`;
  }
  if (fieldDef.type === "socials") {
    const socials = Array.isArray(value)
      ? value
          .map((item) => [item.label, item.url, item.handle || ""].join(" | "))
          .join("\n")
      : "";
    return `<label>${label}<textarea name="${esc(fieldDef.name)}" rows="5" placeholder="GitHub | https://github.com/… | username">${esc(socials)}</textarea><span class="field-help">${esc(fieldDef.help || "")}</span></label>`;
  }
  const type = fieldDef.type === "textarea" ? "textarea" : "input";
  const inputType = fieldDef.type === "url" ? "url" : fieldDef.type || "text";
  const control =
    type === "textarea"
      ? `<textarea name="${esc(fieldDef.name)}" rows="4" ${maximum} ${required}>${esc(value)}</textarea>`
      : `<input name="${esc(fieldDef.name)}" type="${esc(inputType)}" ${maximum} ${required} value="${esc(value)}">`;
  return `<label>${label}${control}</label>`;
}

function recordTitle(sectionId, record) {
  if (sectionId === "experience")
    return record.role || record.company || "Untitled role";
  if (sectionId === "education")
    return record.degree || record.institution || "Untitled education";
  if (sectionId === "skills") return record.name || "Untitled skill group";
  return record.title || record.name || "Untitled entry";
}

export function renderContentManager(state) {
  const section = sectionById[state.activeSection] || sectionById.profile;
  const definition = definitions[section.id];
  const singleton = section.singleton;
  const records = singleton
    ? state.content[section.id]
      ? [state.content[section.id]]
      : []
    : [...(state.content[section.id] || [])].sort(
        (a, b) => (a.order ?? 999) - (b.order ?? 999),
      );
  const selected = state.selectedContent;

  if (selected?.section === section.id) {
    const record = selected.record || {};
    const editing = Boolean(record.id);
    const fields = definition.fields
      .map((fieldDef) => renderField(fieldDef, record))
      .join("");
    const orderField = singleton
      ? ""
      : `<label>Display order<input type="number" name="order" min="1" max="10000" value="${esc(record.order ?? records.length + 1)}" required></label>`;
    const publishToggle =
      section.id === "settings"
        ? `<p class="admin-description">Site settings apply to the public pages when saved.</p>`
        : `<label class="admin-publish-toggle"><input type="checkbox" name="isPublished" ${record.isPublished !== false ? "checked" : ""}><span><strong>Published</strong><small>Published content appears on the public portfolio. Turn this off to keep a draft in admin.</small></span></label>`;
    const backButton = `<button class="admin-quiet" type="button" data-admin-cancel ${state.busy ? "disabled" : ""}>← Back to ${esc(definition.title.toLowerCase())}</button>`;
    return `<section class="admin-editor" aria-busy="${state.busy}">${renderAdminSectionHeader({
      eyebrow: `${editing ? "EDIT" : "NEW"} / ${definition.title.toUpperCase()}`,
      title: editing ? recordTitle(section.id, record) : `Add ${definition.title.toLowerCase()}`,
      description: definition.description || "Update this portfolio entry.",
      actions: backButton,
    })}${renderAdminFeedback(state.contentErrors[section.id], { type: "error" })}${renderAdminFeedback(state.notice, { type: state.noticeType })}<form id="content-editor" class="admin-form" data-section="${esc(section.id)}" data-record-id="${esc(record.id || "")}"><div class="admin-form-grid content-form-grid">${fields}${orderField}</div>${publishToggle}${renderAdminFormActions({ submitLabel: editing ? "Save changes" : `Add ${definition.title.toLowerCase()}`, busy: state.busy })}</form></section>`;
  }

  const collectionList = state.contentErrors[section.id]
    ? ""
    : records.length
      ? records
          .map((record, index) => {
            const secondary =
              record.category ||
              record.organization ||
              record.institution ||
              record.issuer ||
              "";
            return `<article class="admin-post"><div class="admin-post-main"><span class="mono">${esc(secondary || definition.title.toUpperCase())} · #${String(index + 1).padStart(2, "0")}</span><h3>${esc(recordTitle(section.id, record))}</h3><p>${esc(record.summary || record.description || record.startDate || record.issuedAt || "No summary added.")}</p></div><div class="admin-post-state"><span class="admin-status ${record.isPublished !== false ? "is-live" : ""}">${record.isPublished !== false ? "Published" : "Draft"}</span><div class="admin-order-controls"><button class="admin-quiet" type="button" data-content-action="move" data-id="${esc(record.id)}" data-direction="-1" aria-label="Move ${esc(recordTitle(section.id, record))} up" ${state.busy || index === 0 ? "disabled" : ""}>↑</button><button class="admin-quiet" type="button" data-content-action="move" data-id="${esc(record.id)}" data-direction="1" aria-label="Move ${esc(recordTitle(section.id, record))} down" ${state.busy || index === records.length - 1 ? "disabled" : ""}>↓</button></div><button class="admin-quiet" type="button" data-content-action="edit" data-id="${esc(record.id)}" ${state.busy ? "disabled" : ""}>Edit</button><button class="admin-quiet danger-text" type="button" data-content-action="delete" data-id="${esc(record.id)}" ${state.busy ? "disabled" : ""}>Delete</button></div></article>`;
          })
          .join("")
      : `<div class="admin-empty"><span class="mono">NO ${esc(definition.title.toUpperCase())} YET</span><p>Add an entry when you’re ready to show it on the portfolio.</p></div>`;
  const loadingList = `<div class="admin-skeleton-list" role="status"><span class="admin-skeleton-label">Loading ${esc(definition.title.toLowerCase())}…</span><div class="admin-skeleton-row"></div><div class="admin-skeleton-row"></div><div class="admin-skeleton-row"></div></div>`;

  const addButton = singleton
    ? ""
    : `<button class="button button-dark" type="button" data-content-action="new" ${state.busy || state.contentLoading || state.contentErrors[section.id] ? "disabled" : ""}>Add ${esc(definition.title.toLowerCase())} <span aria-hidden="true">＋</span></button>`;
  const singletonButton = singleton
    ? `<button class="button button-dark" type="button" data-content-action="edit" data-id="public" ${state.busy || state.contentLoading || state.contentErrors[section.id] ? "disabled" : ""}>Edit ${esc(definition.title.toLowerCase())} <span aria-hidden="true">↗</span></button>`
    : addButton;
  const singletonStatus = singleton
    ? `<span class="admin-status ${!state.contentLoading && !state.contentErrors[section.id] && (section.id === "settings" || records[0]?.isPublished !== false) ? "is-live" : ""}">${state.contentLoading ? "Loading" : state.contentErrors[section.id] ? "Unavailable" : section.id === "settings" ? "Site-wide" : records[0]?.isPublished === false ? "Draft" : "Published"}</span>`
    : "";

  const retryButton = `<button class="admin-retry" type="button" data-content-action="reload">Retry</button>`;
  const count = state.contentLoading ? "…" : String(records.length).padStart(2, "0");
  return `<section class="admin-list" aria-busy="${state.contentLoading || state.busy}">${renderAdminSectionHeader({
    eyebrow: `${definition.title.toUpperCase()} / ${count}`,
    title: definition.title,
    description: definition.description || "Edit, order, and publish this content.",
    actions: `${singletonStatus}${singletonButton}`,
  })}${renderAdminFeedback(state.contentErrors[section.id], { type: "error", action: state.contentErrors[section.id] ? retryButton : "" })}${renderAdminFeedback(state.notice, { type: state.noticeType })}${state.contentLoading ? loadingList : `<div class="admin-post-list">${collectionList}</div>`}</section>`;
}

function parseSocials(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts[0] && parts[1])
    .map(([label, url, handle]) => ({ label, url, handle: handle || label }));
}

function writeNested(object, path, value) {
  const keys = path.split(".");
  let cursor = object;
  for (const key of keys.slice(0, -1)) cursor = cursor[key] ||= {};
  cursor[keys.at(-1)] = value;
}

function extensionFor(file) {
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
  };
  return extensions[file.type];
}

function nextRecordId(base, records) {
  const usedIds = new Set(records.map((record) => record.id));
  let candidate = base || "portfolio-entry";
  let suffix = 2;
  while (usedIds.has(candidate)) candidate = `${base}-${suffix++}`;
  return candidate;
}

function settingsWithManagedSection(settings, collectionName) {
  const managedSections = Array.isArray(settings?.managedSections)
    ? [...settings.managedSections]
    : [];
  if (!managedSections.includes(collectionName))
    managedSections.push(collectionName);

  return {
    siteTitle: settings?.siteTitle || portfolioData.settings.siteTitle,
    description: settings?.description || "",
    ogImage: settings?.ogImage || "",
    managedSections,
    isPublished: true,
    published: true,
    order: Number.isInteger(settings?.order) ? settings.order : 1,
    createdAt: settings?.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function hasPublishedEntry(records, excludingId) {
  return records.some(
    (record) => record.id !== excludingId && record.isPublished === true,
  );
}

async function uploadField(file, section, recordId, definition) {
  const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const allowed =
    definition.asset === "pdf"
      ? ["application/pdf"]
      : definition.asset === "document"
        ? [
            ...imageTypes.filter((type) => type !== "image/gif"),
            "application/pdf",
          ]
        : imageTypes;
  const sizeLimit =
    definition.asset === "image" ? 8 * 1024 * 1024 : 15 * 1024 * 1024;
  if (file.size > sizeLimit) {
    throw new Error(`${definition.label} file is too large.`);
  }
  if (!allowed.includes(file.type)) {
    throw new Error(
      `Choose a supported file for ${definition.label.toLowerCase()}.`,
    );
  }

  const directory = definition.scoped
    ? `${definition.folder}/${recordId}`
    : definition.folder;
  const objectRef = ref(
    storage,
    `${directory}/${definition.filename}-${Date.now()}.${extensionFor(file)}`,
  );
  await uploadBytes(objectRef, file, { contentType: file.type });
  return getDownloadURL(objectRef);
}

export async function saveContentRecord(sectionId, form, currentContent) {
  const section = sectionById[sectionId];
  const definition = definitions[sectionId];
  const formData = new FormData(form);
  const existingId = form.dataset.recordId;
  const currentRows = section.singleton
    ? currentContent[sectionId] || {}
    : currentContent[sectionId] || [];
  const existing = section.singleton
    ? currentRows
    : currentRows.find((record) => record.id === existingId);
  const values = existing ? { ...existing } : {};
  if (sectionId === "projects") {
    values.links = { ...(existing?.links || {}) };
  }
  delete values.id;

  for (const fieldDef of definition.fields) {
    if (fieldDef.type === "checkbox") {
      writeNested(values, fieldDef.name, formData.get(fieldDef.name) === "on");
    } else if (fieldDef.type === "list") {
      const items = String(formData.get(fieldDef.name) || "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
      if (items.length > fieldDef.maxItems) {
        throw new Error(
          `${fieldDef.label} can contain up to ${fieldDef.maxItems} items.`,
        );
      }
      writeNested(values, fieldDef.name, items);
    } else if (fieldDef.type === "socials") {
      const socials = parseSocials(formData.get(fieldDef.name));
      if (socials.length > fieldDef.max) {
        throw new Error(`Use no more than ${fieldDef.max} social links.`);
      }
      writeNested(values, fieldDef.name, socials);
    } else if (fieldDef.type !== "asset") {
      const value = String(formData.get(fieldDef.name) || "").trim();
      if (fieldDef.required && !value)
        throw new Error(`${fieldDef.label} is required.`);
      if (fieldDef.max && value.length > fieldDef.max) {
        throw new Error(
          `${fieldDef.label} must be ${fieldDef.max} characters or shorter.`,
        );
      }
      writeNested(values, fieldDef.name, value);
    } else {
      values[fieldDef.name] = String(formData.get(fieldDef.name) || "").trim();
    }
  }

  if (sectionId === "projects") {
    values.slug = slugify(values.slug || values.title);
    if (!values.slug) throw new Error("Add a URL slug for the project.");
    const collision = currentRows.find(
      (record) => record.slug === values.slug && record.id !== existingId,
    );
    if (collision) throw new Error("That project URL slug is already in use.");
  }

  const order = section.singleton
    ? (existing?.order ?? 1)
    : Number(formData.get("order")) ||
      existing?.order ||
      currentRows.length + 1;
  const isPublished =
    sectionId === "settings" || formData.get("isPublished") === "on";
  values.order = order;
  values.isPublished = isPublished;
  values.published = isPublished;
  if (sectionId === "settings") {
    values.managedSections = Array.isArray(existing?.managedSections)
      ? existing.managedSections
      : [];
  }
  if (existing?.createdAt) values.createdAt = existing.createdAt;
  else values.createdAt = serverTimestamp();
  values.updatedAt = serverTimestamp();

  const slugValue =
    values.slug ||
    slugify(
      values.title ||
        values.name ||
        values.role ||
        values.degree ||
        values.siteTitle ||
        sectionId,
    );
  const recordId = section.singleton
    ? "public"
    : existingId || nextRecordId(slugValue, currentRows);

  for (const fieldDef of definition.fields.filter(
    (item) => item.type === "asset",
  )) {
    const file = formData.get(`upload:${fieldDef.name}`);
    if (file instanceof File && file.size) {
      values[fieldDef.name] = await uploadField(
        file,
        sectionId,
        recordId,
        fieldDef,
      );
    }
    const url = values[fieldDef.name];
    if (url && !url.startsWith("/assets/") && !/^https:\/\//i.test(url)) {
      throw new Error(
        `${fieldDef.label} must be an HTTPS URL or a local /assets/ path.`,
      );
    }
  }

  const collectionName = section.singleton
    ? sectionId === "profile"
      ? "portfolio"
      : "settings"
    : section.collection;
  await setDoc(doc(db, collectionName, recordId), values);

  const publishedEntriesRemain = section.singleton
    ? sectionId !== "profile" || values.isPublished === true
    : hasPublishedEntry(currentRows, recordId) || values.isPublished === true;
  if (sectionId !== "settings" && !publishedEntriesRemain) {
    await markManaged(section, currentContent);
  }
  return { sectionId, recordId, values };
}

export async function deleteContentRecord(sectionId, recordId, currentContent) {
  const section = sectionById[sectionId];
  if (section.singleton)
    throw new Error("Profile and site settings cannot be deleted.");
  const remaining = currentContent[sectionId].filter(
    (item) => item.id !== recordId,
  );
  await deleteDoc(doc(db, section.collection, recordId));
  if (!hasPublishedEntry(remaining)) await markManaged(section, currentContent);
  await reorderContent(sectionId, remaining);
}

async function markManaged(section, currentContent) {
  const settings = currentContent.settings || portfolioData.settings;
  const collectionName = section.collection || section.id;
  const updatedSettings = settingsWithManagedSection(settings, collectionName);
  await setDoc(
    doc(db, "settings", "public"),
    updatedSettings,
  );
  currentContent.settings = { ...updatedSettings, id: "public" };
}

export async function reorderContent(sectionId, records) {
  const section = sectionById[sectionId];
  if (section.singleton) return;
  const batch = writeBatch(db);
  records.forEach((record, index) => {
    const { id, ...data } = record;
    batch.set(
      doc(db, section.collection, id),
      { ...data, order: index + 1, updatedAt: serverTimestamp() },
      { merge: true },
    );
  });
  if (records.length) await batch.commit();
}

export async function moveContentRecord(
  sectionId,
  recordId,
  direction,
  currentContent,
) {
  const records = [...currentContent[sectionId]].sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999),
  );
  const currentIndex = records.findIndex((record) => record.id === recordId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= records.length) return;
  [records[currentIndex], records[nextIndex]] = [
    records[nextIndex],
    records[currentIndex],
  ];
  await reorderContent(sectionId, records);
}
