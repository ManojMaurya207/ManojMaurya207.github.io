import { escapeHtml } from "../utils.js";

export function renderAdminSectionHeader({
  eyebrow,
  title,
  description = "",
  actions = "",
}) {
  return `<header class="admin-section-head"><div class="admin-section-heading"><span class="mono">${escapeHtml(eyebrow)}</span><h2>${escapeHtml(title)}</h2>${description ? `<p class="admin-description">${escapeHtml(description)}</p>` : ""}</div>${actions ? `<div class="admin-section-actions">${actions}</div>` : ""}</header>`;
}

export function renderAdminFeedback(
  message,
  { type = "status", action = "" } = {},
) {
  if (!message) return "";
  const isError = type === "error";
  return `<div class="admin-feedback ${isError ? "is-error" : "is-success"}" role="${isError ? "alert" : "status"}"><span>${escapeHtml(message)}</span>${action}</div>`;
}

export function renderAdminFormActions({
  submitLabel = "Save changes",
  busy = false,
} = {}) {
  return `<div class="admin-form-actions"><button type="button" class="button button-plain" data-admin-cancel ${busy ? "disabled" : ""}>Cancel</button><button type="submit" class="button button-dark" ${busy ? "disabled" : ""}>${busy ? "Saving…" : escapeHtml(submitLabel)} <span aria-hidden="true">↗</span></button></div>`;
}
