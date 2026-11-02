import {
  getAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { execute } from "firebase/firestore/pipelines";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import {
  adminNavigation,
  describeAdminError,
  deleteContentRecord,
  loadAdminContent,
  moveContentRecord,
  renderContentManager,
  saveContentRecord,
} from "./admin-content.js";
import { adminEmail, getFirebaseApp, getPortfolioDb } from "./firebase.js";
import {
  renderAdminFeedback,
  renderAdminFormActions,
  renderAdminSectionHeader,
} from "./admin-ui.js";
import { renderMarkdown, setupCodeCopy } from "./markdown.js";

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 140);
const auth = getAuth(getFirebaseApp());
const db = getPortfolioDb();
const storage = getStorage(getFirebaseApp());
const state = {
  user: undefined,
  blogs: [],
  blogsLoaded: false,
  blogLoading: false,
  selected: null,
  activeSection: "profile",
  selectedContent: null,
  content: {},
  contentErrors: {},
  loadedSections: new Set(),
  loadingSections: new Set(),
  busy: false,
  notice: "",
  noticeType: "status",
  authError: "",
};
let root;
const contentLoads = new Map();
let adminSessionReady = false;
let adminSessionRefresh;

function setNotice(message = "", type = "status") {
  state.notice = message;
  state.noticeType = type;
}

function isOwnerAccount(user) {
  return Boolean(user?.email?.toLowerCase() === adminEmail);
}

function isAdmin(user) {
  return Boolean(isOwnerAccount(user) && user.emailVerified);
}

async function refreshAdminToken(user = auth.currentUser) {
  if (!isAdmin(user)) return;
  if (!adminSessionRefresh) {
    const uid = user.uid;
    const refresh = user.getIdTokenResult(true).then(({ claims }) => {
      const tokenIsAdmin =
        claims.email?.toLowerCase() === adminEmail &&
        claims.email_verified === true;
      if (!tokenIsAdmin) {
        throw new Error(
          "Firebase’s refreshed ID token does not include the verified portfolio owner claims. Sign out, sign in again, then verify the owner email in Firebase Authentication.",
        );
      }
      if (auth.currentUser?.uid === uid) adminSessionReady = true;
    });
    let trackedRefresh;
    trackedRefresh = refresh.finally(() => {
      if (adminSessionRefresh === trackedRefresh) adminSessionRefresh = null;
    });
    adminSessionRefresh = trackedRefresh;
  }
  await adminSessionRefresh;
}

async function ensureAdminSession() {
  if (!isAdmin(auth.currentUser)) {
    throw new Error("Sign in with the verified portfolio owner account.");
  }
  if (!adminSessionReady) await refreshAdminToken();
}

function formatDate(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  return date && !Number.isNaN(date.valueOf())
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date)
    : "Not saved yet";
}

function renderLogin() {
  root.innerHTML = `<main class="admin-page"><div class="admin-top"><a class="wordmark" href="/">MM<span class="wordmark-dot">.</span></a><a class="back-link" href="/">← Back to portfolio</a></div><section class="admin-login"><span class="mono">PRIVATE AREA / CONTENT</span><h1>Sign in to<br>manage your portfolio<span class="accent-dot">.</span></h1><p>This area is restricted to the portfolio owner. Sign in with the owner email and password.</p>${state.authError ? `<div class="admin-alert" role="alert">${esc(state.authError)}</div>` : ""}<form id="admin-login" class="admin-form"><label>Email address<input name="email" type="email" autocomplete="username" required value="${esc(adminEmail)}" placeholder="you@example.com"></label><label>Password<input name="password" type="password" autocomplete="current-password" required placeholder="Your password"></label><button class="button button-dark admin-login-submit" type="submit" ${state.busy ? "disabled" : ""}>${state.busy ? "Signing in…" : "Sign in"} <span>↗</span></button><button class="admin-reset" type="button" data-action="reset-password" ${state.busy ? "disabled" : ""}>Forgot password?</button></form><a class="admin-back" href="/">Return to portfolio</a></section><p class="admin-footnote">PRIVATE CONTENT IS ONLY VISIBLE TO THE ADMIN ACCOUNT</p></main>`;
}

function renderDenied() {
  root.innerHTML = `<main class="admin-page"><div class="admin-top"><a class="wordmark" href="/">MM<span class="wordmark-dot">.</span></a><button class="admin-quiet" data-action="sign-out">Sign out</button></div><section class="admin-login"><span class="mono">ACCESS RESTRICTED</span><h1>This account<br>is not an admin<span class="accent-dot">.</span></h1><p>Signed in as <strong>${esc(state.user?.email || "unknown account")}</strong>. The admin panel is restricted to the portfolio owner account.</p><button class="button button-outline" data-action="sign-out">Sign out</button></section></main>`;
}

function renderUnverified() {
  root.innerHTML = `<main class="admin-page"><div class="admin-top"><a class="wordmark" href="/">MM<span class="wordmark-dot">.</span></a><button class="admin-quiet" data-action="sign-out">Sign out</button></div><section class="admin-login"><span class="mono">EMAIL VERIFICATION REQUIRED</span><h1>Verify your<br>email<span class="accent-dot">.</span></h1><p><strong>${esc(state.user?.email || adminEmail)}</strong> is the owner account, but Firebase hasn’t marked its email as verified yet. Verify it before opening the admin panel.</p>${state.authError ? `<div class="admin-alert" role="status">${esc(state.authError)}</div>` : ""}<div class="admin-form"><button class="button button-dark admin-login-submit" data-action="resend-verification" ${state.busy ? "disabled" : ""}>${state.busy ? "Sending…" : "Resend verification email"} <span>↗</span></button><button class="button button-outline" data-action="check-verification" ${state.busy ? "disabled" : ""}>I’ve verified it — check again</button><button class="admin-reset" data-action="sign-out">Sign out and return to login</button></div></section></main>`;
}

function renderList() {
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

function renderEditor() {
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

function renderPanel() {
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
        ? renderEditor()
        : renderList()
      : renderContentManager({
          ...state,
          contentLoading: state.loadingSections.has(state.activeSection),
        });
  root.innerHTML = `<main class="admin-page" aria-busy="${state.busy}"><header class="admin-top"><a class="wordmark" href="/">MM<span class="wordmark-dot">.</span></a><div class="admin-top-label"><span class="status-dot"></span><span>Portfolio workspace</span></div><div class="admin-account"><span>${esc(displayName)}</span><button class="admin-quiet" data-action="sign-out" ${state.busy ? "disabled" : ""}>Sign out ↗</button></div></header><div class="admin-shell"><aside class="admin-sidebar" aria-label="Portfolio admin sections"><div class="admin-sidebar-head"><span class="mono">WORKSPACE</span><span class="admin-sidebar-private">Private</span></div>${sectionNav}${blogNav}<a class="admin-side-link admin-view-link" href="/">View portfolio <span>↗</span></a><div class="admin-sidebar-note"><span class="status-dot"></span><span>Owner access verified</span></div></aside><div class="admin-content"><div class="admin-heading"><div><span class="mono">PORTFOLIO / ADMIN</span><h1>Content desk<span class="accent-dot">.</span></h1><p>Edit and reorder content, then choose what’s published.</p></div><div class="admin-heading-card"><span class="mono">SIGNED IN AS</span><strong>${esc(state.user?.email || displayName)}</strong><span>Your portfolio content, in one place.</span></div></div>${content}</div></div></main>`;
}

function render() {
  if (state.user === undefined) {
    root.innerHTML =
      '<main class="admin-page"><div class="admin-loading">Checking admin access…</div></main>';
  } else if (!state.user) renderLogin();
  else if (!isOwnerAccount(state.user)) renderDenied();
  else if (!isAdmin(state.user)) renderUnverified();
  else renderPanel();
}

async function loadBlogs({ force = false } = {}) {
  if (state.blogLoading || (state.blogsLoaded && !force)) return;
  state.blogLoading = true;
  setNotice();
  render();
  try {
    await ensureAdminSession();
    const snapshot = await execute(db.pipeline().collection("blogs"));
    state.blogs = snapshot.results.map((row) => ({
      ...row.data(),
      id: row.id,
    }));
    state.blogsLoaded = true;
  } catch (error) {
    setNotice(`Could not load blog posts: ${describeAdminError(error, "check Firebase access and deployment settings.")}`, "error");
  } finally {
    state.blogLoading = false;
    render();
  }
}

async function loadContent(
  sectionIds = [state.activeSection],
  { force = false } = {},
) {
  const requested = [...new Set(sectionIds)];
  const loads = requested.map((sectionId) => {
    if (!force && state.loadedSections.has(sectionId)) return Promise.resolve();
    if (contentLoads.has(sectionId)) return contentLoads.get(sectionId);

    state.loadingSections.add(sectionId);
    render();
    const load = ensureAdminSession()
      .then(() => loadAdminContent([sectionId]))
      .then((result) => {
        if (Object.hasOwn(result.content, sectionId))
          state.content[sectionId] = result.content[sectionId];
        if (result.errors[sectionId]) {
          state.contentErrors[sectionId] = result.errors[sectionId];
        } else {
          delete state.contentErrors[sectionId];
          state.loadedSections.add(sectionId);
        }
      })
      .catch((error) => {
        state.contentErrors[sectionId] = describeAdminError(
          error,
          "Could not load this section.",
        );
      })
      .finally(() => {
        state.loadingSections.delete(sectionId);
        contentLoads.delete(sectionId);
        render();
      });
    contentLoads.set(sectionId, load);
    return load;
  });
  await Promise.all(loads);
}

async function loadAdminData() {
  await loadContent(["profile", "settings"]);
}

function retryActiveSectionWhenOnline() {
  if (!isAdmin(state.user)) return;
  void (async () => {
    try {
      await refreshAdminToken();
    } catch (error) {
      setNotice(describeAdminError(
        error,
        "Could not refresh the admin session.",
      ), "error");
      render();
      return;
    }
    if (state.activeSection === "blog") {
      await loadBlogs({ force: true });
      return;
    }
    await loadContent([state.activeSection], { force: true });
  })();
}

async function reorderBlogPosts(recordId, direction) {
  await ensureAdminSession();
  const posts = [...state.blogs].sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999),
  );
  const currentIndex = posts.findIndex((post) => post.id === recordId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= posts.length) return;
  [posts[currentIndex], posts[nextIndex]] = [
    posts[nextIndex],
    posts[currentIndex],
  ];
  const batch = writeBatch(db);
  posts.forEach((post, index) => {
    const { id, ...data } = post;
    batch.set(doc(db, "blogs", id), {
      ...data,
      order: index + 1,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

function estimateReadingTime(content) {
  return Math.max(
    1,
    Math.ceil(content.trim().split(/\s+/).filter(Boolean).length / 200),
  );
}

async function savePost(form) {
  const formData = new FormData(form);
  await ensureAdminSession();
  const title = String(formData.get("title") || "").trim();
  const slug = slugify(String(formData.get("slug") || title).trim());
  const category = String(formData.get("category") || "").trim();
  const excerpt = String(formData.get("excerpt") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const tags = String(formData.get("tags") || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new Error(
      "Use a URL-safe slug with lowercase letters, numbers, and hyphens.",
    );
  if (tags.length > 8 || tags.some((tag) => tag.length > 32))
    throw new Error("Use no more than 8 tags, each 32 characters or shorter.");
  const conflict = state.blogs.find(
    (item) => item.slug === slug && item.id !== state.selected?.id,
  );
  if (conflict)
    throw new Error("That URL slug is already used by another article.");

  const id = state.selected?.id || doc(collection(db, "blogs")).id;
  const existing = state.blogs.find((item) => item.id === id);
  let coverImage = String(formData.get("coverImage") || "").trim();
  const file = formData.get("coverFile");
  if (file instanceof File && file.size) {
    if (file.size > 5 * 1024 * 1024)
      throw new Error("Cover images must be 5 MB or smaller.");
    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        file.type,
      )
    )
      throw new Error("Choose a JPEG, PNG, WebP, or GIF image.");
    const extension = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    }[file.type];
    const objectRef = ref(storage, `blogs/${id}/cover.${extension}`);
    await uploadBytes(objectRef, file, { contentType: file.type });
    coverImage = await getDownloadURL(objectRef);
  }
  if (coverImage && !/^https:\/\//i.test(coverImage))
    throw new Error("Cover image URLs must use HTTPS.");

  await setDoc(doc(db, "blogs", id), {
    title,
    slug,
    category,
    excerpt,
    content,
    coverImage,
    tags,
    readingTime: estimateReadingTime(content),
    isPublished: formData.get("isPublished") === "on",
    order:
      existing?.order ??
      Math.max(0, ...state.blogs.map((post) => post.order || 0)) + 1,
    createdAt: existing?.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  state.selected = null;
  await loadBlogs({ force: true });
  if (state.noticeType !== "error") setNotice("Article saved.", "success");
}

async function handleClick(event) {
  if (event.target.closest("[data-admin-cancel]")) {
    state.selected = null;
    state.selectedContent = null;
    setNotice();
    render();
    return;
  }

  const sectionButton = event.target.closest("[data-admin-section]");
  if (sectionButton) {
    state.activeSection = sectionButton.dataset.adminSection;
    state.selected = null;
    state.selectedContent = null;
    setNotice();
    render();
    if (state.activeSection === "blog") void loadBlogs();
    else void loadContent([state.activeSection]);
    return;
  }

  const contentButton = event.target.closest("[data-content-action]");
  if (contentButton) {
    await handleContentAction(contentButton);
    return;
  }

  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "move-blog") {
    state.busy = true;
    setNotice();
    render();
    try {
      await reorderBlogPosts(
        button.dataset.id,
        Number(button.dataset.direction),
      );
      await loadBlogs({ force: true });
      if (state.noticeType !== "error")
        setNotice("Article order updated.", "success");
    } catch (error) {
      setNotice(`Could not reorder articles: ${describeAdminError(error, "please try again.")}`, "error");
    } finally {
      state.busy = false;
      render();
    }
  } else if (action === "reload-blogs") {
    try {
      await refreshAdminToken();
      await loadBlogs({ force: true });
    } catch (error) {
      setNotice(describeAdminError(error, "Could not reload blog posts."), "error");
      render();
    }
  } else if (action === "resend-verification") {
    state.busy = true;
    state.authError = "";
    render();
    try {
      await sendEmailVerification(auth.currentUser);
      state.authError = `Firebase sent a verification link to ${adminEmail}. Check your inbox and spam folder.`;
    } catch (error) {
      state.authError =
        error.code === "auth/too-many-requests"
          ? "Firebase is temporarily limiting verification emails. Wait a few minutes, then try again."
          : "Could not send the verification email. Try again in a moment.";
    } finally {
      state.busy = false;
      render();
    }
  } else if (action === "check-verification") {
    state.busy = true;
    state.authError = "";
    render();
    try {
      await reload(auth.currentUser);
      await refreshAdminToken(auth.currentUser);
      state.user = auth.currentUser;
      if (!isAdmin(state.user))
        state.authError =
          "Firebase still shows this email as unverified. Open the verification link, then check again.";
      else await loadAdminData();
    } catch (error) {
      state.authError =
        "Could not refresh the sign-in status. Sign out and sign in again after verifying your email.";
    } finally {
      state.busy = false;
      render();
    }
  } else if (action === "reset-password") {
    const email = root
      .querySelector('#admin-login [name="email"]')
      ?.value.trim();
    if (!email) {
      state.authError = "Enter the owner email address first.";
      render();
      return;
    }
    if (email.toLowerCase() !== adminEmail) {
      state.authError = `Password reset is only available for the owner account (${adminEmail}).`;
      render();
      return;
    }
    state.busy = true;
    state.authError = "";
    render();
    try {
      await sendPasswordResetEmail(auth, email);
      state.authError = `If an account exists for ${email}, Firebase has sent a password reset email.`;
    } catch (error) {
      state.authError =
        error.code === "auth/operation-not-allowed"
          ? "Email/password sign-in is not enabled for this Firebase project."
          : "Could not send the password reset email. Check the email address and try again.";
    } finally {
      state.busy = false;
      render();
    }
  } else if (action === "sign-out") {
    await signOut(auth);
    adminSessionReady = false;
    state.selected = null;
    state.selectedContent = null;
    state.blogs = [];
    state.blogsLoaded = false;
    state.content = {};
    state.contentErrors = {};
    state.loadedSections.clear();
    state.loadingSections.clear();
    setNotice();
  } else if (action === "new") {
    state.activeSection = "blog";
    state.selectedContent = null;
    state.selected = {
      title: "",
      slug: "",
      category: "",
      excerpt: "",
      content: "",
      coverImage: "",
      tags: [],
      isPublished: false,
    };
    setNotice();
    render();
  } else if (action === "edit") {
    state.activeSection = "blog";
    state.selected =
      state.blogs.find((item) => item.id === button.dataset.id) || null;
    setNotice();
    render();
  } else if (action === "delete") {
    const post = state.blogs.find((item) => item.id === button.dataset.id);
    if (
      !post ||
      !window.confirm(`Delete “${post.title}”? This cannot be undone.`)
    )
      return;
    state.busy = true;
    render();
    try {
      await ensureAdminSession();
      await deleteDoc(doc(db, "blogs", post.id));
      await loadBlogs({ force: true });
      if (state.noticeType !== "error") setNotice("Article deleted.", "success");
    } catch (error) {
      setNotice(`Could not delete article: ${describeAdminError(error, "please try again.")}`, "error");
    } finally {
      state.busy = false;
      render();
    }
  }
}

async function handleContentAction(button) {
  const action = button.dataset.contentAction;
  const sectionId = state.activeSection;
  if (action === "reload") {
    try {
      await refreshAdminToken();
    } catch (error) {
      state.contentErrors[sectionId] = describeAdminError(
        error,
        "Could not refresh the admin session.",
      );
      render();
      return;
    }
    await loadContent([sectionId], { force: true });
    return;
  }
  if (action === "new") {
    state.selectedContent = { section: sectionId, record: {} };
    setNotice();
    render();
    return;
  }
  if (action === "edit") {
    const section = adminNavigation
      .flatMap((group) => group.sections)
      .find((item) => item.id === sectionId);
    const record = section?.singleton
      ? state.content[sectionId]
      : state.content[sectionId]?.find((item) => item.id === button.dataset.id);
    state.selectedContent = { section: sectionId, record: record || {} };
    setNotice();
    render();
    return;
  }

  state.busy = true;
  setNotice();
  render();
  try {
    await ensureAdminSession();
    if (action === "delete") {
      const record = state.content[sectionId]?.find(
        (item) => item.id === button.dataset.id,
      );
      const title =
        record?.title ||
        record?.name ||
        record?.role ||
        record?.degree ||
        "this entry";
      if (
        !record ||
        !window.confirm(`Delete “${title}”? This cannot be undone.`)
      ) {
        state.busy = false;
        render();
        return;
      }
      await deleteContentRecord(sectionId, record.id, state.content);
      setNotice("Entry deleted.", "success");
    } else if (action === "move") {
      await moveContentRecord(
        sectionId,
        button.dataset.id,
        Number(button.dataset.direction),
        state.content,
      );
      setNotice("Display order updated.", "success");
    }
    await loadContent([sectionId], { force: true });
  } catch (error) {
    setNotice(`Could not update this section: ${describeAdminError(error, "please try again.")}`, "error");
  } finally {
    state.busy = false;
    render();
  }
}

function applyMarkdownFormat(textarea, format) {
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end);
  const pairs = {
    bold: ["**", "**"],
    italic: ["*", "*"],
    code: ["```\n", "\n```"],
  };

  if (
    format === "heading" ||
    format === "bullet" ||
    format === "numbered" ||
    format === "quote"
  ) {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const rangeEnd = end > start && value[end - 1] === "\n" ? end - 1 : end;
    const nextBreak = value.indexOf("\n", rangeEnd);
    const blockEnd = nextBreak < 0 ? value.length : nextBreak;
    const block = value.slice(lineStart, blockEnd) || "Text to format";
    const prefix = {
      heading: "## ",
      bullet: "- ",
      numbered: "1. ",
      quote: "> ",
    }[format];
    const formatted = block
      .split("\n")
      .map((line) => (line ? `${prefix}${line}` : line))
      .join("\n");
    textarea.setRangeText(formatted, lineStart, blockEnd, "select");
  } else if (format === "link") {
    const label = selected || "link text";
    const replacement = `[${label}](https://example.com)`;
    textarea.setRangeText(replacement, start, end, "select");
  } else {
    const [before, after] = pairs[format] || ["", ""];
    const replacement = `${before}${selected || "text"}${after}`;
    textarea.setRangeText(replacement, start, end, "select");
  }

  textarea.focus();
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

async function handleSubmit(event) {
  if (event.target.id === "admin-login") {
    event.preventDefault();
    const form = event.target;
    const email = form.elements.namedItem("email").value.trim();
    const password = form.elements.namedItem("password").value;
    state.busy = true;
    state.authError = "";
    render();
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      if (user.email?.toLowerCase() !== adminEmail) {
        await signOut(auth);
        state.authError = `Use the owner account (${adminEmail}).`;
      } else if (!user.emailVerified) {
        await sendEmailVerification(user);
        await signOut(auth);
        state.authError =
          "Verify your email using the link Firebase just sent, then sign in again.";
      }
    } catch (error) {
      state.authError =
        error.code === "auth/operation-not-allowed"
          ? "Email/password sign-in is not enabled for this Firebase project."
          : error.code === "auth/unauthorized-domain"
            ? "This hostname is not in Firebase Auth’s authorized domains yet."
            : error.code === "auth/too-many-requests"
              ? "Too many sign-in attempts. Wait a while, then try again."
              : "Sign-in failed. Check the owner email and password, then try again.";
    } finally {
      state.busy = false;
      render();
    }
    return;
  }
  if (event.target.id === "content-editor") {
    event.preventDefault();
    const form = event.target;
    state.busy = true;
    setNotice();
    render();
    try {
      await ensureAdminSession();
      await saveContentRecord(form.dataset.section, form, state.content);
      state.selectedContent = null;
      setNotice("Portfolio content saved.", "success");
      await loadContent([form.dataset.section], { force: true });
    } catch (error) {
      console.error("Admin content save failed", JSON.stringify({
        section: form.dataset.section,
        code: error?.code,
        message: error?.message,
      }));
      setNotice(describeAdminError(
        error,
        "Could not save this portfolio content.",
      ), "error");
    } finally {
      state.busy = false;
      render();
    }
    return;
  }
  if (event.target.id !== "blog-editor") return;
  event.preventDefault();
  const form = event.target;
  state.busy = true;
  setNotice();
  const submit = form.querySelector('[type="submit"]');
  if (submit) {
    submit.disabled = true;
    submit.textContent = "Saving…";
  }
  try {
    await ensureAdminSession();
    await savePost(form);
  } catch (error) {
    setNotice(describeAdminError(error, "Could not save this article."), "error");
  } finally {
    state.busy = false;
    render();
  }
}

export function mountAdmin(target) {
  root = target;
  setupCodeCopy(root);
  if (!root.dataset.adminEvents) {
    root.dataset.adminEvents = "true";
    root.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-markdown-tab]");
      if (tab) {
        const editor = tab.closest("[data-markdown-editor]");
        const name = tab.dataset.markdownTab;
        editor?.querySelectorAll("[data-markdown-tab]").forEach((button) => {
          const selected = button === tab;
          button.setAttribute("aria-selected", String(selected));
          button.classList.toggle("is-active", selected);
        });
        editor?.querySelectorAll("[data-markdown-panel]").forEach((panel) => {
          panel.hidden = panel.dataset.markdownPanel !== name;
        });
        if (name === "preview") {
          const textarea = editor?.querySelector('[name="content"]');
          const preview = editor?.querySelector("[data-markdown-preview]");
          if (preview)
            preview.innerHTML = textarea?.value.trim()
              ? renderMarkdown(textarea.value)
              : '<p class="markdown-empty">Your article preview will appear here.</p>';
        }
        return;
      }
      const formatButton = event.target.closest("[data-markdown-format]");
      if (formatButton) {
        const textarea = root.querySelector('#blog-editor [name="content"]');
        if (textarea)
          applyMarkdownFormat(textarea, formatButton.dataset.markdownFormat);
        return;
      }
      handleClick(event);
    });
    root.addEventListener("submit", (event) => {
      handleSubmit(event);
    });
    window.addEventListener("online", retryActiveSectionWhenOnline);
    root.addEventListener("input", (event) => {
      const contentForm = event.target.closest("#content-editor");
      if (contentForm) {
        if (event.target.name === "slug") event.target.dataset.touched = "true";
        if (event.target.name === "title") {
          const slug = contentForm.elements.namedItem("slug");
          if (slug && !slug.dataset.touched)
            slug.value = slugify(event.target.value);
        }
        return;
      }
      const form = event.target.closest("#blog-editor");
      if (!form) return;
      if (event.target.name === "slug") event.target.dataset.touched = "true";
      if (event.target.name === "title") {
        const slug = form.elements.namedItem("slug");
        if (slug && !slug.dataset.touched)
          slug.value = slugify(event.target.value);
      }
    });
    onAuthStateChanged(auth, (user) => {
      adminSessionReady = false;
      state.user = user;
      state.selected = null;
      state.selectedContent = null;
      render();
      if (isAdmin(user)) {
        void (async () => {
          try {
            await refreshAdminToken(user);
            await loadAdminData();
          } catch (error) {
            const message = describeAdminError(
              error,
              "Could not refresh the admin session.",
            );
            state.contentErrors.profile = message;
            state.contentErrors.settings = message;
            render();
          }
        })();
      }
    });
  }
  render();
}
