import { portfolioData } from "./data.js";
import {
  getCachedBlogs,
  loadRemoteBlogs,
  loadRemotePortfolio,
} from "./firebase.js";
import { setupCodeCopy } from "./markdown.js";
import { bindPageInteractions, initCustomCursor } from "./interactions.js";
import { footer, header } from "./components.js";
import { resolveRoute } from "./router.js";
import { escapeHtml as esc, getPath } from "./utils.js";
import "../styles.css";

const app = document.querySelector("#app");
setupCodeCopy(app);

const cachedBlogs = getCachedBlogs();
if (cachedBlogs) portfolioData.blogs = cachedBlogs;

const blogLoadState = {
  status: cachedBlogs ? "loaded" : "loading",
  error: "",
};

function render() {
  const route = getPath();
  if (route === "/admin") {
    renderAdmin();
    return;
  }

  const page = resolveRoute(route, portfolioData, blogLoadState);
  app.innerHTML =
    header(portfolioData, route) + page.content + footer(portfolioData);
  app.dataset.appReady = "true";
  const title = page.title || portfolioData.settings.siteTitle;
  const description = portfolioData.settings.description || "";
  const shareImage =
    portfolioData.settings.ogImage || "/assets/profile-pic.png";
  document.title = title;
  setMetaContent("name", "description", description);
  setMetaContent("property", "og:site_name", portfolioData.settings.siteTitle);
  setMetaContent("property", "og:title", title);
  setMetaContent("property", "og:description", description);
  setMetaContent("property", "og:url", window.location.href.split("#")[0]);
  setMetaContent(
    "property",
    "og:image",
    new URL(shareImage, window.location.origin).href,
  );
  setMetaContent("property", "og:image:alt", portfolioData.profile.name);
  setMetaContent("name", "twitter:title", title);
  setMetaContent("name", "twitter:description", description);
  setMetaContent(
    "name",
    "twitter:image",
    new URL(shareImage, window.location.origin).href,
  );
  bindPageInteractions({ data: portfolioData, render });
}

function setMetaContent(attribute, name, content) {
  let meta = document.querySelector(`meta[${attribute}="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, name);
    document.head.append(meta);
  }
  meta.content = content;
}

function renderAdmin() {
  app.innerHTML =
    '<main class="admin-page"><div class="admin-loading">Loading admin…</div></main>';
  app.dataset.appReady = "true";
  document.title = `Admin — ${portfolioData.profile.name}`;

  import("./admin.js")
    .then(({ mountAdmin }) => {
      if (getPath() === "/admin") mountAdmin(app);
    })
    .catch((error) => {
      app.innerHTML = `<main class="admin-page"><div class="admin-alert">Could not load the admin panel: ${esc(error.message)}</div></main>`;
    });
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem("portfolio-theme");
  const preferredTheme = matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  document.documentElement.dataset.theme = savedTheme || preferredTheme;
}

async function loadContent() {
  if (getPath() === "/admin") return;

  try {
    const { blogs, error } = await loadRemoteBlogs(portfolioData.blogs);
    portfolioData.blogs = blogs;
    blogLoadState.error = error;
    blogLoadState.status = error ? "error" : "loaded";
    if (getPath() !== "/admin") render();

    const remotePortfolio = await loadRemotePortfolio(portfolioData);
    if (remotePortfolio) {
      Object.assign(portfolioData, remotePortfolio);
      if (getPath() !== "/admin") render();
    }
  } catch (error) {
    console.warn(
      "Using local portfolio data because Firebase could not load.",
      error,
    );
  }
}

applySavedTheme();
window.addEventListener("popstate", render);
render();
initCustomCursor();
loadContent();
