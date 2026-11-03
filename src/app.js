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
  document.title = page.title || portfolioData.settings.siteTitle;
  const description = document.querySelector('meta[name="description"]');
  if (description)
    description.content = portfolioData.settings.description || "";
  let shareImage = document.querySelector('meta[property="og:image"]');
  if (!shareImage) {
    shareImage = document.createElement("meta");
    shareImage.setAttribute("property", "og:image");
    document.head.append(shareImage);
  }
  shareImage.content = portfolioData.settings.ogImage || "";
  bindPageInteractions({ data: portfolioData, render });
}

function renderAdmin() {
  app.innerHTML =
    '<main class="admin-page"><div class="admin-loading">Loading admin…</div></main>';
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
