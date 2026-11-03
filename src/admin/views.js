import { adminNavigation } from "./content-schema.js";
import { renderContentManager } from "./content-view.js";
import {
  renderAdminFeedback,
  renderAdminFormActions,
  renderAdminSectionHeader,
} from "./ui.js";
import { renderMarkdown } from "../markdown.js";
import { escapeHtml as esc } from "../utils.js";

function formatDate(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  return date && !Number.isNaN(date.valueOf())
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date)
    : "Not saved yet";
}

function renderLogin(state, adminEmail) {
  return `<main class="admin-page"><div class="admin-top"><a class="wordmark" href="/">MM<span class="wordmark-dot">.</span></a><a class="back-link" href="/">← Back to portfolio</a></div><section class="admin-login"><span class="mono">PRIVATE AREA / CONTENT</span><h1>Sign in to<br>manage your portfolio<span class="accent-dot">.</span></h1><p>This area is restricted to the portfolio owner. Sign in with the owner email and password.</p>${state.authError ? `<div class="admin-alert" role="alert">${esc(state.authError)}</div>` : ""}<form id="admin-login" class="admin-form"><label>Email address<input name="email" type="email" autocomplete="username" required value="${esc(adminEmail)}" placeholder="you@example.com"></label><label>Password<input name="password" type="password" autocomplete="current-password" required placeholder="Your password"></label><button class="button button-dark admin-login-submit" type="submit" ${state.busy ? "disabled" : ""}>${state.busy ? "Signing in…" : "Sign in"} <span>↗</span></button><button class="admin-reset" type="button" data-action="reset-password" ${state.busy ? "disabled" : ""}>Forgot password?</button></form><a class="admin-back" href="/">Return to portfolio</a></section><p class="admin-footnote">PRIVATE CONTENT IS ONLY VISIBLE TO THE ADMIN ACCOUNT</p></main>`;
}

function renderDenied(state) {
  return `<main class="admin-page"><div class="admin-top"><a class="wordmark" href="/">MM<span class="wordmark-dot">.</span></a><button class="admin-quiet" data-action="sign-out">Sign out</button></div><section class="admin-login"><span class="mono">ACCESS RESTRICTED</span><h1>This account<br>is not an admin<span class="accent-dot">.</span></h1><p>Signed in as <strong>${esc(state.user?.email || "unknown account")}</strong>. The admin panel is restricted to the portfolio owner account.</p><button class="button button-outline" data-action="sign-out">Sign out</button></section></main>`;
}

function renderUnverified(state, adminEmail) {
  return `<main class="admin-page"><div class="admin-top"><a class="wordmark" href="/">MM<span class="wordmark-dot">.</span></a><button class="admin-quiet" data-action="sign-out">Sign out</button></div><section class="admin-login"><span class="mono">EMAIL VERIFICATION REQUIRED</span><h1>Verify your<br>email<span class="accent-dot">.</span></h1><p><strong>${esc(state.user?.email || adminEmail)}</strong> is the owner account, but Firebase hasn’t marked its email as verified yet. Verify it before opening the admin panel.</p>${state.authError ? `<div class="admin-alert" role="status">${esc(state.authError)}</div>` : ""}<div class="admin-form"><button class="button button-dark admin-login-submit" data-action="resend-verification" ${state.busy ? "disabled" : ""}>${state.busy ? "Sending…" : "Resend verification email"} <span>↗</span></button><button class="button button-outline" data-action="check-verification" ${state.busy ? "disabled" : ""}>I’ve verified it — check again</button><button class="admin-reset" data-action="sign-out">Sign out and return to login</button></div></section></main>`;
}

function renderList(state) {
  const posts = [...state.blogs].sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999),
  );
  const list =
    !state.blogsLoaded && state.notice
      ? ""
      : posts.length
        ? posts
            .map(
              (post, index) =>
                `<article class="admin-post"><div class="admin-post-main"><span class="mono">${esc(post.category || "ARTICLE")} · ${esc(formatDate(post.updatedAt))}</span><h3>${esc(post.title || "Untitled")}</h3><p>${esc(post.excerpt || "No excerpt added.")}</p></div><div class="admin-post-state"><span class="admin-status ${post.isPublished ? "is-live" : ""}">${post.isPublished ? "Published" : "Draft"}</span><div class="admin-order-controls"><button class="admin-quiet" data-action="move-blog" data-id="${esc(post.id)}" data-direction="-1" aria-label="Move ${esc(post.title || "post")} up" ${state.busy || index === 0 ? "disabled" : ""}>↑</button><button class="admin-quiet" data-action="move-blog" data-id="${esc(post.id)}" data-direction="1" aria-label="Move ${esc(post.title || "post")} down" ${state.busy || index === posts.length - 1 ? "disabled" : ""}>↓</button></div><button class="admin-quiet" data-action="edit" data-id="${esc(post.id)}" ${state.busy ? "disabled" : ""}>Edit</button><button class="admin-quiet danger-text" data-action="delete" data-id="${esc(post.id)}" ${state.busy ? "disabled" : ""}>Delete</button></div></article>`,
            )
            .join("")
        : `<div class="admin-empty"><span class="mono">NO ARTICLES YET</span><p>Create a post to start your writing archive.</p></div>`;
  const skeleton = `<div class="admin-skeleton-list" role="status"><span class="admin-skeleton-label">Loading your articles…</span><div class="admin-skeleton-row"></div><div class="admin-skeleton-row"></div><div class="admin-skeleton-row"></div></div>`;
  const header = renderAdminSectionHeader({
    eyebrow: `BLOG / ${state.blogsLoaded ? String(posts.length).padStart(2, "0") : "…"} ARTICLES`,
    title: "Your writing",
    description: "Draft, publish, and organize the notes on your portfolio.",
    actions: `<button class="button button-dark" data-action="new" ${!state.blogsLoaded || state.busy ? "disabled" : ""}>New article <span aria-hidden="true">＋</span></button>`,
  });
  const retryButton = `<button class="admin-retry" type="button" data-action="reload-blogs">Retry</button>`;
  const feedback = renderAdminFeedback(state.notice, {
    type: state.noticeType,
    action: !state.blogsLoaded && state.notice ? retryButton : "",
  });
  const content = state.blogLoading
    ? skeleton
    : !state.blogsLoaded
      ? ""
      : `<div class="admin-post-list">${list}</div>`;
  return `<section class="admin-list" aria-busy="${state.blogLoading || state.busy}">${header}${feedback}${content}</section>`;
}

function renderEditor(state) {
  const post = state.selected || {};
  const editing = Boolean(post.id);
  const tags = Array.isArray(post.tags) ? post.tags.join(", ") : "";
  const header = renderAdminSectionHeader({
    eyebrow: editing ? "EDIT ARTICLE" : "NEW ARTICLE",
    title: editing ? post.title || "Untitled" : "Draft a story",
    description: "Write, preview, and publish an article for your portfolio.",
    actions: `<button class="admin-quiet" type="button" data-admin-cancel ${state.busy ? "disabled" : ""}>← Back to posts</button>`,
  });
  return `<section class="admin-editor" aria-busy="${state.busy}">${header}${renderAdminFeedback(state.notice, { type: state.noticeType })}<form id="blog-editor" class="admin-form">
    <div class="admin-form-grid"><label>Title<input name="title" maxlength="120" required value="${esc(post.title)}" placeholder="A clear, useful headline"></label><label>URL slug<input name="slug" maxlength="140" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value="${esc(post.slug)}" placeholder="generated-from-title"></label></div>
    <div class="admin-form-grid"><label>Category<input name="category" maxlength="40" required value="${esc(post.category)}" placeholder="Android, Firebase, Career…"></label><label>Tags<input name="tags" value="${esc(tags)}" placeholder="Kotlin, Compose, Firebase"><span class="field-help">Separate tags with commas, up to 8.</span></label></div>
    <label>Excerpt<textarea name="excerpt" rows="3" maxlength="320" placeholder="A short summary for article cards">${esc(post.excerpt)}</textarea><span class="field-help">Up to 320 characters.</span></label>
    <div class="admin-cover-row"><label>Cover image<input name="coverFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><span class="field-help">Optional image, up to 5 MB. Firebase Storage must be initialized before uploads will work; use an HTTPS image URL for now.</span></label><label>Or cover image URL<input name="coverImage" type="url" maxlength="2048" value="${esc(post.coverImage)}" placeholder="https://…"></label></div>
    ${post.coverImage ? `<div class="admin-cover-preview"><img src="${esc(post.coverImage)}" alt="Current article cover"><span class="field-help">Current cover image</span></div>` : ""}
    <div class="markdown-editor-layout" data-markdown-editor>
      <div class="markdown-tabs" role="tablist" aria-label="Article editor">
        <button type="button" role="tab" id="markdown-write-tab" aria-controls="markdown-write-panel" aria-selected="true" class="is-active" data-markdown-tab="write">Write</button>
        <button type="button" role="tab" id="markdown-preview-tab" aria-controls="markdown-preview-panel" aria-selected="false" data-markdown-tab="preview">Preview</button>
      </div>
      <div class="markdown-source" id="markdown-write-panel" role="tabpanel" aria-labelledby="markdown-write-tab" data-markdown-panel="write">
        <div class="markdown-toolbar" role="toolbar" aria-label="Markdown formatting">
          <button type="button" data-markdown-format="heading" title="Heading">H2</button>
          <button type="button" data-markdown-format="bold" title="Bold"><strong>B</strong></button>
          <button type="button" data-markdown-format="italic" title="Italic"><em>I</em></button>
          <button type="button" data-markdown-format="link" title="Link">Link</button>
          <button type="button" data-markdown-format="bullet" title="Bulleted list">• List</button>
          <button type="button" data-markdown-format="numbered" title="Numbered list">1. List</button>
          <button type="button" data-markdown-format="quote" title="Quote">Quote</button>
          <button type="button" data-markdown-format="code" title="Code block">&lt;/&gt;</button>
        </div>
        <label>Article content<textarea name="content" rows="18" required maxlength="50000" placeholder="# Start with a heading…">${esc(post.content)}</textarea></label>
        <span class="field-help">Write in Markdown. Supports headings, emphasis, links, images, lists, quotes, tables, and code blocks.</span>
      </div>
      <section class="markdown-preview-panel" id="markdown-preview-panel" role="tabpanel" aria-labelledby="markdown-preview-tab" data-markdown-panel="preview" hidden>
        <div class="markdown-preview-heading"><span class="mono">PREVIEW</span><span>Rendered Markdown</span></div>
        <article class="article-content markdown-preview" data-markdown-preview>${post.content?.trim() ? renderMarkdown(post.content) : '<p class="markdown-empty">Your article preview will appear here.</p>'}</article>
      </section>
    </div>
    <label class="admin-publish-toggle"><input name="isPublished" type="checkbox" ${post.isPublished ? "checked" : ""}><span><strong>Published</strong><small>Published articles appear in the public writing pages. Drafts stay visible only here.</small></span></label>
    ${renderAdminFormActions({ submitLabel: editing ? "Save changes" : "Create article", busy: state.busy })}
  </form></section>`;
}

function renderPanel(state) {
  const displayName = state.user?.displayName || state.user?.email || "Admin";
  const sectionNav = adminNavigation
    .map(
      (group, groupIndex) =>
        `<div class="admin-nav-group"><span class="mono"><span>${String(groupIndex + 1).padStart(2, "0")}</span> ${esc(group.label)}</span>${group.sections
          .map((section) => {
            const count = section.singleton
              ? ""
              : `<span class="admin-side-count">${state.loadingSections.has(section.id) ? "…" : state.loadedSections.has(section.id) ? state.content[section.id]?.length || 0 : "—"}</span>`;
            return `<button type="button" class="admin-side-link ${state.activeSection === section.id ? "active" : ""}" data-admin-section="${esc(section.id)}" ${state.activeSection === section.id ? 'aria-current="page"' : ""} ${state.busy ? "disabled" : ""}>${esc(section.label)} ${count}</button>`;
          })
          .join("")}</div>`,
    )
    .join("");
  const blogNav = `<div class="admin-nav-group"><span class="mono"><span>05</span> PUBLISHING</span><button type="button" class="admin-side-link ${state.activeSection === "blog" ? "active" : ""}" data-admin-section="blog" ${state.activeSection === "blog" ? 'aria-current="page"' : ""} ${state.busy ? "disabled" : ""}>Blog posts <span class="admin-side-count">${state.blogLoading ? "…" : state.blogsLoaded ? state.blogs.length : "—"}</span></button></div>`;
  const content =
    state.activeSection === "blog"
      ? state.selected
        ? renderEditor(state)
        : renderList(state)
      : renderContentManager({
          ...state,
          contentLoading: state.loadingSections.has(state.activeSection),
        });
  return `<main class="admin-page" aria-busy="${state.busy}"><header class="admin-top"><a class="wordmark" href="/">MM<span class="wordmark-dot">.</span></a><div class="admin-top-label"><span class="status-dot"></span><span>Portfolio workspace</span></div><div class="admin-account"><span>${esc(displayName)}</span><button class="admin-quiet" data-action="sign-out" ${state.busy ? "disabled" : ""}>Sign out ↗</button></div></header><div class="admin-shell"><aside class="admin-sidebar" aria-label="Portfolio admin sections"><div class="admin-sidebar-head"><span class="mono">WORKSPACE</span><span class="admin-sidebar-private">Private</span></div>${sectionNav}${blogNav}<a class="admin-side-link admin-view-link" href="/">View portfolio <span>↗</span></a><div class="admin-sidebar-note"><span class="status-dot"></span><span>Owner access verified</span></div></aside><div class="admin-content"><div class="admin-heading"><div><span class="mono">PORTFOLIO / ADMIN</span><h1>Content desk<span class="accent-dot">.</span></h1><p>Edit and reorder content, then choose what’s published.</p></div><div class="admin-heading-card"><span class="mono">SIGNED IN AS</span><strong>${esc(state.user?.email || displayName)}</strong><span>Your portfolio content, in one place.</span></div></div>${content}</div></div></main>`;
}

export function renderAdminScreen(
  state,
  { adminEmail, isOwnerAccount, isAdmin },
) {
  if (state.user === undefined)
    return '<main class="admin-page"><div class="admin-loading">Checking admin access…</div></main>';
  if (!state.user) return renderLogin(state, adminEmail);
  if (!isOwnerAccount(state.user)) return renderDenied(state);
  if (!isAdmin(state.user)) return renderUnverified(state, adminEmail);
  return renderPanel(state);
}
