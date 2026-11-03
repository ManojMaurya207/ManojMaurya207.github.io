import {
  renderAdminFeedback,
  renderAdminFormActions,
  renderAdminSectionHeader,
} from "./ui.js";
import {
  adminContentDefinitions,
  adminSectionsById,
} from "./content-schema.js";
import { escapeHtml as esc } from "../utils.js";

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
  const section =
    adminSectionsById[state.activeSection] || adminSectionsById.profile;
  const definition = adminContentDefinitions[section.id];
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
    return `<section class="admin-editor" aria-busy="${state.busy}">${renderAdminSectionHeader(
      {
        eyebrow: `${editing ? "EDIT" : "NEW"} / ${definition.title.toUpperCase()}`,
        title: editing
          ? recordTitle(section.id, record)
          : `Add ${definition.title.toLowerCase()}`,
        description: definition.description || "Update this portfolio entry.",
        actions: backButton,
      },
    )}${renderAdminFeedback(state.contentErrors[section.id], { type: "error" })}${renderAdminFeedback(state.notice, { type: state.noticeType })}<form id="content-editor" class="admin-form" data-section="${esc(section.id)}" data-record-id="${esc(record.id || "")}"><div class="admin-form-grid content-form-grid">${fields}${orderField}</div>${publishToggle}${renderAdminFormActions({ submitLabel: editing ? "Save changes" : `Add ${definition.title.toLowerCase()}`, busy: state.busy })}</form></section>`;
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
  const count = state.contentLoading
    ? "…"
    : String(records.length).padStart(2, "0");
  return `<section class="admin-list" aria-busy="${state.contentLoading || state.busy}">${renderAdminSectionHeader(
    {
      eyebrow: `${definition.title.toUpperCase()} / ${count}`,
      title: definition.title,
      description:
        definition.description || "Edit, order, and publish this content.",
      actions: `${singletonStatus}${singletonButton}`,
    },
  )}${renderAdminFeedback(state.contentErrors[section.id], { type: "error", action: state.contentErrors[section.id] ? retryButton : "" })}${renderAdminFeedback(state.notice, { type: state.noticeType })}${state.contentLoading ? loadingList : `<div class="admin-post-list">${collectionList}</div>`}</section>`;
}
