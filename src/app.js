import { portfolioData } from "./data.js";
import {
  getCachedBlogs,
  loadRemoteBlogs,
  loadRemotePortfolio,
} from "./firebase.js";
import { setupCodeCopy } from "./markdown.js";
import { bindPageInteractions, initCustomCursor } from "./interactions.js";
import { footer, header } from "./components.js";
import { aboutPage, experiencePage } from "./pages/about.js";
import { blogDetailPage, blogPage } from "./pages/blog.js";
import { contactPage, notFoundPage } from "./pages/contact.js";
import { homePage } from "./pages/home.js";
import {
  certificatesPage,
  projectDetailPage,
  projectsPage,
} from "./pages/projects.js";
import { escapeHtml as esc, getPath, published, slugify } from "./utils.js";
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

  const page = resolvePage(route);
  app.innerHTML =
    header(portfolioData, route) + page.content + footer(portfolioData);
  document.title = page.title || portfolioData.settings.siteTitle;
  bindPageInteractions({ data: portfolioData, render });
}

function resolvePage(route) {
  if (route === "/") return { content: homePage(portfolioData) };
  if (route === "/projects") return { content: projectsPage(portfolioData) };
  if (route.startsWith("/projects/")) {
    const slug = decodeURIComponent(route.slice("/projects/".length));
    const content = projectDetailPage(portfolioData, slug);
    const project = published(portfolioData.projects).find(
      (item) => (item.slug || slugify(item.title)) === slug,
    );
    return {
      content: content || notFoundPage(),
      title: project
        ? `${project.title} — ${portfolioData.profile.name}`
        : undefined,
    };
  }
  if (route === "/about") return { content: aboutPage(portfolioData) };
  if (route === "/experience")
    return { content: experiencePage(portfolioData) };
  if (route === "/certificates")
    return { content: certificatesPage(portfolioData) };
  if (route === "/blog") {
    return { content: blogPage(portfolioData, blogLoadState) };
  }
  if (route.startsWith("/blog/")) {
    const slug = decodeURIComponent(route.slice("/blog/".length));
    const content = blogDetailPage(portfolioData, slug);
    const post = published(portfolioData.blogs).find(
      (item) => (item.slug || slugify(item.title)) === slug,
    );
    return {
      content: content || notFoundPage(),
      title: post ? `${post.title} — ${portfolioData.profile.name}` : undefined,
    };
  }
  if (route === "/contact") return { content: contactPage(portfolioData) };
  return { content: notFoundPage() };
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
