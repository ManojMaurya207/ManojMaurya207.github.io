import {
  getAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { adminNavigation } from "./admin/content-schema.js";
import {
  describeAdminError,
  deleteContentRecord,
  loadAdminContent,
  moveContentRecord,
  saveContentRecord,
} from "./admin/content-store.js";
import {
  deleteBlogPost,
  loadBlogPosts,
  reorderBlogPosts,
  saveBlogPost,
} from "./admin/blog-store.js";
import { adminEmail, getFirebaseApp } from "./firebase.js";
import { applyMarkdownFormat } from "./admin/markdown-editor.js";
import { renderAdminScreen } from "./admin/views.js";
import { renderMarkdown, setupCodeCopy } from "./markdown.js";
import { slugify } from "./utils.js";
const auth = getAuth(getFirebaseApp());
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

function render() {
  root.innerHTML = renderAdminScreen(state, {
    adminEmail,
    isOwnerAccount,
    isAdmin,
  });
}

async function loadBlogs({ force = false } = {}) {
  if (state.blogLoading || (state.blogsLoaded && !force)) return;
  state.blogLoading = true;
  setNotice();
  render();
  try {
    await ensureAdminSession();
    state.blogs = await loadBlogPosts();
    state.blogsLoaded = true;
  } catch (error) {
    setNotice(
      `Could not load blog posts: ${describeAdminError(error, "check Firebase access and deployment settings.")}`,
      "error",
    );
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
      setNotice(
        describeAdminError(error, "Could not refresh the admin session."),
        "error",
      );
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
      await ensureAdminSession();
      await reorderBlogPosts(
        state.blogs,
        button.dataset.id,
        Number(button.dataset.direction),
      );
      await loadBlogs({ force: true });
      if (state.noticeType !== "error")
        setNotice("Article order updated.", "success");
    } catch (error) {
      setNotice(
        `Could not reorder articles: ${describeAdminError(error, "please try again.")}`,
        "error",
      );
    } finally {
      state.busy = false;
      render();
    }
  } else if (action === "reload-blogs") {
    try {
      await refreshAdminToken();
      await loadBlogs({ force: true });
    } catch (error) {
      setNotice(
        describeAdminError(error, "Could not reload blog posts."),
        "error",
      );
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
      await deleteBlogPost(post.id);
      await loadBlogs({ force: true });
      if (state.noticeType !== "error")
        setNotice("Article deleted.", "success");
    } catch (error) {
      setNotice(
        `Could not delete article: ${describeAdminError(error, "please try again.")}`,
        "error",
      );
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
    setNotice(
      `Could not update this section: ${describeAdminError(error, "please try again.")}`,
      "error",
    );
  } finally {
    state.busy = false;
    render();
  }
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
      console.error(
        "Admin content save failed",
        JSON.stringify({
          section: form.dataset.section,
          code: error?.code,
          message: error?.message,
        }),
      );
      setNotice(
        describeAdminError(error, "Could not save this portfolio content."),
        "error",
      );
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
    await saveBlogPost(form, {
      selectedPost: state.selected,
      posts: state.blogs,
    });
    state.selected = null;
    await loadBlogs({ force: true });
    if (state.noticeType !== "error") setNotice("Article saved.", "success");
  } catch (error) {
    setNotice(
      describeAdminError(error, "Could not save this article."),
      "error",
    );
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
